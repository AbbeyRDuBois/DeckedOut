import { DocumentData } from "firebase/firestore";
import { Card } from "./deck";

export class Player {
    id: string;
    name: string;
    lastPlayed: Card = new Card(0);
    hand: Card[] = [];
    playedCards: Card[] = [];
    isTurn: boolean = false;
    score: number = 0;
    lastHand: Card[] = [];
    lastScore: number = 0;
    team: number = 0;

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
            hand: this.hand.map(card => card.toPlainObject()),
            isTurn: this.isTurn,
            score: this.score,
            playedCards: this.playedCards?.map(card => card.toPlainObject()),
            lastHand: this.lastHand?.map(card => card.toPlainObject()),
            lastScore: this.lastScore,
            team: this.team
        };
    }

    static fromPlainObject(data: DocumentData): Player {
        let player = new Player(data.id, data.name);

        player.lastPlayed = data.lastPlayed
            ? new Card(data.lastPlayed.id, data.lastPlayed.value, data.lastPlayed.suit)
            : new Card(0);

        player.hand = Array.isArray(data.hand)
            ? data.hand.map((c: any) => new Card(c.id, c.value, c.suit))
            : [];

        player.isTurn = data.isTurn;

        player.score = data.score;

        player.playedCards = Array.isArray(data.playedCards)
            ? data.playedCards.map((c: any) => new Card(c.id, c.value, c.suit))
            : [];

        player.lastHand = Array.isArray(data.lastHand)
            ? data.lastHand.map((c: any) => new Card(c.id, c.value, c.suit))
            : [];

        player.lastScore = data.lastScore;
        
        player.team = data.team;

        return player;
    }
}