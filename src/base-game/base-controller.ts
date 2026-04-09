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
import { BaseView, BaseViewHandlers } from "./base-view";
import { Team } from "../team";

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
        this.view.render(gameObject, localId, this.db.getHostId(), cardId => this.onCardPlayed(localId, cardId));
      }
    });


    const handlers: BaseViewHandlers = {
      onStart: async () => { await this.onStartGame();},
      onAddTeam: async () => {
        if(!this.db.isHost()){
          await this.db.sendAction({type: "ADD_TEAM"});
          return;
        }
        const teams = this.game.getTeams();
        if (teams.length < this.game.getPlayers().length) {
          this.game.updateTeam(new Team(`Team ${teams.length + 1}`, [], teams.length));
        }
      },
      onTeamNameChange: async (idx, name) => { 
        const teams = this.game.getTeams();
        teams[idx].setName(name);

        if(!this.db.isHost()){
          await this.db.sendAction({
            type: "UPDATE_NAME",
            name,
            team: teams[idx].toPlainObject()
          });
          return;
        }

        await this.game.updateTeam(teams[idx]); 
      },
      onRemoveTeam: async () => { 
        if(!this.db.isHost()){
          await this.db.sendAction({type: "REMOVE_TEAM"});
          return;
        }
        const teams = this.game.getTeams(); 
        if (teams.length > 1) { 
          const removed = teams.pop()!; 

          // Push players from removed team back into remaining teams
          if (removed){
            removed.getPlayerIds().forEach((id, i) => {
              teams[i % teams.length].addPlayerId(id);
            });
          }

          // make sure teams are in order after removal
          teams.sort((a, b) => a.getOrder() - b.getOrder());
          await this.game.updateTeams(teams);
          this.db.removeTeam(removed.getId());
        } 
      },
      onMovePlayer: async (playerId, fromIndex, toIndex) => {
        const teams = this.game.getTeams();
        if (!teams[fromIndex] || !teams[toIndex]) return;

        if (!this.db.isHost()){
          await this.db.sendAction({
            type: "MOVE_PLAYER",
            playerId,
            fromTeam: teams[fromIndex].toPlainObject(),
            toTeam: teams[toIndex].toPlainObject()
          });
          return;
        }

        // Remove from source
        teams[fromIndex].removePlayerId(playerId);
        // Add to destination
        teams[toIndex].addPlayerId(playerId);

        await this.game.updateTeam(teams[fromIndex]);
        await this.game.updateTeam(teams[toIndex]);
      }
    };
    this.view.setHandlers(handlers);
  }

  abstract onStateChanged() : Promise<void>;
  abstract gameOptions(hostId: string) : any;

  async onStartGame() {
    if (this.game.getPlayers().length < 2){
      alert('Not Enough Players to Start Game.');
      return;
    }

    if (!this.game?.getStarted()){
      // Start the game model (deal cards, set flipped, etc.) and save game state
      await this.game?.start();
    }
  }

  //Need this to trigger rerender to game when changes happen in the room (like changing card theme)
  gameRerender(){
    if (!this.game.getStarted()){
      this.gameOptions(this.db.getHostId());
      const plainTeams = this.game.getTeams().map(t => t.toPlainObject());
      const plainPlayers = this.game.getPlayers().map(p => p.toPlainObject());
      this.view.renderTeams(plainTeams, plainPlayers);
      this.view.renderPlayerList(this.game.getPlayers());
    }

    const localId = localStorage.getItem('playerId')!;
    this.view.render(this.game.toPlainObject(), localId, this.db.getHostId(), cardId => this.onCardPlayed(localId, cardId));
  }

  // Called by View when a user clicks a card, Model then is called to handle it
  async onCardPlayed(localId: string, cardId: number) {
    await this.game.cardPlayed(localId, cardId);
  }
}