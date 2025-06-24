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

  setPlayers(players: Player[]) {
    this.players = players;
  }
}
