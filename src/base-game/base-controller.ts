import { BaseGame } from "./base-model";
import { Database } from "../services/databases";
import { BaseView } from "./base-view";

export abstract class BaseController<
  TGame extends BaseGame,
  TView extends BaseView
> {
  private lastRenderedState: any = null;

  constructor(protected game: TGame, protected view: TView, protected db: Database) {
    //All (this.game.on) define the events the controller calls

    // Re-render when room triggers a resize (throttled by RoomController)
    window.addEventListener('room:resize', async () => await this.onStateChanged());

    //Event to trigger an animation
    this.game.on('playRequested', ({ playerId, card }) => {
      const plainCard = card.toPlainObject();
      this.view.animatePlay(playerId, plainCard);
    });

    //Adding Logs!!!!
    this.game.on('logAdded', (log) => {
      this.view.renderLog(log);
    });

    //Enable/Disable player hand
    this.game.on('handStateChanged', (payload) => {
      const localId = localStorage.getItem('playerId')!;
      if (payload.playerId === localId) {
        this.view.setHandEnabled(payload.enabled);
      }
    });

    //Winner has been found!
    this.game.on('gameEnded', (payload: any) => {
        this.view.renderWinner(payload?.winner, payload?.losers);
    });

    this.game.on('stateChanged', async () => {
      var gameState = game.toPlainObject();

      // Compare with last rendered state to prevent unnecessary renders
      if (this.lastRenderedState && JSON.stringify(this.lastRenderedState) === JSON.stringify(gameState)) {
        return;
      }
      
      this.lastRenderedState = JSON.parse(JSON.stringify(gameState));

      const localId = localStorage.getItem('playerId')!;

      await this.onStateChanged();

      if (this.db) {
        try { this.db.update(this.game.toPlainObject()); } catch (e) { console.warn('DB update failed', e); }
      }

      const viewState = this.game.toPlainObject();

      // Render the view and set up those cardClicks
      this.view.render(viewState, localId, cardId => this.onCardPlayed(cardId));
    });
  }
    
  // Called by View when a user clicks a card, Model then is called to handle it
  async onCardPlayed(cardId: number) {
    await this.game.cardPlayed(cardId);
  }

  abstract onStateChanged() : Promise<void>;
}