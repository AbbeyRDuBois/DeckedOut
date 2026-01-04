import { BaseGame } from "../models/games/base-model";
import { Database } from "../services/databases";
import { BaseView } from "../views/base-view";

// Minimal controller skeleton to show wiring between model -> view -> persistence
export class BaseController {
  constructor(private game: BaseGame, private view: BaseView, private db?: Database) {
    //This subscribes to any events the controller needs to be aware of

    // When model state changes ask view to render using a view-safe snapshot
    this.game.on('stateChanged', () => {
      const localId = localStorage.getItem('playerId') ?? undefined;

      // Persist the canonical game state (use toPlainObject for DB)
      if (this.db) {
        try { this.db.update(this.game.toPlainObject()); } catch (e) { console.warn('DB update failed', e); }
      }

      // Create view-safe snapshot (model may mask opponents' hands by default)
      const viewState = this.game.toViewState();

      // Render the view and wire card clicks back to controller
      const spriteSheet = this.game.getSpriteSheet();
      this.view.render(viewState, localId ?? '', { 
        onCardClick: localId ? cardId => this.onCardClicked(localId, Number(cardId)) : undefined,
        spriteSheet
      });
    });

    // Model wants animation, tell view to animate with plain card data
    this.game.on('playRequested', ({ playerId, card }) => {
      const plainCard = typeof (card as any)?.toPlainObject === 'function' ? (card as any).toPlainObject() : card;
      this.view.animatePlay(playerId, plainCard);
    });

    this.game.on('logAdded', (log) => {
      this.view.renderLog(log);
    });

    this.game.on('handStateChanged', (payload) => {
      this.view.setHandEnabled(payload.playerId, payload.enabled);
    });

    this.game.on('gameEnded', (payload: any) => {
        this.view.renderWinner(payload?.winner, payload?.losers);
    });
  }

  // Called by View when a user clicks a card, Model then is callled to handle it
  onCardClicked(playerId: string, cardId: number) {
    this.game.playCardState(playerId, cardId);
  }
}