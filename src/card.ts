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
    protected id: number;
    protected rank: string;
    protected suit: string;
    protected flipped: boolean;
    protected played: boolean;
    protected type: 'classic' | 'text' = 'classic';
    protected text?: string;

    constructor(id: number, rank = "", suit = "", flipped = false, played = false) {
        this.rank = rank;
        this.suit = suit;
        this.id = id;
        this.flipped = flipped;
        this.played = played;
        this.type = 'classic';
    }

    getId(): number { return this.id; }
    getRank(): string { return this.rank; }
    getSuit(): string { return this.suit; }
    getFlipped(): boolean { return this.flipped; }
    setFlipped(flipped: boolean){ this.flipped = flipped; }
    setPlayed(played: boolean){ this.played = played; }
    getType(): 'classic' | 'text' { return this.type; }
    getText(): string | undefined { return this.text; }
    
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
        if (this.type === 'text') {
            return this.text ?? '';
        }
        if (this.suit != ""){
            var suit = SUITS.filter(suit => suit.name == this.suit)[0];
            return `${this.rank}<span style="color: ${suit.color};">${suit.symbol}</span>`;
        }
        return "";
    }

    toPlainObject() {
        return {
            id: this.id,
            rank: this.rank,
            suit: this.suit,
            flipped: this.flipped,
            played: this.played,
            type: this.type,
            text: this.text
        };
    }

    //Sort by Rank then by Suit
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
        if (data.type === 'text' || typeof data.text === 'string'){
            const c = new Card(data.id, "", "", data.flipped, data.played);
            c.type = 'text';
            c.text = data.text;
            return c;
        }
        return new Card(data.id, data.rank, data.suit, data.flipped, data.played);
    }
}

// Convenience class to create text-only cards
export class TextCard extends Card {
    constructor(id: number, text: string, flipped = false, played = false){
        super(id, "", "", flipped, played);
        this.type = 'text';
        this.text = text;
    }
}