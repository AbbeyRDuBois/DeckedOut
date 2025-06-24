import { doc, updateDoc } from "firebase/firestore";
import { Player } from "./player";
import { db } from "./authentication";

const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ["Heart", "Diamond", "Club", "Spade"];

export class Card {
    id: number;
    value: string;
    suit: string;

    constructor(id: number, value = "", suit = ""){
        this.value = value;
        this.suit = suit;
        this.id = id;
    }

    toString(): string{
        return `${this.value} ${this.suit}`;
    }

    //Gives the int value of non number cards
    //Passing in true turns face cards to 10 for cribbage counting
    toInt(cribbage = false): number{
        switch(this.value){
            case 'A':
                return 1;
            case 'J':
                return cribbage ? 10 : 11;
            case 'Q':
                return cribbage ? 10 : 12;
            case 'K':
                return cribbage ? 10 : 13;
            case 'JK':
                return -1;
            default:
                return parseInt(this.value);
        }
    }

    //Creates the cards that are added to hands
    //Attaches a listener that will remove it from hand and place it in played section when clicked
    createCard(players: Player[]): HTMLDivElement {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.textContent = this.toString();
        cardDiv.setAttribute("card-id", this.id.toString());

        const handContainer = document.getElementById("hand")!;
        const playedContainer = document.getElementById("played")!;
        const roomId = new URLSearchParams(window.location.search).get("roomId")!;
        const roomRef = doc(db, "rooms", roomId);

        cardDiv.addEventListener('click', async () => {
            // Remove from hand
            handContainer.removeChild(cardDiv);

            // Clear previous played card
            playedContainer.innerHTML = '';

            //Add played line so hover no longer works on card
            //cloneNode strips it of all listeners
            cardDiv.classList.add('played');
            cardDiv.replaceWith(cardDiv.cloneNode(true));

            // Add card to played section
            playedContainer.appendChild(cardDiv);

            //Update players card count and last played
            const player = players.find((player: Player) => player.id === localStorage.getItem('playerId')!)!;
            const index = player.hand.findIndex(card => card.id === this.id);
            if (index !== -1) player.hand.splice(index, 1);
            player.lastPlayed = this;

            //Updates database with changes so others can see it
            await updateDoc(roomRef, {
                players: players.map(p => p.toPlainObject())
            });
        });

        return cardDiv;
    };

    toPlainObject(){
        return {
            id: this.id,
            value: this.value,
            suit: this.suit,

        }
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