// game.ts
import { doc, DocumentData, onSnapshot } from "firebase/firestore";
import { Deck } from "../deck";
import { Player } from "../player";
import { db } from "../authentication";
import { Team } from "../team";

export abstract class BaseGame {
  protected deck: Deck;
  protected players: Player[];
  protected teams: Team[] = [];
  protected roomId: string;
  protected roomRef: any;
  protected maxPlayers: number = 6;
  protected minPlayers: number = 2;
  protected started: boolean = false;
  protected currentPlayer: Player = new Player("", "");
  protected isTurn: boolean = false;

  constructor( deck: Deck, players: Player[], roomId: string){
    this.deck = deck;
    this.players = players;
    this.roomId = roomId;
    this.roomRef = doc(db, "rooms", roomId);
  }

  abstract start(): void;
  abstract render(): void;
  abstract handleAction(data: any): void;
  abstract getState(): any;
  abstract deal(): void;
  abstract guestSetup(data: DocumentData): void;

  deactivateHand(){
    document.getElementById('hand')?.classList.add('hand-disabled');
  }

  activateHand(){
    document.getElementById('hand')?.classList.remove('hand-disabled');
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
    this.players = [];
    const maxPlayers = Math.max(...this.teams.map(team => team.players.length));
    //Want to start out with random team
    const rand = Math.floor(Math.random() * this.teams.length);

    for(let playerIndex = 0; playerIndex < maxPlayers; playerIndex++){
      for(let teamIndex = 0; teamIndex < this.teams.length; teamIndex++){
        const index = (teamIndex + rand) % this.teams.length;
        if (playerIndex < this.teams[index].players.length){
          this.players.push(this.teams[index].players[playerIndex]);
        }
      }
    }
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

  findTeamByPlayer(player: Player): Team {
    return this.teams.find(team =>
        team.players.some(p => p.id === player.id)
    )!;
}
}
