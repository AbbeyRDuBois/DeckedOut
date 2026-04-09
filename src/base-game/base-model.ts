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

  /******************************************
   * 
   *  Basic Getters/Setters
   * 
   ******************************************/
  isHost(): boolean{ return this.db.isHost(); }
  getEnded(): boolean { return this.ended; }
  getStarted() { return this.started; }
  setStarted(started: boolean) { this.started = started; }
  getLogs(): string[] { return this.logs; }
  setLogs(logs: string[]) { 
    this.logs = logs;
    this.events.emit('stateChanged', {}); 
  }
  setHandState(player: Player){
    // Model informs that the hand/state should change.
    this.events.emit('handStateChanged', { playerId: player.getId(), enabled: true });
  }

  /******************************************
   * 
   *  Player Getters/Setters
   * 
   ******************************************/
  getPlayers() { return this.players; }
  setPlayers(players: Player[]){
    this.players = players;
  }

  setPlayersFromDB(players: any) {
    this.players = players.map((p:any) => Player.fromPlainObject(p));
    this.players.sort((a, b) => a.getOrder() - b.getOrder());
    this.events.emit('stateChanged', {});
  }

  setPlayerFromDB(player: any) {
    const updatedPlayer = Player.fromPlainObject(player);
    const index = this.players.findIndex(p => p.getId() === updatedPlayer.getId());
    if (index !== -1) {
      this.players[index] = updatedPlayer;
    } else {
      this.players.push(updatedPlayer);
    }
    this.players.sort((a, b) => a.getOrder() - b.getOrder());
    this.events.emit('stateChanged', {});
  }

  removePlayerFromDB(playerId: string) {
    this.players = this.players.filter(p => p.getId() !== playerId);
    this.events.emit('stateChanged', {});
  }

  getPlayer(playerId: string): Player{
    return this.players.find(p => p.getId() === playerId)!;
  }
  setPlayerOrder(){
    // If no teams exist, preserve players and just shuffle the player order
    if (!this.teams || this.teams.length === 0) {
      this.players = this.shuffle(this.players);
      this.players.forEach((p, i) => p.setOrder(i));
      return;
    }

    //Randomize Team Order and Player Order in the teams
    this.teams = this.shuffle(this.teams);
    for (const team of this.teams) {
      team.setPlayerIds(this.shuffle(team.getPlayerIds()));
    }

    const newOrder: Player[] = [];
    const tempTeams = this.teams.map(t => ({ players: [...t.getPlayerIds()] }));
    let stillHasPlayers = true;
    let order = 0;

    while (stillHasPlayers) {
      stillHasPlayers = false;
      for (const t of tempTeams) {
        if (t.players.length > 0) {
          const player = this.getPlayer(t.players.shift()!);
          player.setOrder(order++);
          newOrder.push(player);
          stillHasPlayers = true;
        }
      }
    }

    this.players = newOrder;
  }

  /******************************************
   * 
   *  Team Getters/Setters
   * 
   ******************************************/
  getTeams(): Team[] { return this.teams; }
  setTeamsFromDB(teams: any) {
    this.teams = teams.map((t:any) => Team.fromPlainObject(t));
    this.teams.sort((a, b) => a.getOrder() - b.getOrder());
    this.events.emit('stateChanged', {});
  }

  setTeamFromDB(team: any) {
    const updatedTeam = Team.fromPlainObject(team);
    const index = this.teams.findIndex(t => t.getId() === updatedTeam.getId());
    if (index !== -1) {
      this.teams[index] = updatedTeam;
    } else {
      this.teams.push(updatedTeam);
    }
    this.teams.sort((a, b) => a.getOrder() - b.getOrder());
    this.events.emit('stateChanged', {});
  }

  removeTeamFromDB(teamId: string) {
    this.teams = this.teams.filter(t => t.getId() !== teamId);
    this.events.emit('stateChanged', {});
  }

  getPlayerTeam(playerId: string): Team | null {
    return this.teams.find(team => team.getPlayerIds().includes(playerId)) || null;
  }

  //Allows the controller/view to subscribe to event
  on<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.on(event, listener);
  }

  //Allows controller/view to unsubscribe to event
  off<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.off(event, listener);
  }

  /******************************************
   * 
   *  State Updates
   * 
   ******************************************/
  updateLocalState(data: any) {
    this.currentPlayer = data.currentPlayer ? Player.fromPlainObject(data.currentPlayer) : this.currentPlayer;
    this.ended = data.ended ?? false;
    this.events.emit('stateChanged', this.toPlainObject());
  }

  async updateTeam(team: Team){
    if(!this.isHost()) {
      await this.db.sendAction({
          type: "UPDATE_TEAM",
          team: team.toPlainObject()
      });
      return;
    }
    await this.db.updateTeam(team.toPlainObject());
  }

  async updateTeams(teams: Team[]){
    await Promise.all(teams.map(t => this.updateTeam(t)));
  }

  async updatePlayer(player: Player){
    if(!this.isHost()) {
      await this.db.sendAction({
          type: "UPDATE_PLAYER",
          player: player.toPlainObject()
      });
      return;
    }
    await this.db.updatePlayer(player.toPlainObject());
  }

  async updatePlayers(players: Player[]){
    await Promise.all(players.map(player => this.updatePlayer(player)));
  }


  //Have to do this to send the state to Firebase (they only like plain objects)
  toPlainObject() {
    return {
      players: Object.fromEntries(this.players.map(p => [p.getId(), p.toPlainObject()])),
      teams: Object.fromEntries(this.teams.map(t => [t.getName(), t.toPlainObject()])),
      deck: this.deck.toPlainObject(),
      currentPlayer: this.currentPlayer.toPlainObject(),
      started: this.started,
      ended: this.ended
    };
  }

  //For Joker Popup
  getFullPlainDeck(): CardPlain[] {
    const deck = new Deck();
    return deck.getDeck().map(card => ({
      id: card.getId(),
      suit: card.getSuit(),
      rank: card.getRank(),
      flipped: true,
      played: false
    }));
  }

  async nextPlayer(): Promise<any> {
    const index = this.players.findIndex(p => p.getId() === this.currentPlayer.getId());
    this.currentPlayer = this.players[(index + 1) % this.players.length];
    return { currentPlayer: this.currentPlayer.toPlainObject() };
  }

  findTeamByPlayer(player: Player): Team {
    return this.teams.find(team => team.getPlayerIds().includes(player.getId()))!;
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