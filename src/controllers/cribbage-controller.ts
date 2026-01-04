import { Cribbage } from "../models/games/cribbage-model";
import { CribbageView } from "../views/cribbage-view";
import { Database } from "../services/databases";

export class CribbageController {
  constructor(private game: Cribbage, private view: CribbageView, private db?: Database) {
    this.game.on('stateChanged', () => this.onStateChanged());

    this.game.on('playRequested', ({ playerId, card }) => {
      const plain = typeof (card as any)?.toPlainObject === 'function' ? (card as any).toPlainObject() : card;
      view.animatePlay(playerId, plain);
    });

    this.game.on('logAdded', (log) => this.view.renderLog(log));
  }

  private onStateChanged() {
    const localId = localStorage.getItem('playerId')!;

    // Persist canonical state
    if (this.db) {
      try { this.db.update((this.game as any).toPlainObject()); } catch (e) { console.warn('DB update failed', e); }
    }

    // Render view with view-safe snapshot and sprite sheet
    const viewState = this.game.toViewState();
    const spriteSheet = this.game.getSpriteSheet();

    this.view.render(viewState, localId, { onCardClick: (cardId) => this.onCardClicked(cardId), spriteSheet });

    // Trigger cribbage-specific UI flows
    // If local player has a JK in hand, prompt for selection via crib view
    if (localId) {
      const localPlayer = viewState.players.find((p: any) => p.id === localId);
      if (localPlayer && localPlayer.hand.some((c: any) => c?.value === 'JK')) {
          this.view.renderJokerPopup(this.game).then((choice: any) => {
              this.game.jokerCardClick(choice, localId);
          });
        }
    }
  }

  // Called by view when a user interacts with a card
  onCardClicked(cardId: number) {
    this.game.cardClick(new (this.game as any).deck.deck.find((c: any) => c.id === cardId) as any);
  }
}
