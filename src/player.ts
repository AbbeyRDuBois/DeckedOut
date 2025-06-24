import { Card } from "./deck";

export class Player {
    id: string;
    name: string;
    lastPlayed: Card;
    hand: Card[];
    isTurn: boolean;

    constructor(id: string, name: string, lastPlayed = new Card(0), hand = [], isTurn = false){
        this.id = id;
        this.name = name;
        this.lastPlayed = lastPlayed;
        this.hand = hand;
        this.isTurn = isTurn;
    }

    updateLastPlayed(lastPlayed: Card){
        this.lastPlayed = lastPlayed;
    }
    
    toPlainObject() {
        return {
            id: this.id,
            name: this.name,
            lastPlayed: this.lastPlayed?.toPlainObject(),
            hand: this.hand.map(card => card.toPlainObject())
        };
    }

}