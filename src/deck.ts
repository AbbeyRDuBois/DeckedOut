import { doc, DocumentData, updateDoc } from "firebase/firestore";
import { Player } from "./player";
import { db } from "./authentication";

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ["Heart", "Diamond", "Club", "Spade"];

export class Card {
    id: number;
    value: string;
    suit: string;


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
            default: return parseInt(this.value);
        }
    }

    createCard(clickable = false, onClick?: (card: Card, cardDiv: HTMLDivElement) => void): HTMLDivElement {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.textContent = this.toString();
        cardDiv.setAttribute("card-id", this.id.toString());

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

    //Will return the current hands of the player
    getHands(players: Player[]){
        let hands: Card[][] = [];

        players.forEach(player => {
            hands.push(player.hand) 
        });

        return hands;
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