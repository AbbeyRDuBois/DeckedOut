import { DocumentData } from "firebase/firestore";
import { Card, Deck } from "../deck";
import { Player } from "../player";
import { Team } from "../team";
import { renderIndicators } from "./game-render";
import { CatSheet, GenshinSheet, HollowSheet, PokemonSheet, SpriteSheet, StarWarsSheet } from "../spritesheets";
import { Database, getDBInstance } from "../databases";

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
  protected db: Database

  constructor( deck: Deck, players: Player[], roomId: string){
    this.deck = deck;
    this.players = players;
    this.db = getDBInstance();
  }

  abstract start(): void;
  abstract render(): void;
  abstract deal(): void;
  abstract guestSetup(data: DocumentData): void;
  abstract cardClick(card: Card, cardDiv: HTMLDivElement): void;

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

  getDB(): Database{
    return this.db;
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
        if (team.playerIds.findIndex(id => id === playerId) !== -1) {
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
  }

  setHandState(player: Player){
    this.activateHand();
  }

  deactivateHand(){
    document.getElementById('hand')?.classList.add('hand-disabled');
  }

  activateHand(){
    document.getElementById('hand')?.classList.remove('hand-disabled');
  }

  nextPlayer(){
    const index = this.players.findIndex(player => player.id === this.currentPlayer.id);
    this.currentPlayer = this.players[(index + 1) % this.players.length];
    
    if (this.currentPlayer.id === localStorage.getItem('playerId')){
      this.isTurn = true;
    }
    else{
      this.isTurn = false;
    }
    renderIndicators(this, [
      {
        name: 'turn',
        isActive: (player) => player.id === this.getCurrentPlayer().id
      }
    ]);
  }

  createIndicators(oppId: string): HTMLDivElement[]{
      const turnIndicator = document.createElement('div');
      turnIndicator.classList.add('indicator');
      turnIndicator.dataset.type = 'turn';
      turnIndicator.innerHTML= "T";
      turnIndicator.id = "turn-indicator-" + oppId;

      return [turnIndicator];
  }

  createModeSelector(): HTMLDivElement | null {
    return null
  }

  findTeamByPlayer(player: Player): Team {
    return this.teams.find(team =>
        team.playerIds.some(id => id === player.id)
    )!;
  }

  playCard(handContainer: HTMLElement, playedContainer: HTMLElement, cardDiv: HTMLDivElement, card: Card) {
    handContainer.removeChild(cardDiv);
    cardDiv.classList.add('played');
    
    playedContainer.appendChild(cardDiv);
    const cards = Array.from(playedContainer.children) as HTMLElement[];

    cards.forEach((card, i) => {
      card.style.left = `${i * this.playedOffset}px`; //Offsets the cards
      card.style.zIndex = `${i}`; //Layers the cards with the earlier ones being farther back and later being upfront
    });

    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
    player.playedCards.push(card);

    //Animation for entry into the played container
    cardDiv.style.opacity = '0';
    cardDiv.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      cardDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease, left 0.3s ease';
      cardDiv.style.opacity = '1';
      cardDiv.style.transform = 'translateY(0)';
    }, 10);
  }

  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
