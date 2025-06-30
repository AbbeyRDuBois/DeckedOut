import { arrayUnion, DocumentData, getDoc, updateDoc } from "firebase/firestore";
import { renderHand, renderOpponents } from "../room";
import { BaseGame } from "./base-game";
import { Card, Deck } from "../deck";
import { Player } from "../player";

export class Cribbage extends BaseGame {
    point_goal: number = 121; //Number of points to win
    skunk_length: number = 30; //Number of points from skunk line to end -1
    crib_count: number = 4; //Number of cards in crib
    hand_size: number = 4; //Number of cards in a hand after throwing to crib
    throw_count: number = 0; //How many cards each player throws, initialized upon starting game
    throw_away_phase: boolean = true; //True if players still need to throw cards away
    pegging_phase: boolean = false; //True if players are in the pegging phase
    pegging_index: number = 0; //(crib_index + 1) % len(players)
    teams: Player[][] = []; //Array to hold player groups
    flipped: Card = new Card(0); //Flipped Card
    crib: Card[] = []; //Crib

    constructor( deck: Deck, players: Player[], roomId: string){
      super(deck, players, roomId);
      this.maxPlayers = 8;

      switch(players.length){
        case 2:
          this.throw_count = 2;
          break;
        case 3 | 4:
          this.throw_count = 1;
          break;
        default: //More than 4 players
          this.throw_count = 1;
          this.crib_count = 8;
          this.point_goal = 241;
          this.skunk_length = 60;
      }
    }

    start(): void {
      this.shufflePlayerOrder();
      this.setupTeams();
      this.deal();
      this.render();
      this.setupListeners();
      this.started = true;
    }

    async deal(): Promise<void> {
      //Deal 5 cards if 3 or less players, 7 if more
      const cardNum = this.players.length > 3 ? 7 : 5;

      this.players.forEach(player => {
        for(let i = 0; i < cardNum; i++){
          player.hand.push(this.deck.getCard()!);
        }
      })

      await updateDoc(this.roomRef, {
          players: this.players.map(p => p.toPlainObject())
      });
    }

    render(): void {
      const currentId = localStorage.getItem("playerId");
      const user = this.players.find(player => player.id === currentId)!;
      const opponents = this.players.filter(player => player.id !== currentId);

      renderHand(user);
      renderOpponents(opponents);

      this.renderScoreboard();
      this.renderRoundTotal();
      this.renderFlipped();
    }

    handleAction(data: any): void {
      throw new Error("Method not implemented.");
    }
    getState() {
      throw new Error("Method not implemented.");
    }

    setupTeams(){
      //Default of just one player for each team for testing.
      this.players.forEach(player => {
        this.teams.push([player]);
      })
    }

    renderScoreboard() {
      const scoreboard = document.getElementById('scoreboard')!;
      scoreboard.innerHTML = ''; // clears old content
      
      this.teams.forEach(team => { 
        const div = document.createElement('div');
        div.classList.add('team');
        div.innerHTML=`
          <div class="team-name">${team.map(player => player.name).join("-")}</div>
          <div class="team-score">${team.reduce((sum, player) => sum + player.score, 0)}</div>
        `;
        scoreboard.appendChild(div);
      })
    }

    renderRoundTotal() {
      const roundTotal = document.getElementById("round-totals")!;
      roundTotal.innerHTML = "";

      this.players.forEach(player => {
        const div = document.createElement('div');
        div.classList.add('player-total');
        div.innerHTML=`
          <div class="player-score">${player.name}: ${player.score}</div>
          <div class="total-hand"></div>
        `;
        const totalHand = div.querySelector(".total-hand")!;

        player.hand?.forEach((card: Card) => {
            totalHand.appendChild(card.createCard(this.players, false));
        });

        roundTotal.appendChild(div);
      })
    }

    setupListeners() {
      const toggle = document.getElementById("toggle-round-totals");
      const roundTotals = document.getElementById("round-totals");

      toggle?.addEventListener("click", () => {
        const isCollapsed = roundTotals?.classList.toggle("collapsed");
        const minus = document.getElementById("minimize")!;
        const plus = document.getElementById("maximize")!;

        minus.style.display = isCollapsed ? "none" : "inline";
        plus.style.display = isCollapsed ? "inline" : "none";

        isCollapsed ? toggle.title = "Maximize Totals" : toggle.title = "Minimize Totals";
      });
    }

    getFlipped() {
      if (!this.flipped) {
        this.flipped = this.deck.getCard()!;
        this.renderFlipped();
      }
    }

    async renderFlipped(){
      const flippedDiv = document.getElementById("flipped")!;
      flippedDiv.innerHTML = '';

      if (this.flipped) {
        const cardDiv = this.flipped.createCard(this.players, false);
        flippedDiv.appendChild(cardDiv);
      }
    }

    async updateGameState(){
      await updateDoc(this.roomRef, {
        players: this.players.forEach(player => player.toPlainObject()),
        flipped: this.flipped.toPlainObject(),
        crib: arrayUnion(this.crib.forEach(card => card.toPlainObject()))
      });
    }
}