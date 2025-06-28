import { Card } from "./deck";

export class Player {
    id: string;
    name: string;
    lastPlayed: Card = new Card(0);
    hand: Card[] = [];
    isTurn: boolean = false;
    score: number = 0;

    constructor(id: string, name: string){
        this.id = id;
        this.name = name;
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