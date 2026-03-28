/****************************************************************************
 * 
 *  Base Model (Parent of all Games)
 * 
 *      Implements core functionality most games should have to play their game
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
import { Database } from "../services/databases";

//Defines event types that can occur in base game
export type BaseEvents = {
  stateChanged: any;
  cardPlayed: number;
  handStateChanged: { playerId: string; enabled: boolean };
  playRequested: { playerId: string; card: Card };
};

export abstract class BaseGame {
  protected deck: Deck;
  protected players: Player[];
  protected teams: Team[] = [];
  protected maxPlayers: number = 6;
  protected minPlayers: number = 2;
  protected started: boolean = false;
  protected ended: boolean = false;
  protected currentPlayer: Player = new Player("", "");
  protected isTurn: boolean = false;
  protected logs: string[] = [];
  protected playedOffset: number = -65; //How much the cards cover the past played
  protected events = new EventEmitter<BaseEvents>();
  protected db: Database;

  constructor( deck: Deck, players: Player[], teams: Team[], db: Database){
    this.deck = deck;
    this.players = players;
    this.teams = teams;
    this.db = db;
  }

  abstract start(): void;
  abstract deal(): void;
  abstract guestSetup(data: DocumentData): void;
  abstract cardPlayed(playerId: string, cardId: number): void | Promise<void>;

  // ----- Basic Getters / Setters -----
  isHost(): boolean{ return this.db.isHost(); }
  getEnded(): boolean { return this.ended; }
  getDeck(): Deck { return this.deck; }
  getMaxPlayers() { return this.maxPlayers; }
  getMinPlayers() { return this.minPlayers; }
  getPlayerById(id: string): Player | undefined { return this.players.find(p => p.id === id); }
  getStarted() { return this.started; }
  setStarted(started: boolean) { this.started = started; }
  getUserPlayer() { return this.players.find((p) => p.id === localStorage.getItem('playerId')!)!; }
  getOpponents() { return this.players.filter(p => p.id !== localStorage.getItem('playerId')!); }
  getCurrentPlayer() { return this.currentPlayer; }
  getPlayers() { return this.players; }
  setPlayers(players: Player[]){
    this.players = players;
  }
  setPlayersFromDB(players: any) {
    this.players = players.map((p:any) => Player.fromPlainObject(p));
    this.players.sort((a, b) => a.getOrder() - b.getOrder());
    this.events.emit('stateChanged', {});
  }
  getPlayer(playerId: string): Player{
    return this.players.find(p => p.id = playerId)!;
  }
  setPlayer(player: Player){
    const index = this.players.findIndex(p => p.id = player.id);
    this.players[index] = player;
  }

  getTeams(): Team[] { return this.teams; }
  setTeams(teams: Team[]){
    this.teams = teams;
  }
  setTeam(team: Team){
    const index = this.teams.findIndex(t => t.id = team.id);
    this.teams[index] = team;
  }
  setTeamsFromDB(teams: any) {
    this.teams = teams.map((t:any) => Team.fromPlainObject(t));
    this.teams.sort((a, b) => a.getOrder() - b.getOrder());
    this.events.emit('stateChanged', {});
  }
  getLogs(): string[] { return this.logs; }
  setLogs(logs: string[]) { 
    this.logs = logs;
    this.events.emit('stateChanged', {}); 
  }

  getPlayerTeam(playerId: string): Team | null {
    return this.teams.find(team => team.playerIds.includes(playerId)) || null;
  }

  getPlayerOrder(){
    // If no teams exist, preserve players and just shuffle the player order
    if (!this.teams || this.teams.length === 0) {
      this.players = this.shuffle(this.players);
      this.players.forEach((p, i) => p.setOrder(i));
      return;
    }

    //Randomize Team Order and Player Order in the teams
    this.teams = this.shuffle(this.teams);
    for (const team of this.teams) {
      team.setPlayers(this.shuffle(team.getPlayers()));
    }

    const newOrder: Player[] = [];
    const tempTeams = this.teams.map(t => ({ players: [...t.getPlayers()] }));
    let stillHasPlayers = true;
    let order = 0;

    while (stillHasPlayers) {
      stillHasPlayers = false;
      for (const t of tempTeams) {
        if (t.players.length > 0) {
          const player = this.getPlayerById(t.players.shift()!)!;
          player.setOrder(order++);
          newOrder.push(player);
          stillHasPlayers = true;
        }
      }
    }

    this.players = newOrder;
  }

    //Allows the controller/view to subscribe to event
  on<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.on(event, listener);
  }

  //Allows controller/view to unsubscribe to event
  off<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.off(event, listener);
  }

  // ----- State Updates -----
  updateLocalState(data: any) {
    this.currentPlayer = data.currentPlayer ? Player.fromPlainObject(data.currentPlayer) : this.currentPlayer;
    this.ended = data.ended ?? false;

    this.events.emit('stateChanged', this.toPlainObject());
  }

  async updateTeam(team: Team){
    if (!this.isHost()) {
      this.updateTeam(team);
      return;
    }
    await this.db.updateTeam(team.toPlainObject());
  }

  updateTeams(teams: Team[]){
    if (!this.isHost()) {
      this.setTeams(teams);
      return;
    }
    teams.forEach(async t => await this.updateTeam(t));
  }

  async updatePlayer(player: Player){
    if(!this.isHost()) {
      this.setPlayer(player);
      return;
    }
    await this.db.updatePlayer(player.toPlainObject());
  }

  updatePlayers(players: Player[]){
    if(!this.isHost()) {
      this.setPlayers(players);
      return;
    }
    players.forEach(async player => await this.updatePlayer(player));
  }


  //Have to do this to send the state to Firebase (they only like plain objects)
  toPlainObject() {
    return {
      players: Object.fromEntries(this.players.map(p => [p.id, p.toPlainObject()])),
      teams: Object.fromEntries(this.teams.map(t => [t.name, t.toPlainObject()])),
      deck: this.deck.toPlainObject(),
      currentPlayer: this.currentPlayer.toPlainObject(),
      started: this.started,
      ended: this.ended
    };
  }

  getFullPlainDeck(): CardPlain[] {
    const deck = new Deck();
    return deck.deck.map(card => ({
      id: card.id,
      suit: card.suit,
      value: card.rank,
      isFlipped: true,
      isPlayed: false
    }));
  }

  setHandState(player: Player){
    // Model informs that the hand/state should change.
    this.events.emit('handStateChanged', { playerId: player.id, enabled: true });
  }

  async nextPlayer(): Promise<any> {
    const index = this.players.findIndex(p => p.id === this.currentPlayer.id);
    this.currentPlayer = this.players[(index + 1) % this.players.length];
    this.isTurn = this.currentPlayer.id === localStorage.getItem("playerId");
    return { currentPlayer: this.currentPlayer.toPlainObject() };
  }

  findTeamByPlayer(player: Player): Team {
    return this.teams.find(team => team.playerIds.includes(player.id))!;
  }

  findPlayerById(playerId: string): Player {
    return this.players.find(p => p.id === playerId)!;
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