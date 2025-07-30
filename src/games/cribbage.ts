import { arrayUnion, DocumentData, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { BaseGame } from "./base-game";
import { Card, Deck } from "../deck";
import { Player } from "../player";


enum RoundState {
  Throwing = "Throwing",
  Pegging = "Pegging"
}

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
    roundState: string = ""

    constructor( deck: Deck, players: Player[], roomId: string){
      super(deck, players, roomId);
      this.maxPlayers = 8;

      this.cardClick = this.cardClick.bind(this); //Binds this function to game so that games variables can still be used in the onClick
    }

    async start(): Promise<void> {
      this.shufflePlayerOrder();
      this.currentPlayer = this.players[0]; //First player in array starts it off
      this.crib_owner = this.currentPlayer;
      this.setupTeams();
      this.deal();
      this.roundState = RoundState.Throwing

      //This call is pretty big cause it's inital setup
      this.updateDBState({
        players: this.players.map(player => player.toPlainObject()),
        teams: this.teams.flatMap((team, row) => team.map((player, col) => ({row, col, ...player.toPlainObject()}))),
        flipped: this.flipped.toPlainObject(),
        crib: arrayUnion(...this.crib.map(card => card.toPlainObject())),
        crib_owner: this.crib_owner.toPlainObject(),
        currentPlayer: this.currentPlayer.toPlainObject(),
        deck: this.deck.toPlainObject(),
        started: true,
        roundState: this.roundState
      });

      this.render();
      this.setupListeners();
      this.started = true;
    }

    async deal(): Promise<void> {
      //Deal 6 cards if 2 players, 5 if more
      const cardNum = this.players.length > 2 ? 5 : 6;

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

      //Adding crib (testing)
      const div = document.createElement('div');
      div.classList.add('player-total');
      div.innerHTML=`
        <div class="player-score">Crib: 0</div>
        <div class="total-hand"></div>
      `;
      const totalHand = div.querySelector(".total-hand")!;

      this.crib?.forEach((card: Card) => {
          totalHand.appendChild(card.createCard());
      });

      roundTotal.appendChild(div);
    }

    renderHand() {
      const currentId = localStorage.getItem("playerId");
      const player = this.players.find(player => player.id === currentId)!;
      const handContainer = document.getElementById('hand')!;
      if (this.roundState == RoundState.Pegging && this.currentPlayer.name !== player.name){
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
              <div class="card-back">${(opponent.hand?.length - opponent.numberPlayed)|| 0}</div>
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
        if (this.roundState == RoundState.Pegging && this.currentPlayer.id === localStorage.getItem('playerId')){
          const handContainer = document.getElementById("hand")!;
          handContainer.classList.remove('hand-disabled');
          this.isTurn = true;
        }

        this.renderOpponents();

        this.renderScoreboard();
        this.renderRoundTotal();
        this.renderFlipped();
        
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
      const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;

      if (handContainer.classList.contains('hand-disabled')) return; //Returns if hand is disabled

      handContainer.removeChild(cardDiv);

      if (this.roundState == RoundState.Throwing){

        //Remove from hand and add to crib
        this.crib.push(card)
        const cardIndex = player.hand.findIndex(c => c.id == card.id)
        player.hand.splice(cardIndex, 1)

        //check if you've thrown necessary cards
        if (player.hand.length == this.hand_size){
          handContainer.classList.add('hand-disabled');
        }

        let changes: Record<string, any> = {
          players: this.players.map(p => p.toPlainObject()),
          crib: this.crib.map(c => c.toPlainObject())
        };

        if (this.players.every(player => player.hand.length == this.hand_size)){
          changes.roundState = RoundState.Pegging;
        }

        await updateDoc(this.roomRef, changes);
      }
      //RoundState is Pegging
      else{
        playedContainer.innerHTML = '';

        cardDiv.classList.add('played');
        cardDiv.replaceWith(cardDiv.cloneNode(true));
        playedContainer.appendChild(cardDiv);

        const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
        player.lastPlayed = card;
        player.numberPlayed += 1;

        //Sets the next player
        this.nextPlayer();
        handContainer.classList.add('hand-disabled');

        //Updates last played for all players
        await updateDoc(this.roomRef, {
            players: this.players.map(p => p.toPlainObject()),
            currentPlayer: this.currentPlayer.toPlainObject()
        });
      }
    }

    updateLocalState(data: DocumentData): void {
      this.players = data.players.map((player: any) =>Player.fromPlainObject(player));
      this.currentPlayer = Player.fromPlainObject(data.currentPlayer);
      this.crib_owner = this.currentPlayer;
      this.crib = data.crib.map((c: any) => new Card(c.id, c.value, c.suit))
      this.deck = Deck.fromPlainObject(data.deck);
      data.teams.forEach((player: any) => {
        this.teams[player.row][player.col] = Player.fromPlainObject(player);
      });
      this.roundState = data.roundState
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