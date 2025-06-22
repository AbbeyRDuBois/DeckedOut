import { doc, updateDoc } from "firebase/firestore";
import { Player } from "./player";
import { db } from "./authentication";

const HEART = "Heart";
const DIAMOND = "Diamond";
const CLUB = "Club";
const SPADE = "Spade";

const ACE = 'A';
const JACK = 'J';
const QUEEN = 'Q';
const KING = 'K';
const JOKER = "JK";

const RED = [HEART, DIAMOND];
const BLACK = [CLUB, SPADE];

const VALUES = [ACE, '2', '3', '4', '5', '6', '7', '8', '9', '10', JACK, QUEEN, KING];
const SUITS = [HEART, DIAMOND, CLUB, SPADE];

export class Card {
    id: number;
    value: string;
    suit: string;
    handContainer = document.getElementById("hand")!;
    playedContainer = document.getElementById("played")!;

    constructor(id: number, value = "2", suit = "Hearts",){
        this.value = value;
        this.suit = suit;
        this.id = id;
    }

    toString(): string{
        return this.value + " " + this.suit;
    }

    //Gives the int value of non number cards
    //Passing in true turns face cards to 10 for cribbage counting
    toInt(cribbage = false){
        switch(this.value){
            case ACE:
                return 1;
            case JACK:
                return cribbage ? 10 : 11;
            case QUEEN:
                return cribbage ? 10 : 12;
            case KING:
                return cribbage ? 10 : 13;
            case JOKER:
                return -1;
            default:
                return +this.value
        }
    }

    //Creates the cards that are added to hands
    //Attaches a listener that will remove it from hand and place it in played section when clicked
    createCard(players: Player[]): HTMLDivElement {
        const roomId = new URLSearchParams(window.location.search).get("roomId")!;

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.textContent = this.value + " " + this.suit;
        cardDiv.setAttribute("card-id", this.id.toString());

        cardDiv.addEventListener('click', async () => {
            // Remove from hand
            this.handContainer.removeChild(cardDiv);

            // Clear previous played card
            this.playedContainer.innerHTML = '';

            //Add played line so hover no longer works on card
            //cloneNode strips it of all listeners
            cardDiv.classList.add('played');
            cardDiv.replaceWith(cardDiv.cloneNode(true));

            // Add card to played section
            this.playedContainer.appendChild(cardDiv);

            //Update players card count and last played
            const player = players.find((player: Player) => player.id === localStorage.getItem('playerId')!)!;
            const index = player.hand.findIndex(card => cardDiv.id === card.id.toString());
            player.hand.splice(index, 1);
            player.lastPlayed = this;

            //Updates database with changes so others can see it
            const roomRef = doc(db, "rooms", roomId);
            await updateDoc(roomRef, {
                players: players.map(p => JSON.stringify(p))
            });
        });

        return cardDiv;
    };
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

        //Adds in a card of each value/suit
        SUITS.forEach(suit => {
            VALUES.forEach(value => {
                this.deck.push(new Card(this.deck.length, value, suit));
            });
        });
    }

    getHands(numHands: number, numCards: number){
        let hands = [];

        if (numHands * numCards <= this.deck.length){
            for(let h = 0; h < numHands; h++){
                let hand = [];
                for(let c = 0; c < numCards; c++){
                    let card = Math.floor(Math.random() * this.deck.length);
                    hand.push(this.deck[card]);
                    this.deck.splice(card, 1);
                };
                hands.push(hand);
            };
        };

        return hands;
    }

    getFlipped(){
        if(this.flipped == null && this.deck.length >= 1){
            let card = Math.floor(Math.random() * this.deck.length);
            this.flipped = this.deck[card];
            this.deck.splice(card,1);
        };
        return this.flipped;
    }

    getCard(){
        if(this.deck.length >= 1){
            let card = Math.floor(Math.random() * this.deck.length);
            let extra = this.deck[card];
            this.deck.splice(card,1);

            return extra;
        }
        return null;
    }
}