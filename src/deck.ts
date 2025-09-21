import { doc, DocumentData, updateDoc } from "firebase/firestore";
import { Player } from "./player";
import { db } from "./authentication";

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ["Club","Diamond", "Heart","Spade"];

export class Card {
    id: number;
    value: string;
    suit: string;
    cardWidth = 100;
    cardHeight = 150;



    constructor(id: number, value = "", suit = "") {
        this.value = value;
        this.suit = suit;
        this.id = id;
    }

    toString(): string {
        return `${this.value} ${this.suit}`;
    }

    toInt(counting = false): number {
        switch (this.value) {
            case 'A': return 1;
            case 'J': return counting ? 10 : 11;
            case 'Q': return counting ? 10 : 12;
            case 'K': return counting ? 10 : 13;
            case 'JK': return -1;
            case "": return 3; //Assuming Card Back here
            default: return parseInt(this.value);
        }
    }

    createCard(clickable = false, onClick?: (card: Card, cardDiv: HTMLDivElement) => void): HTMLDivElement { 
        var suitIndex = 0;         
        switch (this.suit) {
            case SUITS[0]: 
                suitIndex = 0; 
                break;
            case SUITS[1]: 
                suitIndex = 1; 
                break;
            case SUITS[2]: 
                suitIndex = 2;
                break;
            case SUITS[3]: 
                suitIndex = 3;
                break;
            default: suitIndex = 4;
        }
        //Get positions in spritesheet
        const col = (this.toInt() - 1) * this.cardWidth;
        const row = suitIndex * this.cardHeight;

        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.setAttribute("card-id", this.id.toString());
        cardDiv.style.backgroundPosition = `-${col}px -${row}px`;

        // Attach the passed in handler
        if (clickable && onClick){
            cardDiv.addEventListener('click', () => onClick(this, cardDiv));
        }
        
        return cardDiv;
    }

    toPlainObject() {
        return {
            id: this.id,
            value: this.value,
            suit: this.suit,
        };
    }
    static fromPlainObject(data: DocumentData): Card{
        return new Card(data.id, data.value, data.suit);
    }
}


export class Deck{
    deck: Card[] = [];

    constructor(deck: Card[] = []){
        if (deck.length ===  0){
            this.resetDeck();
        }else {
            this.deck = deck;
        }
    }

    resetDeck(){
        this.deck = [];
        let idCounter = 0;

        //Adds in a card of each value/suit
        for (const suit of SUITS){
            for(const value of VALUES){
                this.deck.push(new Card(idCounter++, value, suit));
            }
        }
    }

    getCard(){
        if(this.deck.length === 0) return;

        let card = Math.floor(Math.random() * this.deck.length);
        return this.deck.splice(card, 1)[0];
    }

    toPlainObject(){
        return this.deck.map(card => card.toPlainObject());
    }

    static fromPlainObject(data: DocumentData): Deck{
        return new Deck(Array.isArray(data)
            ? data.map((c: any) => new Card(c.id, c.value, c.suit))
            : []);
    }
}