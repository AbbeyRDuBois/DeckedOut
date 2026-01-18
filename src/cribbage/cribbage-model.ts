import { DocumentData } from "firebase/firestore";
import { BaseGame } from "../base-game/base-model";
import { Card } from "../card";
import { CardPlain } from "../types";
import { Player } from "../player";
import { Deck, JokerDeck } from "../deck";
import { Team } from "../team";

export enum RoundState {
  Throwing = "Throwing",
  Pegging = "Pegging",
  Pointing = "Pointing"
}

export type DeckMode = 'Standard' | 'Joker';
export type GameMode = 'Standard' | 'Mega';

export interface CribbageOptions {
  deckMode: DeckMode;
  gameMode: GameMode;
}

export class Cribbage extends BaseGame {
  protected pointGoal: number = 121;
  protected skunkLength: number = 90;
  protected cribCount: number = 4;
  protected handSize: number = 4;
  protected flipped: Card = new Card(0);
  protected crib: Card[] = [];
  protected cribOwner: Player = new Player("0", "");
  protected roundState: RoundState = RoundState.Throwing;
  protected peggingCards: Card[] = [];
  protected peggingTotal: number = 0;
  protected awaitingJokerSelection: boolean = false;
  protected options: CribbageOptions = {
      deckMode: 'Standard',
      gameMode: 'Standard',
    };

  constructor(deck: Deck, players: Player[], roomId: string){
    super(deck, players, roomId);
    this.maxPlayers = 8;
  }

  // --- Basic getter/setup funcitons
  setFlipped() { this.flipped = this.deck.getCard()!; }
  getFlipped(): Card { return this.flipped; }
  getCrib(): Card[] { return this.crib; }
  getCribOwner(): Player { return this.cribOwner; }
  getPeggingTotal(): number { return this.peggingTotal; }
  getSkunkLength(): number { return this.skunkLength; }
  getRoundState(): string { return this.roundState; }

  setIsTurn(turn: boolean){ this.isTurn = turn; }

  setHandState(player: Player){
    // Model emits that the hand state should be enabled or disabled; Controller will decide how to present it
    if (this.roundState === RoundState.Pegging && this.currentPlayer.id === player.id){
      this.events.emit('handStateChanged', { playerId: player.id, enabled: true });
    } else if (this.roundState === RoundState.Throwing && player.hand.length > this.handSize){
      this.events.emit('handStateChanged', { playerId: player.id, enabled: true });
    } else {
      this.events.emit('handStateChanged', { playerId: player.id, enabled: false });
    }
  }

  getGameOptions(): CribbageOptions{
    return this.options;
  }

  //This renders the crib as plain object to help paste it into hand if you have joker
  getCribRenderState(): CardPlain[] {
    return this.crib.map(card => ({
      id: card.id,
      value: card.value,
      suit: card.suit,
      isFlipped: true
    }));
  }

  waitingForJoker(): boolean {
    return this.awaitingJokerSelection;
  }

  override toPlainObject() {
    return{
      ...super.toPlainObject(),
      pointGoal: this.pointGoal,
      skunkLength: this.skunkLength,
      handSize: this.handSize,
      flipped: this.flipped.toPlainObject(),
      crib: this.crib.map(c => c.toPlainObject()),
      cribOwner: this.cribOwner.toPlainObject(),
      roundState: this.roundState,
      peggingCards: this.peggingCards.map(c => c.toPlainObject()),
      peggingTotal: this.peggingTotal,
      awaitingJokerSelection: this.awaitingJokerSelection,
      options: this.options
    }
  }

  //The beginning of it all!
  async start(): Promise<void> {
    this.getPlayerOrder();
    this.cribOwner = this.players[0];
    this.currentPlayer = this.players[1];
    this.deal();
    this.setFlipped();
    this.roundState = RoundState.Throwing;
    this.started = true;
    this.events.emit('stateChanged', this.toPlainObject());
  }

  // 2 players get 6 cards, 3+ players get 5 cards and any extra in crib
  async deal(): Promise<void> {
    const cardNum = this.players.length > 2 ? this.handSize + 1 : this.handSize + 2;

    this.players.forEach(player => {
      player.hand = [];
      for(let i = 0; i < cardNum; i++){
        player.hand.push(this.deck.getCard()!);
      }
      player.playedCards = [];
    })

    if (this.players.length == 3){
      this.crib.push(this.deck.getCard()!);
    }
  }

  //Pushes the start of game changes to the other computers
  async guestSetup(data: DocumentData) {
    this.setStarted(true);
    this.updateLocalState(data);
  }

  //Updates the local state from DB values
  updateLocalState(data: DocumentData): void {
    this.players = [];
    for (const [id, player] of Object.entries(data.players)) {
      this.players.push(Player.fromPlainObject(player as DocumentData));
    }
    this.players.sort((a, b) => a.getOrder() - b.getOrder());

    this.teams = data.teams?.map((team: any) => Team.fromPlainObject(team)) ?? [];
    this.currentPlayer = Player.fromPlainObject(data.currentPlayer);
    this.cribOwner = Player.fromPlainObject(data.cribOwner);
    this.crib = data.crib?.map((c: any) => new Card(c.id, c.value, c.suit)) ?? [];
    this.deck = Deck.fromPlainObject(data.deck);
    this.roundState = data.roundState ?? RoundState.Throwing;
    this.peggingCards = data.peggingCards?.map((c: any) => new Card(c.id, c.value, c.suit)) ?? [];
    this.peggingTotal = data.peggingTotal ?? 0;
    this.flipped = Card.fromPlainObject(data.flipped);
    this.awaitingJokerSelection = data.awaitingJokerSelection ?? false;
    this.logs = data.logs ?? [];
    this.pointGoal = data.pointGoal ?? 121;
    this.skunkLength = data.skunkLength ?? 90;
    this.handSize = data.handSize ?? 4;
    this.options = data.options ?? { deckMode: 'Standard', gameMode: 'Standard',};

    this.events.emit('stateChanged', this.toPlainObject());
  }

  setDeckMode(mode: DeckMode) {
    this.options.deckMode = mode;
    if (mode === 'Joker') {
      this.deck = new JokerDeck();
    } else {
      this.deck = new Deck();
    }
    this.events.emit('stateChanged', this.toPlainObject());
  }

  setGameMode(mode: GameMode) {
    this.options.gameMode = mode;
  }

  getGameMode():string {
    return this.options.gameMode;
  }

  getDeckMode(): string {
    return this.options.deckMode;
  }

  async cardPlayed(cardId: number) {
    const card = (new Deck()).getDeck()[cardId];
    
    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
    if (!player) return;

    if (this.roundState == RoundState.Throwing) {
      // Move card to crib
      const cardIndex = player.hand.findIndex((c: Card) => c.id == card.id);
      if (cardIndex === -1) return;
      player.hand.splice(cardIndex, 1);
      this.crib.push(card);
      this.addLog(`${player.name} has thrown a card to the crib.`);

      //Log if they've thrown all their cards
      if (player.hand.length === this.handSize){
        this.addLog(`${player.name} has thrown all their cards.`);
      }

      // If all players have thrown, move to pegging
      if (this.players.every(p => p.hand.length === this.handSize)){
        this.roundState = RoundState.Pegging;
        this.flipped.isFlipped = true;

        // If the flipped card is a Joker, we must pause pegging until the crib owner selects a replacement
        if (this.flipped.value === 'JK') {
          this.awaitingJokerSelection = true;
        }
      }
    } else {
      // Pegging: if we're waiting for a joker selection, block all plays
      if (this.awaitingJokerSelection) return;

      // play card if legal
      if (this.peggingTotal + card.toInt(true) > 31) return;

      card.isFlipped = true;
      // Move to played
      const player = this.players.find(p => p.id === localStorage.getItem('playerId')!)!;
      const cardIndex = player.hand.findIndex((c: Card) => c.id === card.id);
      if (cardIndex === -1) return;
      player.hand[cardIndex].isFlipped = true; //Opponents can now see played card
      player.playedCards.push(player.hand[cardIndex]); //Put played card into the played container
      this.peggingTotal += card.toInt(true);
      this.peggingCards.push(card);

      this.addLog(`${player.name} played ${card.toHTML()}`);

      // Calculate pegging points and assign
      const points = this.calculatePeggingPoints(card);

      if (points > 0){
        this.findTeamByPlayer(player)!.score += points;
        player.score += points;
        this.addLog(`${player.name} got ${points} points in pegging.`);
      }

      // Check for win
      this.checkIfWon(player);

      if (!this.ended){
        // Advance to next player in pegging sequence
        this.nextPlayer();
      }
    }

    this.events.emit('stateChanged', this.toPlainObject());
  }

//Handle a joker being turned into another card
    async applyJokerCard(card: Card, playerId: string) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    // Joker in hand
    const playerJoker = player.hand.findIndex((c: Card) => c.value == "JK");
    if (playerJoker != -1) {
      player.hand.splice(playerJoker, 1);
      card.isFlipped = true;
      player.hand.push(card);
      this.events.emit('stateChanged', this.toPlainObject());
      return;
    }

    // Joker as flipped card
    if (this.flipped.value == "JK" && this.flipped.isFlipped) {
      this.flipped = card;
      this.flipped.isFlipped = true;
      // Selection made, unfreeze play
      this.awaitingJokerSelection = false;
      this.events.emit('stateChanged', this.toPlainObject());
      return;
    }

    // Joker in crib
    const cribJoker = this.crib.findIndex(c => c.value == "JK");
    if (cribJoker != -1) {
      this.crib.splice(cribJoker, 1);
      this.crib.push(card);
      // Selection made, unfreeze and immediately count the crib
      this.awaitingJokerSelection = false;
      this.events.emit('stateChanged', this.toPlainObject());
      // Now proceed to count crib (this is async)
      this.countCrib();
      return;
    }
  }

  // Counting / scoring and round transitions

  calculatePeggingPoints(card: Card): number {
    let points = 0;
    // Find longest run if enough cards
    if (this.peggingCards.length >= 3) {
      let handValues = this.peggingCards.map(c => c.toInt(true));
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

    for(let i = this.peggingCards.length - 2 ; i >= 0 && !isDone; i--) {
      if (card.value == this.peggingCards[i].value) {
        pairs += 1;
      } else {
        isDone = true;
      }
    }

    if (pairs > 1) {
      points += pairs * (pairs - 1);
    }

    // Check for 15 and 31
    if (this.peggingTotal === 15 || this.peggingTotal === 31) {
      points += 2;
    }

    return points;
  }

  countHands() {
    const currIndex = this.players.findIndex(player => player.name == this.cribOwner.name)!;

    for (let i = 1; i <= this.players.length && !this.ended; i++){
      let player = this.players[(currIndex + i) % this.players.length];
      let hand = [...player.hand];
      const points = this.countHand(hand, false);
      this.findTeamByPlayer(player)!.score += points;
      player.score += points;
      this.addLog(`${player.name} got ${points} points with hand ${player.hand.map((card: Card) => card.toHTML())}`);
      this.checkIfWon(player);
    }
  }

  countHand(hand: Card[], crib: boolean) {
    let points = 0;

    // Flush and nobs first
    points += this.findFlush([...hand], crib);
    points += this.findNobs(hand);

    hand.push(this.flipped);
    hand.sort((a,b) => a.toInt() - b.toInt());

    points += this.find15s(hand);
    points += this.findPairs(hand);
    points += this.findRuns(hand);

    return points;
  }

  countCrib() {
    if (this.ended) return;

    let hand = [...this.crib];
    const points = this.countHand(hand, true);
    const player = this.players.find(player => player.id == this.cribOwner.id)!;

    this.findTeamByPlayer(player)!.score += points;
    player.score += points;
    this.addLog(`${player.name} got ${points} points with crib ${this.crib.map(card => card.toHTML())}`);
    this.crib = [];

    this.checkIfWon(player);
  }

  //Finds all the 15s in the hand
  find15s(cards: Card[]): number{
    let handValues = cards.map(card => card.toInt(true));
    let points = 0;

    for (let size = 2; size <= handValues.length; size++) {
      const combos = this.getCombinations(handValues, size);
      for (const combo of combos){
        if (combo.reduce((sum, val) => sum + val, 0) == 15){
          points += 2;
        }
      }
    }
    return points;
  }

  getCombinations(values: number[], size: number): number[][] {
    const result: number[][] = [];
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
    let handValues = cards.map(card => card.toInt());
    const counts = new Map<number, number>();
    let points = 0;

    for(let value of handValues){
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    counts.forEach((count, value) => {
      points += count * (count -1);
    })
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
        if(handValues[i] == handValues[i+1]){
          mult += 1;
        } else {
          if(handValues[i] != handValues[i+1] && mult > 1){
            totalMult *= mult;
            mult = 1;
          }

          if(handValues[i] + 1 == handValues[i+1]){
            runLength +=1;
          } else{
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

    if(runLength >= 3){
      points += runLength * totalMult;
    }
    return points;
  }

  findFlush(cards: Card[], crib: Boolean): number{
    if (crib){
      cards.push(this.flipped)
    }

    const suitSet = new Set(cards.map(card => card.suit));

    if (this.options.gameMode == "Mega" && 
      suitSet.size === 2 &&
      ((suitSet.has("Hearts") && suitSet.has("Diamonds")) || (suitSet.has("Clubs") && suitSet.has("Spades")))){
        return suitSet.has(this.flipped.suit) && !crib ? cards.length + 1 : cards.length;
    }

    if (suitSet.size === 1) {
      return suitSet.has(this.flipped.suit) && !crib ? cards.length + 1 : cards.length;
    }
    return 0;
  }

  findNobs(cards: Card[]): number{
    const hasNobs = cards.some(card => card.value == 'J' && this.flipped.suit == card.suit)

    return hasNobs ? 1 : 0;
  }

  findNibs(): Record<string, any>{
    let changes: Record<string, any> = {};
    if (this.flipped.value == "J"){
      const player = this.players.find(player => player.name == this.cribOwner.name)!;
      this.findTeamByPlayer(player)!.score += 2;
      player.score += 2;
      this.addLog(`${player.name} got Nibs! +2 points`);
      this.events.emit('stateChanged', this.toPlainObject());
    }

    return changes
  }

  //If someone won, trigger event to end the game
  checkIfWon(player: Player){
    let team = this.findTeamByPlayer(player)!;

    if (team.score >= this.pointGoal){
      this.ended = true;
      const winner = team.toPlainObject();
      const losers = this.teams.filter(team => team.score < this.pointGoal).map(team => team.toPlainObject())
      this.addLog(`${player.name} won the game!`);

      this.events.emit('stateChanged', this.toPlainObject());
      this.events.emit('gameEnded', {winner, losers})
    }
  }

  override nextPlayer(){
    const index = this.players.findIndex(player => player.id === this.currentPlayer.id);
    let found = false;
    let hasCardsLeft = false;

    if (this.peggingTotal !== 31) {
      // Find the next player who has a playable card

      for (let i = 1; i <= this.players.length && !found; i++) {
        const player = this.players[(index + i) % this.players.length];

        const unplayedCards = player.getUnplayedCards();
        if (unplayedCards?.some((card: Card) => card.toInt(true) + this.peggingTotal <= 31)){
          this.currentPlayer = player;
          found = true;
        }
      }
    }
    
    if (!found) {
      // Add in that last point and restart pegging/move to next throw round
      if (this.peggingTotal !== 31){
        this.findTeamByPlayer(this.players[index])!.score += 1;
        this.players[index].score += 1;
        this.addLog(`Nobody else could play! ${this.players[index].name} got the point.`);
      }

      hasCardsLeft = this.players.some(player => player.getUnplayedCards().length > 0);

      if(hasCardsLeft){
        this.resetPegging(index);
      }
      else{
        this.endRound();
      }
    }
  }

  nextCribOwner(){
    const playerIndex = this.players.findIndex(player => player.name === this.cribOwner.name);
    this.cribOwner = this.players[(playerIndex + 1) % this.players.length];
    this.currentPlayer = this.players[(playerIndex + 2) % this.players.length];
    this.addLog(`${this.cribOwner.name} is the new crib owner.`);
  }

  resetPegging(index: number){
    let found = false;
    //find the next player who has cards to play (start at one to start check at next player)
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

  endRound(){
    this.addLog(`Flipped Card: ${this.flipped.toHTML()}`);
    this.countHands();

    // If crib contains Joker we must pause here and ask crib owner to choose a replacement
    const cribHasJoker = this.crib.some(c => c.value === 'JK');
    if (cribHasJoker) {
      this.roundState = RoundState.Pointing;
      this.awaitingJokerSelection = true;
      this.events.emit('stateChanged', this.toPlainObject());
      return false as any; // indicate we paused
    }

    this.countCrib();

    if (this.ended) return;

    this.deck.resetDeck();
    this.deal();
    this.setFlipped();

    this.roundState = RoundState.Throwing;
    this.peggingTotal = 0;
    this.peggingCards = [];
    
    this.nextCribOwner();
  }
}
