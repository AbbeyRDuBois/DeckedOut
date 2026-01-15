import { BaseGame } from "./base-model";
import { Database } from "../services/databases";
import { BaseView } from "./base-view";

export class BaseController {
  private lastRenderedState: any = null

  constructor(private game: BaseGame, private view: BaseView, private db?: Database) {
    //All (this.game.on) define the events the controller calls

    //Updates the DB with the new changes, rerenders the screen
    this.game.on('stateChanged', () => {
      var gameState = game.toPlainObject();

      // Compare with last rendered state to prevent unnecessary renders
      if (this.lastRenderedState && JSON.stringify(this.lastRenderedState) === JSON.stringify(gameState)) {
        return;
      }
      this.lastRenderedState = JSON.parse(JSON.stringify(gameState));

      const localId = localStorage.getItem('playerId')!;

      if (this.db) {
        try { this.db.update(this.game.toPlainObject()); } catch (e) { console.warn('DB update failed', e); }
      }

      const viewState = this.game.toPlainObject();

      // Render the view and set up those cardClicks
      this.view.render(viewState, localId, cardId => this.onCardPlayed(localId, cardId));
    });

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
      this.view.setHandEnabled(payload.enabled);
    });

    //Winner has been found!
    this.game.on('gameEnded', (payload: any) => {
        this.view.renderWinner(payload?.winner, payload?.losers);
    });
  }
    
  // Called by View when a user clicks a card, Model then is called to handle it
  onCardPlayed(playerId: string, cardId: number) {
    this.game.playCard(playerId, cardId);
  }
}