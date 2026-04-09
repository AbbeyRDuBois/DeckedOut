/****************************************************************************
 * 
 *  Database
 *     Handles sending updates and pulling data from FireBase
 * 
 ****************************************************************************/

import { addDoc, collection, deleteDoc, doc, DocumentData, Firestore, getDoc, getDocs, initializeFirestore, onSnapshot, orderBy, persistentLocalCache, persistentSingleTabManager, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
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
    private roomRef: any;
    private roomId: string = "";
    private game: BaseGame | undefined;
    private room: Room | undefined;
    private db: Firestore;
    private events =  new EventEmitter<{stateChanged: any;}>();
    private hostId: string = "";
  
    constructor(){
        this.db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentSingleTabManager({})
          })
        });
    }

    isHost(): boolean { return this.hostId === localStorage.getItem('playerId')!; }
    actionsRef() { return collection(this.roomRef, "actions"); }
    logsRef() { return collection(this.roomRef, "logs"); }
    teamsRef() { return collection(this.roomRef, "teams"); }
    playersRef() { return collection(this.roomRef, "players"); }
    getRoomRef(): any { return this.roomRef; }
    getRoomId(): string { return this.roomId; }
    setGame(game: BaseGame) { this.game = game; }
    setRoom(room: Room) { this.room = room; }
    getHostId(): string { return this.hostId; }

    async init(name: string, host: Player, initialValues: any): Promise<Database>{
        this.roomId = (await addDoc(collection(this.db, name), initialValues)).id;
        this.roomRef = doc(this.db, name, this.roomId);
        this.hostId = host.getId();

        await this.updatePlayer(host.toPlainObject());
        await this.updateTeam((new Team(host.getName(), [host.getId()], 0)).toPlainObject());
        return this;
    }

    async join(name: string, roomId: string): Promise<this> {
        this.roomId = roomId;
        this.roomRef = doc(this.db, name, roomId);
        this.hostId = (await this.pullState()).hostId;
        return this;
    }

    async delete() {
        //Delete Players
        const players = await getDocs(this.playersRef());
        await Promise.all(players.docs.map(docSnap => deleteDoc(docSnap.ref)));

        //Delete Teams
        const teams = await getDocs(this.teamsRef());
        await Promise.all(teams.docs.map(docSnap => deleteDoc(docSnap.ref)));

        //Delete Logs
        const logs = await getDocs(this.logsRef());
        await Promise.all(logs.docs.map(docSnap => deleteDoc(docSnap.ref)));

        //Finally Delete Room
        await deleteDoc(this.roomRef);
    }
    
    //Pulls everything in the game data and in the Teams/Players collections
    async pullState(): Promise<DocumentData> {
        const teamsSnap = await getDocs(this.teamsRef());
        const teams = teamsSnap.docs.map(doc => doc.data());

        const playersSnap = await getDocs(this.playersRef());
        const players = playersSnap.docs.map(doc => doc.data());

        const gameSnap = (await getDoc(this.roomRef)).data()!;

        return {...gameSnap, teams, players};
    }

    //Only allows host to do the writing
    //Guests do optimistic updates on their end and sends intention of what they wanted to do
    //Host only prevents race conditions/flickering
    async update(changes: any = {}) {
        if (!changes || Object.keys(changes).length === 0) return;

        if (!this.room?.findPlayerById(localStorage.getItem("playerId")!)) {
            return; // Not officially joined yet
        }

        if (this.isHost()) {
            await updateDoc(this.roomRef, changes);
            return;
        }

        this.applyPatchLocally(changes); // Apply instantly
        await this.sendAction({
            type: "GAME_ACTION",
            playerId: localStorage.getItem("playerId")!,
            payload: changes
        });
    }

    //Updates the Team in the DB
    async updateTeam(team: any){
        if(!this.isHost()) {
            await this.sendAction({
                type: "UPDATE_TEAM",
                team: team.toPlainObject()
            });
            return;
        }
        try {
            await setDoc(doc(this.teamsRef(), team.id), team, { merge: true });
        } catch (e) {
            console.error("Error adding log:", e);
        }
    }

    async removeTeam(teamId: string){
        const teams = await getDocs(this.teamsRef());
        const teamRef = teams.docs.find(t => t.id === teamId)!;
        await deleteDoc(teamRef.ref);
    }

    //Updates the Player in the DB
    async updatePlayer(player: any){
        if(!this.isHost()) {
            await this.sendAction({
                type: "UPDATE_PLAYER",
                player: player.toPlainObject()
            });
            return;
        }
        try {
            await setDoc(doc(this.playersRef(), player.id), player, { merge: true });
        } catch (e) {
            console.error("Error adding log:", e);
        }
    }

    //Adds the log to the DB
    async addLog(message: string) {
        if(!this.isHost()) {
            await this.sendAction({
                type: "ADD_LOG",
                log: message
            });
            return;
        }

        try {
            await addDoc(this.logsRef(), {
                message,
                timestamp: serverTimestamp()
            });
        } catch (e) {
            console.error("Error adding log:", e);
        }
    }

    //Optimistic Updates for Guest
    applyPatchLocally(patch: any) {
        if (!this.room || !this.game) return;
        this.game.updateLocalState(patch);
        this.room.updateLocalState(patch);
        this.events.emit('stateChanged', this.room.getState());
    }

    //Guest sends intention of action that host will pick up
    async sendAction(action: RoomAction) {
        await addDoc(this.actionsRef(), {
            ...action,
            timestamp: serverTimestamp()
        });
    }

    //Host processing the actions guest made
    async processAction(action: RoomAction) {
        const snap = await this.pullState();
        if (!snap) return;

        let patch: any = {};

        switch (action.type) {
            case "JOIN_ROOM": {
                if (snap.players?.[action.playerId]) return;
                const player = new Player(action.playerId, action.name);
                const team = new Team(player.getName(), [player.getId()], Object.keys(snap.teams || {}).length);

                await this.updateTeam(team.toPlainObject());
                await this.updatePlayer(player.toPlainObject());
                break;
            }
            case "LEAVE_ROOM": {
                const deleteTeam = snap.teams.find((t: any) => t.playerIds.includes(action.playerId))!;
                const teamPlayers = deleteTeam.playerIds.filter((id: any) => id !==action.playerId)!;

                //If they were the last ones in team delete them, otherwise just remove them from the team
                if (teamPlayers.length === 0){
                    await deleteDoc(doc(this.teamsRef(), deleteTeam.id));
                }
                else{
                    await updateDoc(doc(this.teamsRef(), deleteTeam.id), {playerIds: teamPlayers});
                }

                await deleteDoc(doc(this.playersRef(), action.playerId));
                break;
            }
            case "UPDATE_PLAYER": {
                this.updatePlayer(action.player);
                break;
            }
            case "UPDATE_TEAM": {
                this.updateTeam(action.team);
                break;
            }
            case "ADD_LOG": {
                this.addLog(action.log);
                break;
            }
            case "MOVE_PLAYER": {
                action.fromTeam.playerIds = action.fromTeam.playerIds.filter((id: string) => id !== action.playerId);
                // Add to destination
                action.toTeam.playerIds.push(action.playerId);
                await this.updateTeam(action.fromTeam);
                await this.updateTeam(action.toTeam);
                break;
            }
            case "UPDATE_NAME": {
                action.team.name = action.name;
                await this.updateTeam(action.team);
                break;
            }
            case "ADD_TEAM": {
                const teams = this.game?.getTeams()!;
                const players = this.game?.getPlayers()!;
                if (teams.length < players.length) {
                    const newTeam = new Team(`Team ${teams.length + 1}`, [], teams.length);
                    this.updateTeam(newTeam.toPlainObject());
                }
                break;
            }
            case "REMOVE_TEAM": {
                const teams = this.game?.getTeams()!; 
                if (teams.length > 1) { 
                    const removed = teams.pop()!; 

                    // Push players from removed team back into remaining teams
                    if (removed){
                        removed.getPlayerIds().forEach((id, i) => {
                            teams[i % teams.length].getPlayerIds().push(id);
                        });
                    }

                    // make sure teams are in order after removal
                    teams.sort((a, b) => a.getOrder() - b.getOrder());
                    teams.forEach(t => this.updateTeam(t.toPlainObject()));
                    this.removeTeam(removed.getId());
                } 
                break;
            }
            case "PLAY_CARD": {
                if (this.isHost()) {
                    await this.game?.cardPlayed(action.playerId, action.cardId);
                }
                break;
            }
            case "GAME_ACTION": {
                // host applies changes
                this.update(action.payload);
                break;
            }
        }
        await updateDoc(this.roomRef, patch);
    }

    /******************************************
     * 
     *  Listeners
     * 
     ******************************************/
    setupListeners(){
        this.listenForActions();
        this.listenForUpdates();
        this.listenForLogs();
        this.listenForTeams();
        this.listenForPlayers();
    }

    //Only Host takes care of this
    listenForActions() {
        return onSnapshot(this.actionsRef(), snap => {
            if (this.isHost()) {
                snap.docChanges().forEach(async change => {
                    if (change.type !== "added") return;
                    const action = change.doc.data() as RoomAction;
                    await deleteDoc(change.doc.ref);
                    await this.processAction(action);
                });
            }  
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
            snapshot.docChanges().forEach((change: any) => {
                const team = {
                    id: change.doc.id,
                    ...change.doc.data()
                };

                if (change.type === 'removed') {
                    this.game?.removeTeamFromDB(team.id);
                } else {
                    this.game?.setTeamFromDB(team);
                }
            });
        })
    }

    listenForPlayers(){
        return onSnapshot(this.playersRef(), (snapshot: any) => {
            snapshot.docChanges().forEach((change: any) => {
                const player = {
                    id: change.doc.id,
                    ...change.doc.data()
                };

                if (change.type === 'removed') {
                    this.game?.removePlayerFromDB(player.id);
                } else {
                    this.game?.setPlayerFromDB(player);
                }
            });
        })
    }

    //Generic game state listener
    listenForUpdates(){
        return onSnapshot(this.roomRef, (docSnap: any) => {
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
        });
    }
}