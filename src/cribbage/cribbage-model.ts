/****************************************************************************
 * 
 *  Cribbage (Extends Base Game)
 * 
 *      Handles Cribbage specific data and updates
 * 
 ****************************************************************************/

import { DocumentData } from "firebase/firestore";
import { BaseGame } from "../base-game/base-model";
import { Card } from "../card";
import { CardPlain } from "../types";
import { Player } from "../player";
import { Deck, JokerDeck } from "../deck";
import { Database } from "../services/databases";
import { Presentation, ScoringSlide } from "./presentation";
import { Team } from "../team";

export enum RoundState {
  Throwing = "Throwing",
  Pegging = "Pegging",
  Pointing = "Pointing",
  Scoring = "Scoring"
}

export class Cribbage extends BaseGame {
  private pointGoal: number = 121;
  private skunkLength: number = 90;
  private cribCount: number = 4;
  private handSize: number = 4;
  private flipped: Card = new Card(0);
  private crib: Card[] = [];
  private cribOwner: Player = new Player("0", "");
  private roundState: RoundState = RoundState.Throwing;
  private peggingCards: Card[] = [];
  private peggingTotal: number = 0;
  private awaitingJokerSelection: boolean = false;
  private deckMode: string = "Standard";
  private gameMode: string = "Standard";
  private presentation: Presentation = {slides:[], index:0};

  constructor(deck: Deck, players: Player[], teams: Team[], db: Database){
    super(deck, players, teams, db);
    this.maxPlayers = 8;
  }

  /* ----------------------------------------------------- */
  /* Basic getters                                         */
  /* ----------------------------------------------------- */
  setFlipped() { this.flipped = this.deck.getCard()!; }
  getFlipped(): Card { return this.flipped; }
  getCrib(): Card[] { return this.crib; }
  getCribOwner(): Player { return this.cribOwner; }
  getPeggingTotal(): number { return this.peggingTotal; }
  getSkunkLength(): number { return this.skunkLength; }
  getRoundState(): string { return this.roundState; }
  getPointGoal(): number { return this.pointGoal; }
  getGameMode(): string { return this.gameMode; }
  getDeckMode(): string { return this.deckMode; }

  getScoringSlide() {
    const { slides, index } = this.presentation;
    return slides[index];
  }

  setHandState(player: Player){
    if(player.getHand()?.length <= 0) return;

    // Model emits that the hand state should be enabled or disabled; Controller will decide how to present it
    if (this.roundState === RoundState.Pegging && this.currentPlayer.getId() === player.getId()){
      this.events.emit('handStateChanged', { playerId: player.getId(), enabled: true });
    } else if (this.roundState === RoundState.Throwing && player.getHand().length > this.handSize){
      this.events.emit('handStateChanged', { playerId: player.getId(), enabled: true });
    } else {
      this.events.emit('handStateChanged', { playerId: player.getId(), enabled: false });
    }
  }

  //This renders the crib as plain object to help paste it into hand if you have joker
  getCribRenderState(): CardPlain[] {
    return this.crib.map(card => ({
      id: card.getId(),
      rank: card.getRank(),
      suit: card.getSuit(),
      flipped: true,
      played: false
    }));
  }

  async setDeckMode(mode: string) {
    this.deckMode = mode;
    if (mode === 'Joker') {
      this.deck = new JokerDeck();
    } else {
      this.deck = new Deck();
    }
    await this.db.update({
      deckMode: mode,
      deck: this.deck.toPlainObject()
    });
  }

  async setGameMode(mode: string) {
    this.gameMode = mode;

    if(mode == "Standard"){
      this.pointGoal = 121;
      this.skunkLength = 90;
      this.handSize = 4;
    }
    else{
      this.pointGoal = 241
      this.skunkLength = 180;
      this.handSize = 8;
    }

    await this.db.update({
      gameMode: mode,
      pointGoal: this.pointGoal,
      skunkLength: this.skunkLength,
      handSize: this.handSize
    });
  }

  waitingForJoker(): boolean {
    return this.awaitingJokerSelection;
  }

  /******************************************
   * 
   *  State Updates
   * 
   ******************************************/
  override updateLocalState(data: DocumentData): void {
    this.cribOwner = data.cribOwner ? Player.fromPlainObject(data.cribOwner): this.cribOwner;
    this.crib = data.crib?.map((c: any) => new Card(c.id, c.rank, c.suit)) ?? this.crib;
    this.roundState = data.roundState ?? this.roundState;
    this.peggingCards = data.peggingCards?.map((c: any) => new Card(c.id, c.rank, c.suit)) ?? this.peggingCards;
    this.peggingTotal = data.peggingTotal ?? this.peggingTotal;
    this.flipped = data.flipped ? Card.fromPlainObject(data.flipped): this.flipped;
    this.awaitingJokerSelection = data.awaitingJokerSelection ?? this.awaitingJokerSelection;
    this.skunkLength = data.skunkLength ?? this.skunkLength;
    this.handSize = data.handSize ?? this.handSize;
    this.pointGoal = data.pointGoal ?? this.pointGoal;
    this.deckMode = data.deckMode ?? this.deckMode;
    this.gameMode = data.gameMode ?? this.gameMode;
    this.presentation = data.presentation ?? this.presentation;

    // Restore deck with correct type based on deckMode
    if (data.deck) {
      if (this.deckMode === 'Joker') {
        this.deck = JokerDeck.fromPlainObject(data.deck);
      } else {
        this.deck = Deck.fromPlainObject(data.deck);
      }
    }

    super.updateLocalState(data); //Call this last for the stateChange event
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
      deckMode: this.deckMode,
      gameMode: this.gameMode,
      presentation: this.presentation,
      logs: this.logs
    }
  }

  //The beginning of it all!
  async start(): Promise<void> {
    this.teams = this.teams.filter(t => t.getPlayerIds().length > 0);
    this.setPlayerOrder();
    this.cribOwner = this.players[0];
    this.currentPlayer = this.players[1];
    await this.deal();
    this.setFlipped();
    this.roundState = RoundState.Throwing;
    this.started = true;
    await this.updateTeams(this.teams);
    await this.updatePlayers(this.players);

    await this.db.update({
      cribOwner: this.cribOwner.toPlainObject(),
      currentPlayer: this.currentPlayer.toPlainObject(),
      flipped: this.flipped.toPlainObject(),
      roundState: this.roundState,
      started: this.started
    });
  }

  // 2 players get 6 cards, 3+ players get 5 cards and any extra in crib
  async deal(): Promise<void> {
    const cardNum = this.players.length > 2 ? this.handSize + 1 : this.handSize + 2;

    this.players.forEach(player => {
      player.setHand([]);
      player.setPlayedCards([]);

      for(let i=0; i<cardNum; i++){
        player.addToHand(this.deck.getCard()!);
      }
    });

    if(this.players.length === 3){
      this.crib.push(this.deck.getCard()!);
    }
  }

  //Pushes the start of game changes to the other clients
  async guestSetup(data: DocumentData) {
    this.setStarted(true);
    this.updateLocalState(data);
    this.db.listenForLogs();
    this.db.listenForTeams();
    this.db.listenForPlayers();
  }

  // Both Guest and Host run through Logic
  // Guest is for optimistic updates to reduce the feel of lag on their end
  // Host is the only one that actually talks to the database though
  async cardPlayed(playerId: string, cardId: number) {
    const player = this.getPlayer(playerId);
    if (!player) return;

    const cardIndex = player.getHand().findIndex(c => c.getId()=== cardId);
    if (cardIndex === -1) return;

    const card = player.getHand()[cardIndex];

    let changes: any = {};

    if (this.roundState === RoundState.Throwing) {
      player.removeFromHand(cardIndex);

      // Move card to crib
      this.crib.push(card);
      await this.db.addLog(`${player.getName()} has thrown a card to the crib.`);

      changes.crib = this.crib.map(c => c.toPlainObject());

      // If all players have thrown, move to pegging
      if (this.players.every(p => p.getHand().length === this.handSize)) {
        this.roundState = RoundState.Pegging;
        this.flipped.setFlipped(true);
        await this.findNibs();

        changes.roundState = this.roundState;
        changes.flipped = this.flipped.toPlainObject();

        // If the flipped card is a Joker, we must pause pegging until the crib owner selects a replacement
        if (this.flipped.getRank() === 'JK') {
          this.awaitingJokerSelection = true;
          changes.awaitingJokerSelection = true;
        }
      }
    } else {
      // Pegging: if we're waiting for a joker selection, block all plays
      if (this.awaitingJokerSelection) return;

      // play card if legal
      if (this.peggingTotal + card.toInt(true) > 31) return;

      card.setFlipped(true);
      card.setPlayed(true);

      var playedCards = player.getPlayedCards();
      playedCards.push(card);
      player.setPlayedCards(playedCards);

      this.peggingTotal += card.toInt(true);
      this.peggingCards.push(card);

      await this.db.addLog(`${player.getName()} played ${card.toHTML()} for ${this.peggingTotal}.`);

      // Calculate pegging points and assign
      const points = this.calculatePeggingPoints(card);
      if (points > 0) {
        const team = this.findTeamByPlayer(player)!;
        team.addToScore(points);
        player.addToScore(points);
        await this.db.addLog(`${player.getName()} got ${points} points in pegging.`);
        await this.updateTeam(team);
      }

      await this.checkIfWon(player);

      if (!this.ended) {
        await this.nextPlayer();
      }
    }

    changes.currentPlayer = this.currentPlayer.toPlainObject();
    changes.peggingCards = this.peggingCards.map(c => c.toPlainObject());
    changes.peggingTotal =  this.peggingTotal;
    changes.ended = this.ended;

    // Guest sends intent
    if (!this.isHost()) {
      await this.db.sendAction({
        type: "PLAY_CARD",
        playerId,
        cardId
      });
      this.setHandState(player)
    }
    else{
      await this.updatePlayer(player);
      await this.db.update(changes);
    }
    this.events.emit('stateChanged', changes);
}

//Handle a joker being turned into another card
  async applyJokerCard(card: Card, playerId: string) {
    const player = this.getPlayer(playerId);
    if (!player) return;

    // Joker in hand
    if (this.roundState != RoundState.Pointing){
      const playerJoker = player.getHand().findIndex((c: Card) => c.getRank() == "JK");
      if (playerJoker != -1) {
        card.setFlipped(true);

        player.removeFromHand(playerJoker);
        player.addToHand(card);

        this.events.emit('stateChanged', {});
        this.updatePlayer(player);
        this.db.addLog(`${player.getName()} turned their joker into ${card.toHTML()}`);
        return;
      }
    }

    // Joker as flipped card
      if (this.flipped.getRank() == "JK" && this.flipped.getFlipped()) {
      this.flipped = card;
      this.flipped.setFlipped(true);
      // Selection made, unfreeze play
      this.awaitingJokerSelection = false;

      const changes = {
        flipped: this.flipped.toPlainObject(),
        awaitingJokerSelection: this.awaitingJokerSelection
      }

      await this.db.update(changes);
      this.events.emit('stateChanged', {});
      return;
    }

      const cribIndex = this.crib.findIndex(c => c.getRank() === "JK");

      if(cribIndex !== -1){
        this.crib.splice(cribIndex,1);
        this.crib.push(card);

        if (this.roundState === RoundState.Scoring) {
          this.presentation.slides.pop(); //Get rid of last slide
          // Recount crib
          const cribPoints = this.countHand([...this.crib], true);

          //Push on that new slide
          this.presentation.slides.push({
            type: "CRIB",
            dealerId: this.cribOwner.getId(),
            points: cribPoints,
            grandTotal: cribPoints + this.cribOwner.getScore() + this.countHand(this.cribOwner.getHand(), false)
          });

        this.awaitingJokerSelection = false;

        await this.db.update({
          crib: this.crib.map(c => c.toPlainObject()),
          presentation: this.presentation,
          awaitingJokerSelection: this.awaitingJokerSelection
        });

        this.events.emit('stateChanged', {});
        return;
      } else {
        this.awaitingJokerSelection = false;
        await this.db.update({
          crib: this.crib.map(c => c.toPlainObject()),
          awaitingJokerSelection: this.awaitingJokerSelection
        });

        this.events.emit('stateChanged', {});
        return;
      }
    }
  }

  // Counting / scoring and round transitions
  calculatePeggingPoints(card: Card): number {
    let points = 0;
    // Find longest run if enough cards
    if (this.peggingCards.length >= 3) {
      let handValues = this.peggingCards.map(c => c.toInt());
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
      if (card.getRank() == this.peggingCards[i].getRank()) {
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

  async countHands() {
    const currIndex = this.players.findIndex(player => player.getName() == this.cribOwner.getName())!;

    for (let i = 1; i <= this.players.length && !this.ended; i++){
      let player = this.players[(currIndex + i) % this.players.length];
      let hand = [...player.getHand()];
      const points = this.countHand(hand, false);
      this.findTeamByPlayer(player)!.addToScore(points);
      player.addToScore(points);
      await this.db.addLog(`${player.getName()} got ${points} points with hand ${player.getHand().map((card: Card) => card.toHTML())}`);
      await this.checkIfWon(player);
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

    const suitSet = new Set(cards.map(card => card.getSuit()));

    if (this.gameMode == "Mega" && 
      suitSet.size === 2 &&
      ((suitSet.has("Hearts") && suitSet.has("Diamonds")) || (suitSet.has("Clubs") && suitSet.has("Spades")))){
        return suitSet.has(this.flipped.getSuit()) && !crib ? cards.length + 1 : cards.length;
    }

    if (suitSet.size === 1) {
      return suitSet.has(this.flipped.getSuit()) && !crib ? cards.length + 1 : cards.length;
    }
    return 0;
  }

  findNobs(cards: Card[]): number{
    const hasNobs = cards.some(card => card.getRank() == 'J' && this.flipped.getSuit() == card.getSuit())

    return hasNobs ? 1 : 0;
  }

  async findNibs(){
    if (this.flipped.getRank() == "J"){
      const player = this.getPlayer(this.cribOwner.getId());
      const team = this.findTeamByPlayer(player)!;
      team.addToScore(2);
      player.addToScore(2);
      await this.db.addLog(`${player.getName()} got Nibs! +2 points`);
    }
  }

  //If someone won, trigger event to end the game
  async checkIfWon(player: Player){
    let team = this.findTeamByPlayer(player)!;

    if (team.getScore() >= this.pointGoal){
      this.ended = true;
      await this.db.addLog(`${player.getName()} won the game!`);
      await this.updateTeams(this.teams);
      await this.updatePlayers(this.players);
      await this.db.update({
        ended: this.ended
      });
    }
  }

  override async nextPlayer(): Promise<any> {
    if (!this.isHost()) return; // Only host runs this

    const index = this.players.findIndex(p => p.getId() === this.currentPlayer.getId());
    let found = false;

    if (this.peggingTotal !== 31) {
      for (let i = 1; i <= this.players.length && !found; i++) {
        const nextPlayer = this.players[(index + i) % this.players.length];
        const unplayed = nextPlayer.getUnplayedCards();
        if (unplayed?.some(c => c.toInt(true) + this.peggingTotal <= 31)) {
          this.currentPlayer = nextPlayer;
          found = true;
        }
      }
    }

    if (!found) {
      // Last point for previous player
      if (this.peggingTotal !== 31) {
        const player = this.players[index];
        const team = this.findTeamByPlayer(player)!;
        team.addToScore(1);
        player.addToScore(1);
        await this.updateTeam(team);
        await this.db.addLog(`Nobody else could play! ${player.getName()} got the point.`);
      }

      // Check if any cards left
      const hasCardsLeft = this.players.some(p => p.getUnplayedCards().length > 0);
      if (hasCardsLeft) {
        this.resetPegging(index);
        return {
          currentPlayer: this.currentPlayer.toPlainObject(),
          peggingCards: this.peggingCards.map(c => c.toPlainObject()),
          peggingTotal: this.peggingTotal,
        }
      } else {
        await this.endRound();
      }
    }

    return {
      currentPlayer: this.currentPlayer.toPlainObject(),
      peggingCards: this.peggingCards.map(c => c.toPlainObject()),
      peggingTotal: this.peggingTotal
    };
  }

  async nextCribOwner(){
    const playerIndex = this.players.findIndex(player => player.getName() === this.cribOwner.getName());
    this.cribOwner = this.players[(playerIndex + 1) % this.players.length];
    this.currentPlayer = this.players[(playerIndex + 2) % this.players.length];
    await this.db.addLog(`${this.cribOwner.getName()} is the new crib owner.`);
  }

  resetPegging(index: number){
    let found = false;
    //find the next player who has cards to play (start at one to start check at next player)
    for(let i = 1; i <= this.players.length && !found; i++){
      let player = this.players[(index + i) % this.players.length];

      if (player.getUnplayedCards().length > 0){
        this.currentPlayer = player;
        found = true;
      }
    }

    //Reset the pegging values
    this.peggingTotal = 0;
    this.peggingCards = [];
  }

  async endRound() {
    await this.db.addLog(`Flipped Card: ${this.flipped.toHTML()}`);

    //Get all the slides
    const slides = this.createScoringSlides();

    this.roundState = RoundState.Scoring;
    this.presentation = {
      slides,
      index: 0
    };

    await this.updateTeams(this.teams);
    await this.updatePlayers(this.players);

    await this.db.update({
      roundState: this.roundState,
      presentation: this.presentation,
      currentPlayer: this.currentPlayer.toPlainObject(),
      peggingCards: this.peggingCards.map(card => card.toPlainObject()),
      peggingTotal: this.peggingTotal,
      crib: this.crib.map(c => c.toPlainObject())
    });
    return false as any; // pause round progression
  }

  createScoringSlides(): ScoringSlide[] {
    const slides: ScoringSlide[] = [];
    const currIndex = this.players.findIndex(p => p.getId() === this.cribOwner.getId());
    let ownerPoints = 0;

    for (let i = 1; i <= this.players.length; i++) {
      const player = this.players[(currIndex + i) % this.players.length];
      const points = this.countHand([...player.getHand()], false);

      slides.push({
        type: "HAND",
        playerId: player.getId(),
        points,
        grandTotal: points + player.getScore()
      });

      if(player.getId() == this.cribOwner.getId()){
        ownerPoints = points;
      }
    }

    const cribPoints = this.countHand([...this.crib], true);

    slides.push({
      type: "CRIB",
      dealerId: this.cribOwner.getId(),
      points: cribPoints,
      grandTotal: cribPoints + ownerPoints + this.players[currIndex].getScore()
    });

    return slides;
  }

  async advanceScoringPresentation() {
    if (this.roundState !== RoundState.Scoring) return;

    const { slides, index } = this.presentation;

    // If crib has joker pause
    if (this.hasCribJokerInCurrentSlide()) {
      return; // Don't advance, wait for joker selection
    }

    if (index < slides.length - 1) {
      this.presentation.index++;
      await this.db.update({presentation: this.presentation});
      return;
    }

    // Presentation finished
    await this.applyScoringSlides(slides);
    await this.finishRoundAfterScoring();
  }

  async applyScoringSlides(slides: ScoringSlide[]) {
    for (const slide of slides) {
      if (this.ended) return;

      if (slide.type === "HAND") {
        const player = this.getPlayer(slide.playerId);
        const team = this.findTeamByPlayer(player)!;

        team.addToScore(slide.points);
        player.addToScore(slide.points);

        await this.db.addLog(
          `${player.getName()} got ${slide.points} points with hand ${player.getHand().map(c => c.toHTML())}`
        );

        await this.checkIfWon(player);
      }

      if (slide.type === "CRIB") {
        const player = this.getPlayer(slide.dealerId);
        const team = this.findTeamByPlayer(player)!;

        team.addToScore(slide.points);
        player.addToScore(slide.points);

        await this.db.addLog(
          `${player.getName()} got ${slide.points} points with crib ${this.crib.map(c => c.toHTML())}`
        );

        this.crib = [];
        await this.checkIfWon(player);
      }
    }
  }

  hasCribJokerInCurrentSlide(): boolean {
    const slide = this.getScoringSlide();
    if (!slide || slide.type !== "CRIB") return false;
    return this.crib.some(c => c.getRank() === "JK");
  }

  async finishRoundAfterScoring() {
    const cribHasJoker = this.crib.some(c => c.getRank() === "JK");
    if (cribHasJoker) {
      this.roundState = RoundState.Pointing;
      this.awaitingJokerSelection = true;
      await this.db.update({
        awaitingJokerSelection: this.awaitingJokerSelection,
        roundState: this.roundState
      });
      return;
    }

    if (this.ended) return;

    this.crib = [];
    this.deck.resetDeck();
    await this.deal();
    this.setFlipped();

    this.roundState = RoundState.Throwing;
    this.peggingTotal = 0;
    this.peggingCards = [];
    this.presentation = {slides:[], index:0};

    await this.nextCribOwner();
    await this.updateTeams(this.teams);
    this.updatePlayers(this.players);

    await this.db.update({
      currentPlayer: this.currentPlayer.toPlainObject(),
      cribOwner: this.cribOwner.toPlainObject(),
      roundState: this.roundState,
      peggingTotal: this.peggingTotal,
      peggingCards: this.peggingCards.map(card => card.toPlainObject),
      presentation: this.presentation,
      flipped: this.flipped.toPlainObject(),
      crib: this.crib.map(card => card.toPlainObject())
    });
  }
}