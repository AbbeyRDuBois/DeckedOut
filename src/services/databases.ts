import { addDoc, collection, deleteDoc, doc, DocumentData, Firestore, getDoc, getFirestore, onSnapshot, updateDoc } from "firebase/firestore";
import { app } from "./authentication";
import { BaseGame } from "../Old/base-game";
import { Cribbage } from "../Old/cribbage";
import { Room } from "../room";

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
        this.roomRef = doc(this.db, name, (this.roomId as any));
        return this;
    }

    async delete(){
        await deleteDoc(this.roomRef);
    }
    
    async pullState(): Promise<DocumentData> {
        return (await getDoc(this.roomRef))?.data()!;
    }

    async update(changes = {}){
        await updateDoc(this.roomRef, changes);
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
        
        this.game?.updateLocalState(docSnap.data());

        if (this.room?.getUILoaded() && !this.game?.getStarted()){
            this.room?.handlePopup();
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

    snapFunctionality(docSnap: any){
        super.snapFunctionality(docSnap);

        if (!this.game?.getStarted())
            return;

        const game = (this.game as Cribbage);
        //Enables your hand if it's your turn
        if (game.getRoundState() == "Pegging" && game.getCurrentPlayer().id === localStorage.getItem('playerId')){
            const handContainer = document.getElementById("hand")!;
            handContainer.classList.remove('hand-disabled');
            game.setIsTurn(true);
        }
        //Rerenders stuff to put the updates on everyones computer
        game.render();
    }
}