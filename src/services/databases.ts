/****************************************************************************
 * 
 *  Database
 *     Handles sending updates and pulling data from FireBase
 * 
 ****************************************************************************/

import { addDoc, collection, deleteDoc, deleteField, doc, DocumentData, Firestore, getDoc, getDocs, initializeFirestore, onSnapshot, orderBy, persistentLocalCache, persistentSingleTabManager, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { app } from "./authentication";
import { BaseGame } from "../base-game/base-model";
import EventEmitter from "events";
import { Room } from "../room/room-model";
import { RoomAction } from "../types";
import { Player } from "../player";
import { Team } from "../team";

let currentDB: Database | null = null;

export function setDBInstance(db: Database) {
  currentDB = db;
}

export function getDBInstance(): Database {
  if (!currentDB) {
    throw new Error('Database not initialized yet!');
  }
  return currentDB;
}

export class Database{
    roomRef: any;
    roomId: string = "";
    game: BaseGame | undefined;
    room: Room | undefined;
    db: Firestore;
    guestActionTimeout: NodeJS.Timeout | null = null;
    events =  new EventEmitter<{stateChanged: any;}>();

    
    constructor(){
        this.db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentSingleTabManager({})
          })
        });
    }

    isHost(): boolean { return this.room?.getState().hostId === localStorage.getItem('playerId')!; }
    actionsRef() { return collection(this.roomRef, "actions"); }
    logsRef() { return collection(this.roomRef, "logs"); }
    teamsRef() { return collection(this.roomRef, "teams"); }
    playersRef() { return collection(this.roomRef, "players"); }
    getRoomRef(): any { return this.roomRef; }
    getRoomId(): string { return this.roomId; }
    setGame(game: BaseGame) { this.game = game; }
    setRoom(room: Room) { this.room = room; }

    async init(name: string, host: Player, initialValues: any): Promise<Database>{
        this.roomId = (await addDoc(collection(this.db, name), initialValues)).id;
        this.roomRef = doc(this.db, name, this.roomId);
        await this.updatePlayer(host.toPlainObject());
        await this.updateTeam((new Team(host.name, [host.id], 0)).toPlainObject());
        return this;
    }

    async delete(){
        await deleteDoc(this.roomRef);
    }
    
    async pullState(): Promise<DocumentData> {
      const teamsSnap = await getDocs(this.teamsRef());
      const teams = teamsSnap.docs.map(doc => doc.data());

      const playersSnap = await getDocs(this.playersRef());
      const players = playersSnap.docs.map(doc => doc.data());

      const gameSnap = (await getDoc(this.roomRef)).data()!;

      return {...gameSnap, teams, players};
    }

    setupListeners(){
      this.listenForActions();
      this.listenForUpdates();
      this.listenForLogs();
      this.listenForTeams();
      this.listenForPlayers();
    }

    //Only allows host to do the writing, the others just sent the intent.
    //Prevents race conditions/flickering
    async update(changes: any = {}) {
        if (!changes || Object.keys(changes).length === 0) return;

        if (!this.room?.findPlayerById(localStorage.getItem("playerId")!)) {
            return; // Not officially joined yet
        }

        if (this.isHost()) {
            await updateDoc(this.roomRef, changes);
            return;
        }
        else{
            this.applyPatchLocally(changes); // Apply instantly
        }

        // Guests send a GAME_ACTION intent
        await this.sendAction({
            type: "GAME_ACTION",
            playerId: localStorage.getItem("playerId")!,
            payload: changes
        });
    }

    async updateTeam(team: any){
      try {
        await setDoc(doc(this.teamsRef(), team.id), team, { merge: true });
      } catch (e) {
        console.error("Error adding log:", e);
      }
    }

    async updatePlayer(player: any){
      try {
        await setDoc(doc(this.playersRef(), player.id), player, { merge: true });
      } catch (e) {
        console.error("Error adding log:", e);
      }
    }


    applyPatchLocally(patch: any) {
        if (!this.room || !this.game) return;
        this.game.updateLocalState(patch);
        this.room.updateLocalState(patch);
        this.events.emit('stateChanged', this.room.getState());
    }

    /**
     * Guest Only function
     */
    async sendAction(action: RoomAction) {
        await addDoc(this.actionsRef(), {
            ...action,
            timestamp: serverTimestamp()
        });
    }

    /**
    * Host-only action processor
    */
    async processAction(action: RoomAction) {
        const snap = await this.pullState();
        if (!snap) return;

        let patch: any = {};

        switch (action.type) {
            case "PLAY_CARD": {
                if (this.isHost()) {
                    await this.game?.cardPlayed(action.playerId, action.cardId);
                }
                break;
            }
            case "JOIN_ROOM": {
                if (snap.players?.[action.playerId]) return;

                const player = new Player(action.playerId, action.name);
                const team = new Team(player.name, [player.id], Object.keys(snap.teams || {}).length);

                await this.updateTeam(team.toPlainObject());
                await this.updatePlayer(player.toPlainObject());
                break;
            }

            case "LEAVE_ROOM": {
                // Remove player from teams
                const updatedTeams = Object.fromEntries(
                    Object.entries(snap.teams).map(([teamName, teamObj]: [string, any]) => {
                        return [
                        teamName,
                        {
                            ...teamObj,
                            playerIds: teamObj.playerIds.filter((id: string) => id !== action.playerId)
                        }
                        ];
                    })
                );

                updatedTeams.array.forEach(async (team: any) => await this.updateTeam(team));
                const updatedPlayers = this.game?.getPlayers().filter(p => p.id !== action.playerId);
                updatedPlayers?.forEach(async p => await this.updatePlayer(p.toPlainObject()));

                // If host leaves or game started -> delete room
                if (action.playerId === snap.hostId || snap.started) {
                    this.delete();
                    return;
                }

                break;
            }

            case "GAME_ACTION": {
                if (!snap.players?.[action.playerId]) return;

                patch = { ...action.payload };
                // host should immediately merge these changes into its own state so
                // there is no momentary lag before the snapshot listener fires
                if (Object.keys(patch).length > 0) {
                    this.applyPatchLocally(patch);
                }
                break;
            }
        }

        await updateDoc(this.roomRef, patch);
    }

    async addLog(message: string) {
      try {
        await addDoc(this.logsRef(), {
          message: message,
          timestamp: serverTimestamp()
        });
      } catch (e) {
        console.error("Error adding log:", e);
      }
    }

    listenForActions() {
        return onSnapshot(this.actionsRef(), snap => {
            snap.docChanges().forEach(async change => {
                if (change.type !== "added") return;
                const action = change.doc.data() as RoomAction;

                //Guests can only do updates on the Join_room/Leave events to keep their local as updated as possible
                if (this.isHost()) {
                    await this.processAction(action);
                    await deleteDoc(change.doc.ref);
                } else {
                    // the action the room snapshot listener will update every client.
                    switch (action.type) {
                        case "JOIN_ROOM": {
                            // add the player/team locally
                            if (!this.room) break;
                            const player = new Player(action.playerId, action.name);
                            const players = this.game?.getPlayers()!;
                            players.push(player);
                            players.forEach(async p => await this.updatePlayer(p));
                            break;
                        }
                        case "LEAVE_ROOM": {
                            if (!this.room) break;
                            // remove player and clean up teams locally
                            const playerId = action.playerId;
                            const state = this.room.getState();

                            const remainingPlayers = state.players.filter((p: any) => p.id !== playerId);
                            const remainingTeams = state.teams.filter((t: any) => !t.playerIds.includes(playerId));

                            remainingTeams.foreach(async (t: Team) => await this.updateTeam(t.toPlainObject()));
                            remainingPlayers.forEach(async (p: Player) => await this.updatePlayer(p.toPlainObject()));
                            break;
                        }
                    }
                }
            });
        });
    }

    listenForLogs(){
      const q = query(this.logsRef(), orderBy("timestamp", "asc"));

      return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => doc.data().message);
        this.game?.setLogs(logs);
      });
    }

    listenForTeams(){
      return onSnapshot(this.teamsRef(), (snapshot: any) => {
        const teams = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));
        this.game?.setTeams(teams);
      })
    }

    listenForPlayers(){
      return onSnapshot(this.playersRef(), (snapshot: any) => {
        const players = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));
        this.game?.setPlayers(players);
      })
    }

    listenForUpdates(){
        return onSnapshot(this.roomRef, (docSnap: any) => {
            this.snapFunctionality(docSnap);
        });
    }

    snapFunctionality(docSnap: any){
        if (!docSnap.exists()) {
            alert("Room deleted or closed.");
            window.location.href = "index.html";
        }

        const remote = docSnap.data();

        this.game?.updateLocalState(remote);
        this.room?.updateLocalState(remote);
        this.events.emit('stateChanged', this.room?.getState());

        // If the room has started and this client hasn't started the game yet, run guest setup
        if (remote?.started && !this.game?.getStarted()) {
            this.game?.guestSetup(remote);
        }
    }

    async join(name: string, roomId: string): Promise<this> {
        this.roomId = roomId;
        this.roomRef = doc(this.db, name, roomId);
        return this;
    }
}