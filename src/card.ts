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
            container = document.getElementById('hand')!,
            startsFlipped = false, //This tells if it starts out flipped or not
            clickable = false,
            onClick
        } = options;

        const style = getComputedStyle(container);
        const containerRect = container.getBoundingClientRect();
        const height = containerRect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
        const width = containerRect.height / 2;

        const {bgWidth, bgHeight} = spriteSheet.getBackgroundSize(width, height);
        var {col, row} = spriteSheet.getCardLocation(this.toInt(), spriteSheet.getRow(this.suit), width, height);

        const cardDiv = document.createElement('div');
        cardDiv.className = 'card' + (startsFlipped || this.isFlipped ? '' : ' flipped');
        cardDiv.setAttribute("card-id", this.id.toString());
        cardDiv.style.height = `${height}px`;
        cardDiv.style.width = `${width}px`;

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