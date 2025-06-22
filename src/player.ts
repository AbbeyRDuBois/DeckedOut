import { Card } from "./deck";

export class Player {
    id: string;
    name: string;
    lastPlayed: Card;
    hand: Card[];

    constructor(id: string, name: string, lastPlayed = new Card(0), hand = []){
        this.id = id;
        this.name = name;
        this.lastPlayed = lastPlayed;
        this.hand = hand;
    }

    updateLastPlayed(lastPlayed: Card){
        this.lastPlayed = lastPlayed;
    }
}