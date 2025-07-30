import { arrayUnion, DocumentData, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { BaseGame } from "./base-game";
import { Card, Deck } from "../deck";
import { Player } from "../player";
import { v4 } from "uuid";

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
    isTurn: boolean = true; //Is it players turn to play card
    crib_owner: Player = new Player("", "");

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

      this.cardClick = this.cardClick.bind(this); //Binds this function to game so that games variables can still be used in the onClick
    }

    async start(): Promise<void> {
      this.shufflePlayerOrder();
      this.currentPlayer = this.players[0]; //First player in array starts it off
      this.crib_owner = this.currentPlayer;
      this.setupTeams();
      this.deal();

      //This call is pretty big cause it's inital setup
      this.updateDBState({
        players: this.players.map(player => player.toPlainObject()),
        teams: this.teams.flatMap((team, row) => team.map((player, col) => ({row, col, ...player.toPlainObject()}))),
        flipped: this.flipped.toPlainObject(),
        crib: arrayUnion(...this.crib.map(card => card.toPlainObject())),
        crib_owner: this.crib_owner.toPlainObject(),
        currentPlayer: this.currentPlayer.toPlainObject(),
        deck: this.deck.toPlainObject(),
        started: true
      });

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
    }

    render(): void {
      this.renderHand();
      this.renderOpponents();

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
            totalHand.appendChild(card.createCard());
        });

        roundTotal.appendChild(div);
      })
    }

    renderHand() {
      const currentId = localStorage.getItem("playerId");
      const player = this.players.find(player => player.id === currentId)!;
      const handContainer = document.getElementById('hand')!;
      if (this.currentPlayer.name !== player.name){
        this.deactivateHand();
      }

      handContainer.innerHTML = '';
      player.hand?.forEach((card: Card) => {
          handContainer.appendChild(card.createCard(true, this.cardClick));
      });
    }

    renderOpponents() {
      const opponents = this.players.filter(p => p.id !== localStorage.getItem('playerId'));
      const opponentContainer = document.getElementById('opponents')!;
      opponentContainer.innerHTML = ''; // clears old content
      opponents.forEach(opponent => {
          const div = document.createElement('div');
          div.classList.add('opponent');
          div.innerHTML = `
          <div class = "opponent-name">${opponent.name}</div>
          <div class = "hand-info">
              <div class="card-back">${opponent.hand?.length || 0}</div>
              <div class="opp-played">${opponent.lastPlayed?.toString() || ""} </div>
          </div>`;
          opponentContainer.appendChild(div);
      });
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

      //Game specific room listener
      onSnapshot(this.roomRef, (docSnap: any) => {
        const roomData = docSnap.data() as DocumentData;
        this.updateLocalState(roomData);
        //Enables your hand if it's your turn
        const handContainer = document.getElementById("hand")!;
        if (this.currentPlayer.id === localStorage.getItem('playerId')){
          handContainer.classList.remove('hand-disabled');
          this.isTurn = true;
        }
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
        const cardDiv = this.flipped.createCard();
        flippedDiv.appendChild(cardDiv);
      }
    }

    async updateDBState(changes: { [key: string]: any}){
      await updateDoc(this.roomRef, changes);
    }

    async cardClick(card: Card, cardDiv: HTMLDivElement) {
      const handContainer = document.getElementById("hand")!;
      const playedContainer = document.getElementById("played")!;

      if (handContainer.classList.contains('hand-disabled')) return; //Returns if hand is disabled

      handContainer.removeChild(cardDiv);
      playedContainer.innerHTML = '';

      cardDiv.classList.add('played');
      cardDiv.replaceWith(cardDiv.cloneNode(true));
      playedContainer.appendChild(cardDiv);

      const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
      player.lastPlayed = card;

      //Sets the next player
      this.nextPlayer();
      handContainer.classList.add('hand-disabled');

      //Updates last played for all players
      await updateDoc(this.roomRef, {
          players: this.players.map(p => p.toPlainObject()),
          currentPlayer: this.currentPlayer.toPlainObject()
      });
    }

    updateLocalState(data: DocumentData): void {
      this.players = data.players.map((player: any) =>Player.fromPlainObject(player));
      this.currentPlayer = Player.fromPlainObject(data.currentPlayer);
      this.crib_owner = this.currentPlayer;
      this.deck = Deck.fromPlainObject(data.deck);
      data.teams.forEach((player: any) => {
        this.teams[player.row][player.col] = Player.fromPlainObject(player);
      });
    }

    guestSetup(data: DocumentData): void {
      //Set up teams
      const num_teams = Math.max(...data.teams.map((p: any) => p.row)) + 1;
      this.teams = Array.from({ length: num_teams }, () => []); // Initialize rows

      this.updateLocalState(data);
      this.render();
      this.setupListeners();
      this.setStarted(true);
    }
}