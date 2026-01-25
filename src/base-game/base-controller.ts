/****************************************************************************
 * 
 *  Base Controller (Parent of all game Controllers)
 * 
 *      Recieves events emitted from game models and implements the functionality
 *      Informs the view to render things based on models updates as necessary
 *      Implements core functionality all game controllers should have to play their game
 * 
 ****************************************************************************/

import { BaseGame } from "./base-model";
import { Database } from "../services/databases";
import { BaseView } from "./base-view";

export abstract class BaseController<
  TGame extends BaseGame,
  TView extends BaseView
> {

  constructor(protected game: TGame, protected view: TView, protected db: Database) {
    //All (this.game.on) define the events that were emitted from the model

    // Re-render when room triggers a resize (throttled by RoomController)
    window.addEventListener('room:resize', async () => await this.onStateChanged());

    //Event to trigger an animation
    this.game.on('playRequested', ({ playerId, card }) => {
      const plainCard = card.toPlainObject();
      this.view.animatePlay(playerId, plainCard);
    });

    //Enable/Disable player hand
    this.game.on('handStateChanged', (payload) => {
      const localId = localStorage.getItem('playerId')!;
      if (payload.playerId === localId) {
        this.view.setHandEnabled(payload.enabled);
      }
    });
    //Basic stateChange, basically updates the db and rerenders. Calls the onStateChange() for specific game logic.
    this.game.on('stateChanged', async () => {
      await this.onStateChanged();

      if (!this.game.getStarted()){
        let gameObject = this.game.toPlainObject();
        const localId = localStorage.getItem('playerId')!;
        // Render the view and set up those cardClicks
        this.view.render(gameObject, localId, cardId => this.onCardPlayed(localId, cardId));
      }
    });
  }

  abstract onStateChanged() : Promise<void>;
  abstract gameOptions() : any;
  
  //Need this to trigger rerender to game when changes happen in the room (like changing card theme)
  gameRerender(){
    const localId = localStorage.getItem('playerId')!;
    this.view.render(this.game.toPlainObject(), localId, cardId => this.onCardPlayed(localId, cardId));
  }

  // Called by View when a user clicks a card, Model then is called to handle it
  async onCardPlayed(localId: string, cardId: number) {
    await this.game.cardPlayed(localId, cardId);
  }
}