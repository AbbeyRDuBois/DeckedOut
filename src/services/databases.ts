/****************************************************************************
 * 
 *  Database
 *     Handles sending updates and pulling data from FireBase
 * 
 ****************************************************************************/

import { addDoc, collection, deleteDoc, deleteField, doc, DocumentData, Firestore, getDoc, initializeFirestore, onSnapshot, persistentLocalCache, persistentSingleTabManager, serverTimestamp, updateDoc } from "firebase/firestore";
import { app } from "./authentication";
import { BaseGame } from "../base-game/base-model";
import EventEmitter from "events";
import { Room } from "../room/room-model";
import { Cribbage } from "../cribbage/cribbage-model";
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
    getRoomRef(): any { return this.roomRef; }
    getRoomId(): string { return this.roomId; }
    setGame(game: BaseGame) { this.game = game; }
    setRoom(room: Room) { this.room = room; }

    async init(name: string, initialValues: any): Promise<Database>{
        this.roomId = (await addDoc(collection(this.db, name), initialValues)).id;
        this.roomRef = doc(this.db, name, this.roomId);
        return this;
    }

    async delete(){
        await deleteDoc(this.roomRef);
    }
    
    async pullState(): Promise<DocumentData> {
        return (await getDoc(this.roomRef))?.data()!;
    }

    //Only allows host to do the writing, the others just sent the intent.
    //Prevents race conditions/flickering
    async update(changes: any = {}) {
        if (!changes || Object.keys(changes).length === 0) return;

        const playerId = localStorage.getItem("playerId")!;
        if (!this.room?.getState().players.find(p => p.id == playerId)) {
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
        console.trace("processAction called with:", action);
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
                if (snap.started) return;
                if (snap.players?.[action.playerId]) return;

                var player = new Player(action.playerId, action.name);

                patch = { 
                    [`players.${action.playerId}`]: player.toPlainObject(),
                    [`teams.${action.name}`]:(new Team(player.name, [player.id], Object.keys(snap.teams).length)).toPlainObject() 
                };
                break;
            }

            case "LEAVE_ROOM": {

                const player = snap.players?.[action.playerId];
                if (!player) return;

                const patch: any = {
                    [`players.${action.playerId}`]: deleteField()
                };

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

                patch.teams = updatedTeams;

                // If host leaves or game started -> delete room
                if (action.playerId === snap.hostId || snap.started) {
                    this.delete();
                    return;
                }

                this.update(patch);
                break;
            }

            case "GAME_ACTION": {
                if (!snap.players?.[action.playerId]) return;

                patch = { ...action.payload };
                break;
            }
        }

        await updateDoc(this.roomRef, patch);
    }

    /**
    * Host listens to incoming actions
    */
    listenForActions() {
        if (!this.isHost()) return;

        return onSnapshot(this.actionsRef(), snap => {
            snap.docChanges().forEach(async change => {
            if (change.type !== "added") return;

            await this.processAction(change.doc.data() as RoomAction);
            deleteDoc(change.doc.ref);
            });
        });
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