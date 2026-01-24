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
      onStart: async () => { await this.onStartGame();},
      onLeave: async () => { await this.onLeaveRoom(); },
      onCopyId: async () => { await navigator.clipboard.writeText(this.model.getState().roomId); },
      onAddTeam: async () => { 
        await this.model.addTeam( new Team(`Team ${this.model.getState().teams.length + 1}`, [], 0 ))
      },
      onRemoveTeam: async () => { 
        const teams = this.model.getState().teams; 
        if (teams.length > 1) { 
          var removed = teams.pop(); 

          // Push players from removed team back into remaining teams
          if (removed){
            removed.playerIds.forEach((id, i) => {
              teams[i % teams.length].playerIds.push(id);
            });
          }

          await this.model.updateTeams(teams); 
        } 
      },
      onTeamNameChange: async (idx, name) => { const teams = this.model.getState().teams; teams[idx].name = name; await this.model.updateTeams(teams); },
      onRandomize: async (size) => {
        //Randomizes the teams
        const players = this.model.getState().players.slice();
        const shuffled = players.sort(() => Math.random() - 0.5);
        const newTeams: any[] = [];
        for (let i = 0; i < shuffled.length; i += size) {
          const slice = shuffled.slice(i, i + size);
          newTeams.push({ name: `Team ${newTeams.length + 1}`, playerIds: slice.map(p => p.id) });
        }
        await this.model.updateTeams(newTeams);
      },
      onMovePlayer: async (playerId, fromIndex, toIndex) => {
        const teams = this.model.getState().teams;
        if (!teams[fromIndex] || !teams[toIndex]) return;
        // Remove from source
        teams[fromIndex].playerIds = teams[fromIndex].playerIds.filter((id: string) => id !== playerId);
        // Add to destination
        teams[toIndex].playerIds.push(playerId);
        await this.model.updateTeams(teams);
      },
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
      }
    };

    this.view.setHandlers(handlers);

    this.model.events.on('stateChanged', (s) => {
      this.view.render(s);
      this.gameController?.gameOptions();
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
          this.gameController?.gameOptions();
          this.gameController?.gameRerender();
          // Let game-specific controllers re-render if they want
          window.dispatchEvent(new CustomEvent('room:resize'));
          this.resizePending = false;
        });
      }
    });

    window.addEventListener("beforeunload", async () => {
      const playerId = localStorage.getItem("playerId");
      if (!playerId) return;

      await this.model.getDbInstance().sendAction({
        type: "LEAVE_ROOM",
        playerId
      });
    });
  }

  async init() {
    await this.model.init();
    this.view.render(this.model.getState());

    // Ensure a game instance and controller exist for this room (guest or host)
    await this.setupGameIfNeeded();
  }

  private async setupGameIfNeeded() {
    const state = this.model.getState();
    const db = this.model.getDbInstance();

    if (state.gameType === 'cribbage') {
      // If already setup, skip
      if (this.game) return;

      const players = state.players.map(p => Player.fromPlainObject(p));

      // Default deck - can be changed via game options UI
      const deck = new Deck();
      this.game = new Cribbage(deck, players, state.roomId);

      // Make sure DB knows about this game instance so snapshot handling can call guestSetup
      db.setGame(this.game);

      // Wire the shared game view (so room's game view is used)
      const gameView: any = this.view.getGameView();
      this.gameController = new CribbageController((this.game as Cribbage), gameView, db);

      // If remote indicates the game started, run guest setup to populate local game state
      const remote = await db.pullState();
      if (remote?.started && !this.game.getStarted()) {
        await this.game.guestSetup(remote);
      }
    }
  }

  async onLeaveRoom() {
    const playerId = localStorage.getItem("playerId")!;

    // Tell host you're leaving
    await this.model.getDbInstance().sendAction({
      type: "LEAVE_ROOM",
      playerId
    });
    this.view.navigateToHome();
  }

  async onStartGame() {
    if (!this.model.enoughPlayers()){
      alert('Not Enough Players to Start Game.');
      return;
    }

    if (!this.game?.getStarted()){
      // Start the game model (deal cards, set flipped, etc.) and persist game state
      await this.game?.start();
      
      const gameState = this.game?.toPlainObject()!;
      try {
        await this.model.getDbInstance().update(gameState);
      } catch (e) {
        console.warn('Failed to persist initial game state', e);
      }

      // Mark room as started (this will be observed by guests)
      await this.model.startGame();
    }
  }
}
