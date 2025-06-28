import { doc, updateDoc } from "firebase/firestore";
import { Player } from "./player";
import { db } from "./authentication";

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ["Heart", "Diamond", "Club", "Spade"];

export class Card {
    id: number;
    value: string;
    suit: string;

    cardDiv?: HTMLDivElement;
    private clickHandler?: (e: MouseEvent) => void; // for default behavior

    constructor(id: number, value = "", suit = "") {
        this.value = value;
        this.suit = suit;
        this.id = id;
    }

    toString(): string {
        return `${this.value} ${this.suit}`;
    }

    toInt(cribbage = false): number {
        switch (this.value) {
            case 'A': return 1;
            case 'J': return cribbage ? 10 : 11;
            case 'Q': return cribbage ? 10 : 12;
            case 'K': return cribbage ? 10 : 13;
            case 'JK': return -1;
            default: return parseInt(this.value);
        }
    }

    createCard(players: Player[], clickable = true): HTMLDivElement {
        this.cardDiv = document.createElement('div');
        this.cardDiv.className = 'card';
        this.cardDiv.textContent = this.toString();
        this.cardDiv.setAttribute("card-id", this.id.toString());

        // Create and attach default handler
        if (clickable){
            this.attachDefaultClickHandler(players); 
        }
        
        return this.cardDiv;
    }

    attachDefaultClickHandler(players: Player[]) {
        if (!this.cardDiv) return;

        const handContainer = document.getElementById("hand")!;
        const playedContainer = document.getElementById("played")!;
        const roomId = new URLSearchParams(window.location.search).get("roomId")!;
        const roomRef = doc(db, "rooms", roomId);

        // Save reference to the handler so it can be removed
        this.clickHandler = async () => {
            if (handContainer.classList.contains('hand-disabled')) return; //Returns is hand is disabled

            handContainer.removeChild(this.cardDiv!);
            playedContainer.innerHTML = '';

            this.cardDiv!.classList.add('played');
            this.cardDiv!.replaceWith(this.cardDiv!.cloneNode(true));
            playedContainer.appendChild(this.cardDiv!);

            const player = players.find((p) => p.id === localStorage.getItem('playerId')!)!;
            const index = player.hand.findIndex(c => c.id === this.id);
            if (index !== -1) player.hand.splice(index, 1);
            player.lastPlayed = this;

            await updateDoc(roomRef, {
                players: players.map(p => p.toPlainObject())
            });
        };

        this.cardDiv.addEventListener('click', this.clickHandler);
    }

    removeClickHandler() {
        if (this.cardDiv && this.clickHandler) {
            this.cardDiv.removeEventListener('click', this.clickHandler);
            this.clickHandler = undefined;
        }
    }

    attachCustomClickHandler(customHandler: (e: MouseEvent) => void) {
        this.removeClickHandler();
        if (this.cardDiv) {
            this.clickHandler = customHandler;
            this.cardDiv.addEventListener('click', this.clickHandler);
        }
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
    flipped: Card = new Card(0);

    constructor(){
        this.resetDeck();
    }

    resetDeck(){
        this.deck = [];
        this.flipped = new Card(0);
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

    getFlipped(){
        if(this.flipped === null && this.deck.length > 0){
            const card = this.getCard()!;
            this.flipped = card;
        };
        return this.flipped;
    }
}