import { DocumentData } from "firebase/firestore";
import { Card } from "./card";

export class Player {
    id: string;
    name: string;
    hand: Card[] = [];
    playedCards: Card[] = [];
    isTurn: boolean = false;
    score: number = 0;
    team: number = 0;
    order: number = 0;
    roleColor: string = "neutral";

    constructor(id: string, name: string){
        this.id = id;
        this.name = name;
    }

    setOrder(order: number) { this.order = order; }
    getOrder(): number { return this.order; }
    getUnplayedCards(): Card[] {
        const playedIds = new Set(this.playedCards.map(c => c.id));
        return this.hand.filter(c => !playedIds.has(c.id));
    }

    toPlainObject() {
        return {
            id: this.id,
            name: this.name,
            hand: this.hand?.map(card => card?.toPlainObject()),
            isTurn: this.isTurn,
            score: this.score,
            playedCards: this.playedCards?.map(card => card?.toPlainObject()),
            team: this.team,
            roleColor: this.roleColor
        };
    }

    static fromPlainObject(data: DocumentData): Player {
        if (data == null){
           return new Player("", "");
        }

        let player = new Player(data.id, data.name);

        player.hand = Array.isArray(data.hand)
            ? data.hand.map((c: any) => new Card(c.id, c.value, c.suit, c.isFlipped))
            : [];

        player.isTurn = data.isTurn;

        player.score = data.score;

        player.playedCards = Array.isArray(data.playedCards)
            ? data.playedCards.map((c: any) => new Card(c.id, c.value, c.suit, c.isFlipped))
            : [];
        
        player.team = data.team;

        player.roleColor = data.roleColor;

        return player;
    }
}
