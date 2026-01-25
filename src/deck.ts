import { DocumentData } from "firebase/firestore";
import { Card, SUITS, VALUES } from "./card";

export class Deck{
    deck: Card[] = [];

    constructor(deck: Card[] = []){
        if (deck.length ===  0){
            this.resetDeck();
        }else {
            this.deck = deck;
        }
    }
    
    getDeck(): Card[] { return this.deck; }
    getCard(){
        if(this.deck.length === 0) return;

        let card = Math.floor(Math.random() * this.deck.length);
        return this.deck.splice(card, 1)[0];
    }

    resetDeck(){
        this.deck = [];
        let idCounter = 0;

        //Adds in a card of each value/suit
        for (const suit of SUITS){
            for(const value of VALUES){
                this.deck.push(new Card(idCounter++, value, suit.name));
            }
        }
    }

    toPlainObject(){
        return this.deck.map(card => card.toPlainObject());
    }

    static fromPlainObject(data: DocumentData): Deck{
        return new Deck(Array.isArray(data)
            ? data.map((c: any) => new Card(c.id, c.value, c.suit, c.isFlipped))
            : []);
    }
}

export class JokerDeck extends Deck{
    resetDeck(){
        super.resetDeck();
        this.deck.push(new Card(this.deck.length, 'JK', 'Red'))
        this.deck.push(new Card(this.deck.length, 'JK', 'Black'))
    }
}

export { SUITS };
