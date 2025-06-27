import { DocumentData, getDoc, updateDoc } from "firebase/firestore";
import { renderHand, renderOpponents } from "../room";
import { BaseGame } from "./base-game";
import { Deck } from "../deck";
import { Player } from "../player";

export class Cribbage extends BaseGame {
    point_goal: number = 121; //Number of points to win
    skunk_length: number = 30; //Number of points from skunk line to end -1
    crib_count: number = 4; //Number of cards in crib
    hand_size: number = 4; //Number of cards in a hand after throwing to crib
    throw_count: number = 0; //How many cards each player throws, initialized upon starting game
    throw_away_phase: boolean = true; //True if players still need to throw cards away
    pegging_phase: boolean = false; //True if players are in the pegging phase
    pegging_index: number = 0; //(crib_index + 1) % len(players)
    crib_index: number = 0; //crib_index++ each round. Crib belongs to players[crib_index%len(players)]

    constructor( deck: Deck, players: Player[], roomId: string){
      super(deck, players, roomId);
      this.maxPlayers = 8;

      switch(players.length){
        case 2:
          this.throw_count = 2;
          break;
        case 3 | 4:
          this.throw_count = 1;
          break;
        default: //More than 4 players
          this.throw_count = 1;
          this.crib_count = 8;
          this.point_goal = 241;
          this.skunk_length = 60;
      }

      this.pegging_index = (this.crib_index + 1) % players.length;
    }

    start(): void {
      this.deal();
      this.render();
    }

    async deal(): Promise<void> {
      //Deal 5 cards if 3 or less players, 7 if more
      const cardNum = this.players.length > 3 ? 7 : 5;

      this.players.forEach(player => {
        for(let i = 0; i < cardNum; i++){
          player.hand.push(this.deck.getCard()!);
        }
      })

      await updateDoc(this.roomRef, {
          players: this.players.map(p => p.toPlainObject())
      });
    }

    render(): void {
      const currentId = localStorage.getItem("playerId");
      const user = this.players.find(player => player.id === currentId)!;
      const opponents = this.players.filter(player => player.id !== currentId);

      renderHand(user);
      renderOpponents(opponents);
      this.renderPairs();
    }

    handleAction(data: any): void {
      throw new Error("Method not implemented.");
    }
    getState() {
      throw new Error("Method not implemented.");
    }

    async renderPairs() {
      const count = this.players.length;
      const pairsGrid = document.getElementById('pairsGrid')!;
      //Sets the grid layout based on player count
      if (count <= 4) {
        pairsGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
      } else {
        pairsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
      }

      pairsGrid.innerHTML = '';

      const roomData: DocumentData = (await getDoc(this.roomRef)).data()!;
      
      this.players.forEach(player => {
        const box = document.createElement('div');
        box.className = 'pair-slot';

        box.innerHTML =  `
          <div class="pair-player-name">${player.name}</div>
          <div class="pair-count">${roomData.pairs?.[player.id] ?? ''}</div>
        `;

        pairsGrid.appendChild(box);
      });
    }
}