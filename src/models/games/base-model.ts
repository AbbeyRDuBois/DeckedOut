import { DocumentData } from "firebase/firestore";
import { EventEmitter } from "../events/event-emitter";
import { Deck } from "../deck";
import { Card } from "../card";
import { Player } from "../player";
import { Team } from "../team";
import { CatSheet, GenshinSheet, HollowSheet, PokemonSheet, SpriteSheet, StarWarsSheet } from "../../spritesheets";


//Defines event types that can occur in base game
type BaseEvents = {
  stateChanged: any;
  cardPlayed: { playerId: string; card: Card };
  logAdded: string;
  turnChanged: string;
  handStateChanged: { playerId: string; enabled: boolean };
  playRequested: { playerId: string; card: Card };
};

export abstract class BaseGame {
  protected deck: Deck;
  protected players: Player[];
  protected teams: Team[] = []
  protected maxPlayers: number = 6;
  protected minPlayers: number = 2;
  protected started: boolean = false;
  protected currentPlayer: Player = new Player("", "");
  protected isTurn: boolean = false;
  protected logs: string[] = [];
  protected playedOffset: number = -65; //How much the cards cover the past played
  protected spriteSheet: SpriteSheet = new SpriteSheet();
  protected events = new EventEmitter<BaseEvents>();

  constructor( deck: Deck, players: Player[], roomId: string){
    this.deck = deck;
    this.players = players;
  }

  abstract start(): void;
  abstract render(): void;
  abstract deal(): void;
  abstract guestSetup(data: DocumentData): void;
  abstract cardClick(card: Card, cardDiv: HTMLDivElement): void;

  //Allows the controller/view to subscribe to event
  on<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.on(event, listener);
  }

  //Allows controller/view to unsubscribe to event
  off<K extends keyof BaseEvents>(event: K, listener: (payload: BaseEvents[K]) => void) {
    this.events.off(event, listener);
  }

  getSpriteSheet(): SpriteSheet{
    return this.spriteSheet;
  }
  
  setSpriteSheet(sheet: string) {
    switch(sheet){
      case "Classic":
        this.spriteSheet = new SpriteSheet();
        break;
      case "Cats":
        this.spriteSheet = new CatSheet();
        break;
      case "StarWars":
        this.spriteSheet = new StarWarsSheet();
        break;
      case "Genshin":
        this.spriteSheet = new GenshinSheet();
        break;
      case "Hollow":
        this.spriteSheet = new HollowSheet();
        break;
      case "Pokemon":
        this.spriteSheet = new PokemonSheet();
        this.spriteSheet.setImage(); //Have to do this to rando the cards you get
        break;
      default:
        this.spriteSheet = new SpriteSheet();
    }
  }
  updateLocalState(roomData: any){}

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

  toPlainObject() {
    return {
      players: this.players.map(p => p.toPlainObject()),
      teams: this.teams.map(t => t.toPlainObject()),
      deck: this.deck.toPlainObject(),
      currentPlayerId: this.currentPlayer?.id ?? null,
      started: this.started,
      logs: this.logs
    };
  }

  toViewState(localPlayerId?: string, revealOpponentHands = false) {
    return {
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        order: p.getOrder?.() ?? p.order,
        hand: (p.id === localPlayerId || revealOpponentHands)
              ? p.hand.map(c => c.toPlainObject())
              : p.hand.map(c => ({ id: c.id })), // minimal placeholder
        playedCards: p.playedCards.map(c => c.toPlainObject())
      })),
      teams: this.teams.map(t => t.toPlainObject()),
      currentPlayerId: this.currentPlayer?.id ?? null,
      logs: this.logs.slice(-100) // cap size for perf
    };
  }

  setHandState(player: Player){
    // Model informs subscribers that the hand/state should change.
    this.events.emit('handStateChanged', { playerId: player.id, enabled: true });
  }

  nextPlayer(){
    const index = this.players.findIndex(player => player.id === this.currentPlayer.id);
    this.currentPlayer = this.players[(index + 1) % this.players.length];
    
    this.isTurn = this.currentPlayer.id === localStorage.getItem('playerId');

    // Notify subscribers of the turn change and new state
    this.events.emit('turnChanged', this.currentPlayer.id);
    this.events.emit('stateChanged', this.toPlainObject());
  }

  createModeSelector(): HTMLDivElement | null {
    return null
  }

  findTeamByPlayer(player: Player): Team {
    return this.teams.find(team =>
        team.playerIds.some((id: string) => id === player.id)
    )!;
  }

  // Legacy helper: UI used to call this with DOM elements. Controllers should call playCardState instead.
  playCard(card: Card) {
    const playerId = localStorage.getItem('playerId')!;
    // Update model state
    this.playCardState(playerId, card.id);
    // Emit an intent for views to animate (views/controllers pick up DOM elements)
    this.events.emit('playRequested', { playerId, card });
  }

  // Pure model operation: change game state (no DOM, no persistence)
  playCardState(playerId: string, cardId: number) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;
    const card = player.hand.find((c: Card) => c.id === cardId);
    if (!card) return;

    // remove card from hand and add to played cards
    player.hand = player.hand.filter((c: Card) => c.id !== cardId);
    player.playedCards = player.playedCards ?? [];
    player.playedCards.push(card);

    this.addLog(`${player.name} played ${card.toHTML()}`);
    this.events.emit('cardPlayed', { playerId, card });
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