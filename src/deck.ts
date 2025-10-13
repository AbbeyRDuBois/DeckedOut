import { DocumentData } from "firebase/firestore";
import { SpriteSheet } from "./spritesheets";

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = [
    { name: 'Clubs', symbol: '♣', color: 'black' },
    { name: 'Diamonds', symbol: '♦', color: 'crimson' },
    { name: 'Hearts', symbol: '♥', color: 'crimson' },
    { name: 'Spades', symbol: '♠', color: 'black' },
];

export type CardOptions = {
  width?: number;
  height?: number;
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

    toHTML(): string {
        if (this.suit != ""){
            var suit = SUITS.filter(suit => suit.name == this.suit)[0];
            return `${this.value}<span style="color: ${suit.color};">${suit.symbol}</span>`;
        }
        return "";
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

    createCard(spriteSheet: SpriteSheet, options: CardOptions = {}): HTMLDivElement { 
        const {
            width = 100,
            height = 150,
            startsFlipped = false, //This tells if it starts out flipped or not
            clickable = false,
            onClick
        } = options;

        const {bgWidth, bgHeight} = spriteSheet.getBackgroundSize(width, height);
        var {col, row} = spriteSheet.getCardLocation(this.toInt(), spriteSheet.getRow(this.suit), width, height);

        const cardDiv = document.createElement('div');
        cardDiv.className = 'card' + (startsFlipped || this.isFlipped ? '' : ' flipped');
        cardDiv.setAttribute("card-id", this.id.toString());

        //This is the hinge that will flip the card. Face/Back elements will exist inside of this.
        const hinge = document.createElement('div');
        hinge.className = 'card-hinge';
        
        const face = document.createElement('div');
        face.className = 'card-face';
        face.style.backgroundPosition = `${col}px ${row}px`;
        face.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
        face.style.backgroundImage = spriteSheet.getImage();

        const back = document.createElement('div');
        back.className = 'card-back';

        //Recalculate to card back position 
        var {col, row} = spriteSheet.getCardLocation(spriteSheet.back_col, spriteSheet.back_row, width, height);
        back.style.backgroundPosition = `${col}px ${row}px`;
        back.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
        back.style.backgroundImage = spriteSheet.getImage();

        hinge.appendChild(face);
        hinge.appendChild(back);
        cardDiv.appendChild(hinge);

        // Attach the passed in handler
        if (clickable && onClick){
            cardDiv.addEventListener('click', () => onClick(this, cardDiv));
        }
        
        return cardDiv;
    }

    getRow(){        
        switch (this.suit) {
            case SUITS[0].name: 
                return 0;
            case SUITS[1].name: 
                return 1;
            case SUITS[2].name: 
                return 2;
            case SUITS[3].name: 
                return 3;
            default: return 4;
        }   
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
                this.deck.push(new Card(idCounter++, value, suit.name));
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