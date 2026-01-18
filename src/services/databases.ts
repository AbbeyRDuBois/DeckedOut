/****************************************************************************
 * 
 *  Database
 *     Handles sending updates and pulling data from FireBase
 * 
 ****************************************************************************/

import { addDoc, collection, deleteDoc, doc, DocumentData, Firestore, getDoc, getFirestore, onSnapshot, updateDoc } from "firebase/firestore";
import { app } from "./authentication";
import { BaseGame } from "../base-game/base-model";
import EventEmitter from "events";
import { Room } from "../room/room-model";
import { Cribbage } from "../cribbage/cribbage-model";

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
    lastLocalUpdateTime: number = 0;

    
    constructor(){
        this.db = getFirestore(app);
    }

    getRoomRef(): any{
        return this.roomRef;
    }

    getRoomId(): string {
        return this.roomId;
    }
    
    setGame(game: BaseGame){
        this.game = game;
    }

    setRoom(room: Room){
        this.room = room;
    }

    async init(name: string, initialValues = {}): Promise<Database>{
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

    async update(changes: any = {}){
        if (changes === undefined || changes === null) {
            console.warn('Database.update called with invalid changes:', changes);
            return;
        }

        try {
            await updateDoc(this.roomRef, changes);
        } catch (err) {
            console.error('Database.update failed for changes:', changes, err);
            throw err;
        }
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
        
        // Skip updates that arrive too soon after a local update to prevent flickering
        const timeSinceLastUpdate = Date.now() - this.lastLocalUpdateTime;
        if (timeSinceLastUpdate < 100) {
            return;
        }
        const remote = docSnap.data();
        this.game?.updateLocalState(remote);
        this.room?.updateLocalState(remote);

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

export class CribbageDatabase extends Database {
    constructor() {
        super();
    }
    protected events =  new EventEmitter<{stateChanged: any;}>();
    
    snapFunctionality(docSnap: any){
        super.snapFunctionality(docSnap);
        const game = (this.game as Cribbage);

        if (game?.getStarted())
            return;

        this.events.emit('stateChanged', game.toPlainObject());
    }
}