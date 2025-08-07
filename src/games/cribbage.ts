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
    teams: Player[][] = []; //Array to hold player groups
    flipped: Card = new Card(0); //Flipped Card
    crib: Card[] = []; //Crib
    isTurn: boolean = true; //Is it players turn to play card
    crib_owner: Player = new Player("", ""); //Who owns the crib
    cribScore: number = 0 // Score of the last crib
    lastCrib: Card[] = [] //Holds the last crib
    roundState: string = "" //Holds what phase the game is in currently
    peggingCards: Card[] = [] //Holds sequence of cards played in pegging round
    peggingTotal: number = 0 //Sum of current pegging round

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
        cribScore: this.cribScore,
        lastCrib: arrayUnion(...this.lastCrib.map(card => card.toPlainObject())),
        currentPlayer: this.currentPlayer.toPlainObject(),
        deck: this.deck.toPlainObject(),
        started: true,
        roundState: this.roundState,
        peggingCards: arrayUnion(...this.peggingCards.map(card => card.toPlainObject())),
        peggingTotal: this.peggingTotal
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
      this.renderAllHands();
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

    renderAllHands() {
      const roundTotal = document.getElementById("round-totals")!;
      roundTotal.innerHTML = "";

      this.players.forEach(player => {
        const div = document.createElement('div');
        div.classList.add('player-total');
        div.innerHTML=`
          <div class="player-score">${player.name}: ${player.lastScore}</div>
          <div class="total-hand"></div>
        `;
        const totalHand = div.querySelector(".total-hand")!;

        player.lastHand?.forEach((card: Card) => {
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
              <div class="card-back">${(opponent.hand?.length - opponent.playedCards.length)|| 0}</div>
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
        this.renderAllHands();
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

        await this.updateDBState(changes);
      }
      //RoundState is Pegging
      else{
        if (this.peggingTotal + card.toInt(true) > 31) return;

        this.peggingTotal += card.toInt(true);
        console.log(`Pegging Total: ${this.peggingTotal}`)
        playedContainer.innerHTML = '';

        cardDiv.classList.add('played');
        cardDiv.replaceWith(cardDiv.cloneNode(true));
        playedContainer.appendChild(cardDiv);

        const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
        player.lastPlayed = card;
        player.playedCards.push(card);
        this.peggingCards.push(card)
        player.score = this.calculatePeggingPoints(card);

        //Sets the next player
        this.nextPlayer(true);
        handContainer.classList.add('hand-disabled');

        //Updates last played and pegging arrays for all players
        await this.updateDBState({
          players: this.players.map(p => p.toPlainObject()),
          currentPlayer: this.currentPlayer.toPlainObject(),
          peggingCards: this.peggingCards.map(card => card.toPlainObject()),
          peggingTotal: this.peggingTotal
        });
      }
    }

    updateLocalState(data: DocumentData): void {
      this.players = data.players.map((player: any) =>Player.fromPlainObject(player));
      this.currentPlayer = Player.fromPlainObject(data.currentPlayer);
      this.crib_owner = this.currentPlayer;
      this.crib = data.crib.map((c: any) => new Card(c.id, c.value, c.suit));
      this.cribScore = data.cribScore;
      this.lastCrib = data.lastCrib.map((c: any) => new Card(c.id, c.value, c.suit));
      this.deck = Deck.fromPlainObject(data.deck);
      data.teams.forEach((player: any) => {
        this.teams[player.row][player.col] = Player.fromPlainObject(player);
      });
      this.roundState = data.roundState;
      this.peggingCards = data.peggingCards.map((c: any) => new Card(c.id, c.value, c.suit));
      this.peggingTotal = data.peggingTotal;
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

    calculatePeggingPoints(card: Card): number {
      let points = 0;

      // Find longest run if enough cards
      if (this.peggingCards.length >= 3) {
          let handValues = this.peggingCards.map(card => card.toInt(true));
          for (let length = handValues.length; length >= 3; length--) {
              const slice = handValues.slice(handValues.length - length); // Always ends at last card
              const unique = new Set(slice);

              // No repeated ranks allowed
              if (unique.size !== slice.length) continue;

              const sorted = [...unique].sort((a, b) => a - b);
              const min = sorted[0];
              const max = sorted[sorted.length - 1];

              // Check for a valid run (consecutive sequence)
              if (max - min + 1 === sorted.length) {
                  points += sorted.length;
                  break;
              }
          }
      }

      // Check for pairs
      let pairs = 1;
      let isDone = false;

      for(let i = this.peggingCards.length - 2 ; i >= 0 && !isDone; i--){
        if (card.value == this.peggingCards[i].value){
            pairs += 1;
        } else {
            isDone = true;
        }
      }

      // If any pairs
      if (pairs > 1) {
          points +=  pairs * (pairs -1)
      }

      // Check for 15 and 31
      if (this.peggingTotal === 15 || this.peggingTotal === 31) {
          points += 2;
      }

      console.log(`Pegging Points: ${points}`)
      return points;
  }

  nextPlayer(pegging?: boolean): void {
    const index = this.players.findIndex(player => player.id === this.currentPlayer.id);
    if(pegging){
      let found = false;

      if (this.peggingTotal != 31){
        //Find the next player who has a playable card
        for(let i = 1; i <= this.players.length && !found; i++){
          const player = this.players[(index + i) % this.players.length];

          const unplayedCards = player.hand.filter(card => !player.playedCards.includes(card));
          if (unplayedCards?.some(card => card.toInt(true) + this.peggingTotal <= 31)){
            this.currentPlayer = player;
            found = true;
          }
        }
      }

      if (!found){
        //Add in that last point and restart pegging/move to next throw round
        this.players[index].score +=1;
        this.endRound(index);
      }

    }
    else{
      //Just get the next player in the array
      this.currentPlayer = this.players[(index + 1) % this.players.length];
    }

    if (this.currentPlayer.id === localStorage.getItem('playerId')){
      this.isTurn = true;
    }
    else{
      this.isTurn = false;
    }
  }

  endRound(index: number){
    let found = true;
    //If a player still has cards to play
    if(this.players.some(player => player.hand.length - player.playedCards.length > 0)){
      //find the next player who has cards to play
      for(let i = 1; i <= this.players.length && !found; i++){
        let player = this.players[(index + i) % this.players.length];

        if (player.hand.length - player.playedCards.length > 0){
          this.currentPlayer = player;
          found = true;
        }
      }

      //Reset the pegging values
      this.peggingTotal = 0;
      this.peggingCards = [];
    }
    //If players don't have anymore cards update everything and deal new cards
    else{
      this.countHands();
      this.countCrib();
      this.renderAllHands();
      this.renderScoreboard();
      //Deal new hands
      this.roundState = RoundState.Throwing;
    }
  }

  countHands(){
    this.players.forEach(player =>{
      let points = 0;
      let hand = player.hand;
            
      //Do flush/nobs first as it doesn't need to be sorted and a card being the flipped one matters
      points += this.findFlush(hand);
      points += this.findNobs(hand);

      hand.push(this.flipped);
      hand.sort((a,b) => a.toInt() - b.toInt());

      points += this.find15s(hand);
      points += this.findPairs(hand);
      points += this.findRuns(hand);
      points += this.findFlush(hand);

      console.log(`Total Hand Points: ${points}`)
      
      player.score += points;
      player.lastHand = player.hand;
      player.lastScore = points;
    })
  }

  countCrib(){
    let points = 0;
    let hand = this.crib

    //Do flush/nobs first as it doesn't need to be sorted and a card being the flipped one matters
    points += this.findFlush(hand);
    points += this.findNobs(hand);

    hand.push(this.flipped);
    hand.sort((a,b) => a.toInt() - b.toInt());

    points += this.find15s(hand);
    points += this.findPairs(hand);
    points += this.findRuns(hand);
    points += this.findFlush(hand);

    console.log(`Crib Total Points: ${points}`)
    
    this.crib_owner.score += points;
    this.lastCrib = this.crib;
    this.cribScore = points;
  }
  
  //Finds all the 15s in the hand
  find15s(cards: Card[]): number{
    let handValues = cards.map(card => card.toInt(true));
    let points = 0;

    //Checking all combos of 2 or more for the 15s
    for (let size = 2; size <= handValues.length; size++) {
      const combos = this.getCombinations(handValues, size);
      for (const combo of combos){
        if (combo.reduce((sum, val) => sum + val, 0) == 15){
          points += 2;
        }
      }
    }
    console.log(`Points for 15s: ${points}`)
    return points;
  }

  getCombinations(values: number[], size: number): number[][] {
    const result: number[][] = [];
    //Defines the recursion function that will generate all the combos
    const combine = (start: number, curr: number[]) => {
      if (curr.length === size) {
        result.push(curr.slice());
        return;
      }
      for (let i = start; i < values.length; i++) {
        curr.push(values[i]);
        combine(i + 1, curr);
        curr.pop();
      }
    };
    combine(0, []);
    return result;

  }

  findPairs(cards: Card[]): number{
    let handValues = cards.map(card => card.toInt(true));
    const counts = new Map<number, number>();
    let points = 0; 

    //Sorts all the card values into their counts Ex: 3 2s and so on
    for(let value of handValues){
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    //Use those counts to add up pairs Ex: 3 2s -> points = 3 * (3-1) = 6 and so on
    counts.forEach((count, value) => {
      points += count * (count -1);
    })
    console.log(`Points for Pairs: ${points}`)
    return points;
  }  

  findRuns(cards: Card[]): number{
    let handValues = cards.map(card => card.toInt());
    let totalMult = 1;
    let mult = 1;
    let runLength = 1;
    let points = 0;

    for(let i = 0; i < handValues.length; i++){
      if (i + 1 < handValues.length){
        //Check for multiples of a card to times run with later
        if(handValues[i] == handValues[i+1]){
          mult += 1;
        } else {
          //If next card isn't a multiple and mult changed, update the mult count/total
          if(handValues[i] != handValues[i+1] && mult > 1){
            totalMult *= mult;
            mult = 1;
          }

          //Check if next card in array follows a run
          if(handValues[i] + 1 == handValues[i+1]){
            runLength +=1;
          } else{
            //When run breaks, add to points if one actually exists and reset vars
            if (runLength >= 3){
              points += runLength * totalMult;
            }

            totalMult = 1;
            mult = 1;
            runLength = 1;
          }
        }
      }
    }

    //Check if last bit forms a last run
    if(runLength >= 3){
      points += runLength * totalMult;
    }

    console.log(`Points for Runs: ${points}`)
    return points;
  } 

  findFlush(cards: Card[], crib = false): number{

    //Add flipped to the check if it's the crib
    if (crib){
      cards.push(this.flipped)
    }

    const suits = cards.map(card => card.suit);

    //If only one suit was found in the set you have a flush
    if (new Set(suits).size === 1) {
      //check to see if flipped matches to return extra point (dont if crib)
      return this.flipped.suit == suits[0] && !crib ? cards.length + 1 : cards.length;
    }
    return 0;
  } 

  findNobs(cards: Card[]): number{
    const hasNobs = cards.some(card => card.value == 'J' && this.flipped.suit == card.suit)

    return hasNobs ? 1 : 0;
  }
}