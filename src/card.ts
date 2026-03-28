import { DocumentData } from "firebase/firestore";

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
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
    rank: string;
    suit: string;
    isFlipped: boolean;
    isPlayed: boolean;

    constructor(id: number, rank = "", suit = "", isFlipped = false, isPlayed = false) {
        this.rank = rank;
        this.suit = suit;
        this.id = id;
        this.isFlipped = isFlipped;
        this.isPlayed = isPlayed;
    }

    toInt(counting = false): number {
        switch (this.rank) {
            case 'A': return 1;
            case 'J': return counting ? 10 : 11;
            case 'Q': return counting ? 10 : 12;
            case 'K': return counting ? 10 : 13;
            case 'JK': return this.suit == "Red" ? 1 : 2;
            default: return parseInt(this.rank);
        }
    }

    toHTML(): string {
        if (this.suit != ""){
            var suit = SUITS.filter(suit => suit.name == this.suit)[0];
            return `${this.rank}<span style="color: ${suit.color};">${suit.symbol}</span>`;
        }
        return "";
    }

    toPlainObject() {
        return {
            id: this.id,
            value: this.rank,
            suit: this.suit,
            isFlipped: this.isFlipped,
            isPlayed: this.isPlayed
        };
    }

    //Sort by Value then by Suit
    static sort(cards: Card[]){
        const suitNames = SUITS.map(suit => suit.name);

        return cards.sort((a, b) =>
            RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank) ||
            suitNames.indexOf(a.suit) - suitNames.indexOf(b.suit)
        );
    }

    static fromPlainObject(data: DocumentData): Card{
        if (data == null){
            return new Card(0, "", "", false, false);
        }
        return new Card(data.id, data.value, data.suit, data.isFlipped, data.isPlayed);
    }
}