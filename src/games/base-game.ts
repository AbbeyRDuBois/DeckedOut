// game.ts
import { doc } from "firebase/firestore";
import { Deck } from "../deck";
import { Player } from "../player";
import { db } from "../authentication";

export abstract class BaseGame {
  protected deck: Deck;
  protected players: Player[];
  protected roomId: string;
  protected roomRef: any;
  protected maxPlayers: number = 6;
  protected minPlayers: number = 2;
  protected started: boolean = false;

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

  getUserPlayer(){
    return this.players.find((p) => p.id === localStorage.getItem('playerId')!)!;
  }

  getOpponents(){
    return this.players.filter(p => p.id !== localStorage.getItem('playerId')!);
  }
}
