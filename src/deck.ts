import { DocumentData } from "firebase/firestore";

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = [
    { name: 'Clubs', symbol: '♣', color: 'black' },
    { name: 'Diamonds', symbol: '♦', color: 'darkred' },
    { name: 'Hearts', symbol: '♥', color: 'darkred' },
    { name: 'Spades', symbol: '♠', color: 'black' },
];

type CardOptions = {
  width?: number;
  height?: number;
  startsFlipped?: boolean;
  clickable?: boolean;
  onClick?: (card: Card, cardDiv: HTMLDivElement) => void;
};

// Original card dimensions in the spritesheet
const ORIGINAL_CARD_WIDTH = 100;
const ORIGINAL_CARD_HEIGHT = 150;

// Spritesheet full size
const SPRITESHEET_WIDTH = 1300;
const SPRITESHEET_HEIGHT = 750;

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
            return `<span style="color: ${suit.color};">${this.value}${suit.symbol}</span>`;
        }
        return "";
    }

    toInt(counting = false): number {
        switch (this.value) {
            case 'A': return 1;
            case 'J': return counting ? 10 : 11;
            case 'Q': return counting ? 10 : 12;
            case 'K': return counting ? 10 : 13;
            default: return parseInt(this.value);
        }
    }

    createCard(options: CardOptions = {}): HTMLDivElement { 
        const {
            width = 100,
            height = 150,
            startsFlipped = false, //This tells if it starts out flipped or not
            clickable = false,
            onClick
        } = options;

        //This rescales the spritesheet to fit the cards
        const scaleX = width / ORIGINAL_CARD_WIDTH;
        const scaleY = height / ORIGINAL_CARD_HEIGHT;

        // Calculate background size (scale whole spritesheet)
        const bgWidth = SPRITESHEET_WIDTH * scaleX;
        const bgHeight = SPRITESHEET_HEIGHT * scaleY;

        //Get positions in spritesheet (need to use actual card size (100 x 150))
        const col = (this.toInt() - 1) * ORIGINAL_CARD_WIDTH;
        const row = this.getRow() * ORIGINAL_CARD_HEIGHT;

        var bgPosX = -col * scaleX;
        var bgPosY = -row * scaleY;

        const cardDiv = document.createElement('div');
        cardDiv.className = 'card' + (startsFlipped || this.isFlipped ? '' : ' flipped');
        cardDiv.setAttribute("card-id", this.id.toString());

        //This is the hinge that will flip the card. Face/Back elements will exist inside of this.
        const hinge = document.createElement('div');
        hinge.className = 'card-hinge';
        
        const face = document.createElement('div');
        face.className = 'card-face';
        face.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
        face.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;

        const back = document.createElement('div');
        back.className = 'card-back';

        //Recalculate to card back position 
        //TODO: Right now card back location is hardcoded. Fix this
        bgPosX = -2 * ORIGINAL_CARD_WIDTH * scaleX;
        bgPosY = -4 * ORIGINAL_CARD_HEIGHT * scaleY;
        back.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
        back.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;

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