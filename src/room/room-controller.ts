/****************************************************************************
 * 
 *  Room Controller
 * 
 *      Handles the room specific events like starting, leaving
 *      A big part of this is the waiting overlay events where people choose their team/names and game options
 * 
 ****************************************************************************/

import { Room } from "./room-model";
import { RoomView, RoomViewHandlers } from "./room-view";
import { Cribbage } from "../cribbage/cribbage-model";
import { Deck } from "../deck";
import { CribbageController } from "../cribbage/cribbage-controller";
import { Player } from "../player";
import { Team } from "../team";

export class RoomController {
  private resizePending = false;
  private game: Cribbage | undefined;
  private gameController: CribbageController | undefined;

  constructor(private model: Room, private view: RoomView) {
    //Connect the listener handlers to actual functions outlined in the model
    const handlers: RoomViewHandlers = {
      onLeave: async () => { await this.onLeaveRoom(); },
      onCopyId: async () => { await navigator.clipboard.writeText(this.model.getState().roomId); },
      onThemeChange: (theme: string) => {
        this.model.setTheme(theme);
        document.body.setAttribute('data-theme', theme);
      },
      onCardThemeChange: (theme: string) => {
        this.model.setCardTheme(theme);
      },
      onSettingsToggle: () =>  {
        // Toggle and persist settings panel state
        this.model.toggleSettings();
      },
      onRoleChange: async (role: string) => {
        await this.model.updateRole(role);
      }
    };

    this.view.setHandlers(handlers);

    this.model.events.on('stateChanged', (s) => {
      this.view.render(s);
      this.gameController?.gameRerender();
    });
    
    this.model.events.on('error', (msg) => console.error('RoomModel error:', msg));

    // Resizes elements on page when window resizes (throttled with rAF)
    window.addEventListener('resize', () => {
      if (!this.resizePending) {
        this.resizePending = true;
        requestAnimationFrame(() => {
          // Re-render room view (will apply theme, settings panel, options)
          this.view.render(this.model.getState());
          this.gameController?.gameRerender();
          // Let game-specific controllers re-render if they want
          window.dispatchEvent(new CustomEvent('room:resize'));
          this.resizePending = false;
        });
      }
    });
  }

  async init() {
    await this.model.init();
    // Ensure a game instance and controller exist for this room (guest or host)
    await this.gameSetup();
    this.view.render(this.model.getState());
    this.gameController?.gameRerender();
  }

  private async gameSetup() {
    const state = this.model.getState();
    const db = this.model.getDbInstance();
    const remote = await db.pullState();

    if (state.gameType === 'cribbage') {
      // If already setup, skip
      if (this.game) return;

      const players = remote.players.map((p: any) => Player.fromPlainObject(p));
      const teams = remote.teams.map((t: any) => Team.fromPlainObject(t));

      // Default deck - can be changed via game options UI
      const deck = new Deck();
      this.game = new Cribbage(deck, players, teams, db);

      // Make sure DB knows about this game instance so snapshot handling can call guestSetup
      db.setGame(this.game);

      // Wire the shared game view (so room's game view is used)
      const gameView: any = this.view.getGameView();
      this.gameController = new CribbageController((this.game as Cribbage), gameView, db);

      // If remote indicates the game started, run guest setup to populate local game state
      if (remote?.started && !this.game.getStarted()) {
        await this.game.guestSetup(remote);
      }
    }
  }

  async onLeaveRoom() {
    const playerId = localStorage.getItem("playerId")!;
    const db = this.model.getDbInstance();
    this.view.navigateToHome();

    //If the host leaves or if game is started bomb everything
    if (db.isHost() || this.game?.getStarted()){
      db.delete();
    }
    else{
      // Guest tell Host their leaving
      await db.sendAction({
        type: "LEAVE_ROOM",
        playerId
      }); 
    }
  }
}
