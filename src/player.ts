import { DocumentData } from "firebase/firestore";
import { Card } from "./card";

export class Player {
    private id: string;
    private name: string;
    private hand: Card[] = [];
    private playedCards: Card[] = [];
    private score: number = 0;
    private team: number = 0;
    private order: number = 0;
    private roleColor: string = "neutral";

    constructor(id: string, name: string){
        this.id = id;
        this.name = name;
    }

    getId(): string { return this.id; } 
    getName(): string { return this.name; }
    setOrder(order: number) { this.order = order; }
    getOrder(): number { return this.order; }
    getRoleColor(): string { return this.roleColor; }
    setRoleColor(roleColor: string) { this.roleColor = roleColor; }
    getHand(): Card[] { return this.hand; }
    setHand(hand: Card[]) { this.hand = hand; }
    getPlayedCards(): Card[] { return this.playedCards; }
    setPlayedCards(played: Card[]) {this.playedCards = played; }
    getScore(): number { return this.score; }

    addToScore(points: number){ this.score += points; }
    removeFromHand(cardIndex: number) { this.hand.splice(cardIndex, 1); }
    addToHand(card: Card) { this.hand.push(card); }

    getUnplayedCards(): Card[] {
        const playedIds = new Set(this.playedCards.map(c => c.getId()));
        return this.hand.filter(c => !playedIds.has(c.getId()));
    }

    toPlainObject() {
        return {
            id: this.id,
            name: this.name,
            hand: this.hand?.map(card => card?.toPlainObject()),
            score: this.score,
            playedCards: this.playedCards?.map(card => card?.toPlainObject()),
            team: this.team,
            roleColor: this.roleColor,
            order: this.order
        };
    }

    static fromPlainObject(data: DocumentData): Player {
        if (data == null){
           return new Player("", "");
        }

        let player = new Player(data.id, data.name);
        
        player.hand = Array.isArray(data.hand)
            ? data.hand.map((c: any) => new Card(c.id, c.rank, c.suit, c.flipped, c.played))
            : [];
        player.playedCards = Array.isArray(data.playedCards)
            ? data.playedCards.map((c: any) => new Card(c.id, c.rank, c.suit, c.flipped, c.played))
            : [];
        
        player.team = data.team;
        player.roleColor = data.roleColor;
        player.order = data.order;
        player.score = data.score;

        return player;
    }
}
