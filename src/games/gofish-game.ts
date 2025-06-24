import { updateDoc } from "firebase/firestore";
import { renderHand, renderOpponents } from "../room";
import { BaseGame } from "./base-game";

export class Gofish extends BaseGame {

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
    }

    handleAction(data: any): void {
      throw new Error("Method not implemented.");
    }
    getState() {
      throw new Error("Method not implemented.");
    }
}