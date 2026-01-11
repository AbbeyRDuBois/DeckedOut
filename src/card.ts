import { DocumentData } from "firebase/firestore";
import { SpriteSheet } from "./spritesheets";

export const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = [
    { name: 'Clubs', symbol: '♣', color: 'black' },
    { name: 'Diamonds', symbol: '♦', color: 'crimson' },
    { name: 'Hearts', symbol: '♥', color: 'crimson' },
    { name: 'Spades', symbol: '♠', color: 'black' },
];

export type CardOptions = {
    container?: HTMLElement;
    startsFlipped?: boolean;
    clickable?: boolean;
    onClick?: (card: Card, cardDiv: HTMLDivElement) => void;
};

export class Card {
    id: number;
    value: string;
    suit: string;
    isFlipped: boolean;

    constructor(id: number, value = "", suit = "", isFlipped = false) {
        this.value = value;
        this.suit = suit;
        this.id = id;
        this.isFlipped = isFlipped;
    }

    toInt(counting = false): number {
        switch (this.value) {
            case 'A': return 1;
            case 'J': return counting ? 10 : 11;
            case 'Q': return counting ? 10 : 12;
            case 'K': return counting ? 10 : 13;
            case 'JK': return this.suit == "Red" ? 1 : 2;
            default: return parseInt(this.value);
        }
    }

    toHTML(): string {
        if (this.suit != ""){
            var suit = SUITS.filter(suit => suit.name == this.suit)[0];
            return `${this.value}<span style="color: ${suit.color};">${suit.symbol}</span>`;
        }
        return "";
    }

    toPlainObject() {
        return {
            id: this.id,
            value: this.value,
            suit: this.suit,
            isFlipped: this.isFlipped
        };
    }

    static fromPlainObject(data: DocumentData): Card{
        if (data == null){
            return new Card(0, "", "", false);
        }
        return new Card(data.id, data.value, data.suit, data.isFlipped);
    }
}