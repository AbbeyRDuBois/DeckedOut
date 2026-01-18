/****************************************************************************
 * 
 *  Base Model (Parent of all Games)
 * 
 *      Implements core functionality all games should have to play their game
 *          Basic getters/setters
 *          Player order/teams
 *      Sets/updates the game state as events happen through the game
 *      Emits these new state updates out so controller recieves and does next steps if necessary
 * 
 ****************************************************************************/

import { DocumentData } from "firebase/firestore";
import { EventEmitter } from "../event-emitter";
import { Card } from "../card";
import { CardPlain } from "../types";
import { Deck } from "../deck";
import { Player } from "../player";
import { Team } from "../team";

//Defines event types that can occur in base game
export type BaseEvents = {
  stateChanged: any;
  cardPlayed: number;
  logAdded: string;
  turnChanged: string;
  handStateChanged: { playerId: string; enabled: boolean };
  playRequested: { playerId: string; card: Card };
  gameEnded:{ winner: any; losers?: any[] };
};

export abstract class BaseGame {
  protected deck: Deck;
  protected players: Player[];
  protected teams: Team[] = []
  protected maxPlayers: number = 6;
  protected minPlayers: number = 2;
  protected started: boolean = false;
  protected ended: boolean = false;
  protected currentPlayer: Player = new Player("", "");
  protected isTurn: boolean = false;
  protected logs: string[] = [];
  protected playedOffset: number = -65; //How much the cards cover the past played
  protected events = new EventEmitter<BaseEvents>();

  constructor( deck: Deck, players: Player[], roomId: string){
    this.deck = deck;
    this.players = players;
  }

  abstract start(): void;
  abstract deal(): void;
  abstract guestSetup(data: DocumentData): void;
  abstract cardPlayed(cardId: number): void | Promise<void>;

  //Allows the controller/view to subscribe to event
  on<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.on(event, listener);
  }

  //Allows controller/view to unsubscribe to event
  off<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.off(event, listener);
  }

  updateLocalState(roomData: any){}

  getDeck(): Deck{
    return this.deck;
  }

  setPlayers(players: Player[]) {
    this.players = players;
  }

  getMaxPlayers(){
    return this.maxPlayers;
  }

  getMinPlayers(){
    return this.minPlayers;
  }

  getPlayerById(id: string): Player | undefined{
    return this.players.find(player => player.id === id);
  }

  getStarted() {
    return this.started;
  }
  setStarted(started: boolean) {
    this.started = started;
  }

  getUserPlayer(){
    return this.players.find((p) => p.id === localStorage.getItem('playerId')!)!;
  }

  getOpponents(){
    return this.players.filter(p => p.id !== localStorage.getItem('playerId')!);
  }

  getPlayerOrder(){
    // If no teams exist, preserve players and just shuffle the player order
    if (!this.teams || this.teams.length === 0) {
      this.players = this.shuffle(this.players);
      for (let i = 0; i < this.players.length; i++) {
        this.players[i].setOrder(i);
      }
      return;
    }

    //Randomize Team Order and Player Order in the teams
    this.teams = this.shuffle(this.teams);
    for(let teamIndex = 0; teamIndex < this.teams.length; teamIndex++){
      this.teams[teamIndex].setPlayers(this.shuffle(this.teams[teamIndex].getPlayers()));
    }

    //Cycle through teams adding them to player array in order.
    const newOrder = [];
    let tempTeams = this.teams.map(team => ({players: [...team.getPlayers()]}));
    let stillHasPlayers = true;
    let order = 0;

    while (stillHasPlayers) {
      stillHasPlayers = false;
      for (const team of tempTeams) {
        if (team.players.length > 0) {
          const player = this.getPlayerById(team.players.shift()!)!;
          player.setOrder(order);
          newOrder.push(player);
          stillHasPlayers = true;
          order++;
        }
      }
    }

    this.players = newOrder;
  }

  getCurrentPlayer(){
    return this.currentPlayer;
  }

  getPlayers(){
    return this.players;
  }

  getTeams(): Team[]{
    return this.teams;
  }

  setTeams(teams: Team[]) {
    this.teams = teams;
  }

  getPlayerTeam(playerId: string): Team | null{
    for (let i = 0; i < this.teams.length; i++) {
        const team = this.teams[i];
        if (team.playerIds.findIndex((id: string) => id === playerId) !== -1) {
          return team;
        }
    }
    return null;
  }

  getLogs(): string[]{
    return this.logs;
  }

  addLog(log: string){
    this.logs.push(log);
    this.events.emit('logAdded', log);
    this.events.emit('stateChanged', this.toPlainObject());
  }

  //Have to do this to send the state to Firebase (they only like plain objects)
  toPlainObject() {
    return {
      players: this.players.map(p => p.toPlainObject()),
      teams: this.teams.map(t => t.toPlainObject()),
      deck: this.deck.toPlainObject(),
      currentPlayer: this.currentPlayer.toPlainObject(),
      started: this.started,
      ended: this.ended,
      logs: this.logs
    };
  }

  getFullPlainDeck(): CardPlain[] {
    const deck = new Deck();
    return deck.deck.map(card => ({
      id: card.id,
      suit: card.suit,
      value: card.value,
      isFlipped: true
    }));
  }

  setHandState(player: Player){
    // Model informs that the hand/state should change.
    this.events.emit('handStateChanged', { playerId: player.id, enabled: true });
  }

  //Basic next player, get's overridden by games if needed
  nextPlayer(){
    const index = this.players.findIndex(player => player.id === this.currentPlayer.id);
    this.currentPlayer = this.players[(index + 1) % this.players.length];
    
    this.isTurn = this.currentPlayer.id === localStorage.getItem('playerId');

    // Notify the turn change and new state
    this.events.emit('turnChanged', this.currentPlayer.id);
    this.events.emit('stateChanged', this.toPlainObject());
  }

  findTeamByPlayer(player: Player): Team {
    return this.teams.find(team =>
        team.playerIds.some((id: string) => id === player.id)
    )!;
  }

  //Play card and update state
  playCard(playerId: string, cardId: number) {
    const player = this.players.find((p) => p.id === playerId)!;
    const card = player.hand.find((c: Card) => c.id === cardId)!;

    // remove card from hand and add to played cards
    player.hand = player.hand.filter((c: Card) => c.id !== cardId);
    player.playedCards.push(card);

    this.addLog(`${player.name} played ${card.toHTML()}`);
    this.events.emit('cardPlayed', cardId); //Implemented in the game specific controllers
    this.events.emit('stateChanged', this.toPlainObject());
  }

  //Shuffles the player/team order
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}