/****************************************************************************
 * 
 *  Database
 *     Handles sending updates and pulling data from FireBase
 * 
 ****************************************************************************/

import { arrayUnion, collection, doc, DocumentData, Firestore, getDoc, getDocs, initializeFirestore, onSnapshot, orderBy, persistentLocalCache, persistentSingleTabManager, query, runTransaction, serverTimestamp, setDoc, Transaction, updateDoc, where } from "firebase/firestore";
import { app } from "./authentication";
import { BaseGame } from "../base-game/base-model";
import EventEmitter from "events";
import { Room } from "../room/room-model";
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
    private localId: string = "";
  
    constructor(){
        this.db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentSingleTabManager({})
          })
        });
    }

    isHost(): boolean { return this.hostId === localStorage.getItem('playerId')!; }
    logsRef() { return collection(this.roomRef, "logs"); }
    teamsRef() { return collection(this.roomRef, "teams"); }
    playersRef() { return collection(this.roomRef, "players"); }
    getRoomRef(): any { return this.roomRef; }
    getRoomId(): string { return this.roomId; }
    setGame(game: BaseGame) { this.game = game; }
    setRoom(room: Room) { this.room = room; }
    getHostId(): string { return this.hostId; }

    async init(name: string, host: Player, initialValues: any): Promise<Database>{
        const newRoomRef = doc(collection(this.db, name));
        this.roomId = newRoomRef.id;
        this.roomRef = newRoomRef;
        this.hostId = host.getId();
        this.localId = localStorage.getItem('playerId')!;

        await runTransaction(this.db, async (transaction: Transaction) => {
            transaction.set(newRoomRef, initialValues);
            transaction.set(doc(this.teamsRef(), host.getId()), (new Team(host.getName(), [host.getId()], 0)).toPlainObject(), { merge: true });
            transaction.set(doc(this.playersRef(), host.getId()), host.toPlainObject(), { merge: true });
        });

        return this;
    }

    async join(name: string, roomId: string): Promise<this> {
        this.roomId = roomId;
        this.roomRef = doc(this.db, name, roomId);
        this.hostId = (await this.pullState()).hostId;
        return this;
    }

    async leave(){
        const playerId = this.localId;
        const teamsSnapshot = await getDocs(this.teamsRef());
        const deleteTeam = teamsSnapshot.docs.find((teamDoc: any) => teamDoc.data().playerIds?.includes(playerId));
        if (!deleteTeam) return;

        const teamPlayers = (deleteTeam.data().playerIds || []).filter((id: any) => id !== playerId);
        const teamRef = deleteTeam.ref;

        await runTransaction(this.db, async (transaction: Transaction) => {
            const teamSnapshot = await transaction.get(teamRef);
            if (!teamSnapshot.exists()) return;

            if (teamPlayers.length === 0){
                transaction.delete(teamRef);
            } else {
                transaction.update(teamRef, { playerIds: teamPlayers });
            }

            transaction.delete(doc(this.playersRef(), playerId));
        });
    }

    async delete() {
        const players = await getDocs(this.playersRef());
        const teams = await getDocs(this.teamsRef());
        const logs = await getDocs(this.logsRef());

        //Delete all docs then finally the room
        await runTransaction(this.db, async (transaction: Transaction) => {
            players.docs.forEach(docSnap => transaction.delete(docSnap.ref));
            teams.docs.forEach(docSnap => transaction.delete(docSnap.ref));
            logs.docs.forEach(docSnap => transaction.delete(docSnap.ref));
            transaction.delete(this.roomRef);
        });
    }
    
    //Pulls everything in the game data and in the Teams/Players collections
    async pullState(): Promise<DocumentData> {
        const teamsSnap = await getDocs(this.teamsRef());
        const playersSnap = await getDocs(this.playersRef());
        const gameSnap = (await getDoc(this.roomRef)).data()!;

        return {...gameSnap, teams: teamsSnap.docs.map(doc => doc.data()), players: playersSnap.docs.map(doc => doc.data())};
    }

    // If just updating the state, put the fields in changes.
    // If adding onto a preexisting array (such as crib), put those values in arrayUnionValues (just the new parts).
    async update(changes: any = {}, arrayUnionValues: any = {}) {
        if ((!changes || Object.keys(changes).length === 0) && (!arrayUnionValues || Object.keys(arrayUnionValues).length === 0)) return;

        if (!this.room?.findPlayerById(localStorage.getItem("playerId")!)) {
            return; // Not officially joined yet
        }

        const maxAttempts = 3;
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        //Doing retries as sometimes if multiple people do something at once firestore doesn't like it very much
        //This allows it to go through and still do the commit even if first one was unhappy
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                await runTransaction(this.db, async (transaction: Transaction) => {
                    const roomSnapshot = await transaction.get(this.roomRef);
                    if (!roomSnapshot.exists()) {
                        throw new Error('Room no longer exists');
                    }

                    if (changes && Object.keys(changes).length > 0) {
                        transaction.update(this.roomRef, changes);
                    }

                    for (const [key, value] of Object.entries(arrayUnionValues)) {
                        if (Array.isArray(value) && value.length > 0) {
                            transaction.update(this.roomRef, { [key]: arrayUnion(...value) });
                        } else if (value !== undefined) {
                            transaction.update(this.roomRef, { [key]: arrayUnion(value) });
                        }
                    }
                });
                return;
            } catch (error: any) {
                const shouldRetry = error?.code === 'aborted' || error?.code === 'failed-precondition' || error?.code === 'deadline-exceeded' || error?.code === 'resource-exhausted';

                if (attempt === maxAttempts || !shouldRetry) {
                    console.error(`Error updating room after ${attempt} attempt(s):`, error);
                    throw error;
                }

                const backoffMs = 100 * attempt;
                await delay(backoffMs);
            }
        }
    }

    //Updates the Team in the DB
    async updateTeam(team: any){
        try {
            await runTransaction(this.db, async (transaction: Transaction) => {
                transaction.set(doc(this.teamsRef(), team.id), team, { merge: true });
            });
        } catch (e) {
            console.error("Error updating Team:", e);
        }
    }

    async addGuest(player: any, team: any) {
        try {
            await runTransaction(this.db, async (transaction: Transaction) => {
                transaction.set(doc(this.playersRef(), player.id), player, { merge: true });
                transaction.set(doc(this.teamsRef(), team.id), team, { merge: true });
            });
        } catch (e) {
            console.error("Error adding guest:", e);
        }
    }

    async removeTeam(teamId: string){
        const teamRef = doc(this.teamsRef(), teamId);
        await runTransaction(this.db, async (transaction: Transaction) => {
            const teamSnapshot = await transaction.get(teamRef);
            if (teamSnapshot.exists()) {
                transaction.delete(teamRef);
            }
        });
    }

    //Updates the Player in the DB
    async updatePlayer(player: any){
        try {
            await runTransaction(this.db, async (transaction: Transaction) => {
                transaction.set(doc(this.playersRef(), player.id), player, { merge: true });
            });
        } catch (e) {
            console.error("Error updating player:", e);
        }
    }

    //Adds the log to the DB
    async addLog(message: string) {
        try {
            await runTransaction(this.db, async (transaction: Transaction) => {
                const logRef = doc(this.logsRef());
                transaction.set(logRef, {
                    message,
                    timestamp: serverTimestamp()
                });
            });
        } catch (e) {
            console.error("Error adding log:", e);
        }
    }

    /******************************************
     * 
     *  Listeners
     * 
     ******************************************/
    setupListeners(){
        this.listenForUpdates();
        this.listenForLogs();
        this.listenForTeams();
        this.listenForPlayers();
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
        return onSnapshot(this.roomRef, async (docSnap: any) => {
            if (!docSnap.exists()) {
                alert("Room deleted or closed.");
                window.location.href = "index.html";
            }

            const remote = docSnap.data();

            await this.game?.updateLocalState(remote);
            this.room?.updateLocalState(remote);
            this.events.emit('stateChanged', this.room?.getState());

            // If the room has started and this client hasn't started the game yet, run guest setup
            if (remote?.started && !this.game?.getStarted()) {
                this.game?.guestSetup(remote);
            }
        });
    }
}

export class AchievementDatabase {
    private db: Firestore;

    constructor(){
        this.db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentSingleTabManager({})
          })
        });
    }

    //Pass in username on log in to initialize/update players 
    async logPlayer(player_name: string) {
        //Get player doc
        const playerRef = doc(this.db, "achievements", player_name);
        const snapshot = await getDoc(playerRef);

        //If player doesn't exist, create the player. Else, update data on login.
        if (!snapshot.exists()) {
            await setDoc(playerRef, {
                last_date_played: new Date()
            });
        }
        else {
            await updateDoc(playerRef, {
                last_date_played: new Date()
            });
        }
    }

    //Call to increment a counter for the provided achievement
    async increment_achievement(achievement: string) {
        //Check if logged in
        const player_name = String(localStorage.getItem("user_id"))

        //If logged in
        if (localStorage.getItem("user_id") != null && player_name?.length > 0) {
            //Get player doc and previous data if it exists
            const playerRef = doc(this.db, "achievements", player_name);
            const snapshot = await getDoc(playerRef);
            const value = (snapshot.data()?.[achievement] != undefined) ? Number(snapshot.data()?.[achievement])+1 : 1

            //Update document
            await updateDoc(playerRef, {
                [achievement]: value
            });
        }
    }
}