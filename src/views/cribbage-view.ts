import { Deck } from "../models/deck";
import { BaseView } from "./base-view";
import { Card } from "../models/card";
import { Cribbage } from "../models/games/cribbage-model";

export class CribbageView extends BaseView {
  renderPeggingTotal(game: Cribbage){
    const peggingTotal = document.getElementById('peggingTotal')!;
    peggingTotal.innerHTML = `${game.getPeggingTotal()}`;
  }

  renderFlipped(game: Cribbage){
    const flippedDiv = document.getElementById("flipped")!;
    flippedDiv.innerHTML = '';
    flippedDiv.appendChild(this.createCardElement(game.getFlipped(), game.getSpriteSheet(), { container: flippedDiv } as any));
  }

  // Call to render the card-select popup for when a joker is available in cribbage
  renderJokerPopup(game: Cribbage): Promise<Card> {
    return new Promise((resolve) => {
      document.getElementById("joker-overlay")!.style.display = "flex";
      const rows = document.getElementById("joker-popup")!.children;

      for(let i = 0; i < 4; i++){
        rows.item(i)!.innerHTML = "";
      }

      const newDeck = new Deck()
      const options: any = {
        startsFlipped: true,
        clickable: true,
        container: rows.item(0)! as HTMLElement,
        onClick: async (card: Card) => {
            await (game as any).jokerCardClick?.(card);
            resolve(card); // Resolve the Promise once the joker has been chosen
          }
      }

      newDeck.deck.forEach((card: Card, index)=> {
        const cardDiv = this.createCardElement(card, game.getSpriteSheet(), options);
        rows.item(Math.floor(index / 13))?.appendChild(cardDiv); // Add button to grid
      });
    });
  }

  renderCribAsHand(game: Cribbage){
    const handContainer = document.getElementById("hand")!;
    handContainer.innerHTML = "";
    game.getCrib().forEach((card: Card) => {
      handContainer.appendChild(this.createCardElement(card, game.getSpriteSheet(), { startsFlipped: true, clickable: false } as any));
    });
  }
}
