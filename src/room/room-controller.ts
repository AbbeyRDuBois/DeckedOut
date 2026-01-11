import { Room } from "./room-model";
import { RoomView, RoomViewHandlers } from "./room-view";

export class RoomController {
  private resizePending = false;

  constructor(private model: Room, private view: RoomView) {
    //Connect the listener handlers to actual functions outlined in the model
    const handlers: RoomViewHandlers = {
      onStart: async () => { await this.onStartGame();},
      onLeave: async () => { await this.onLeaveRoom(); },
      onCopyId: async () => { await navigator.clipboard.writeText(this.model.getState().roomId); },
      onAddTeam: async () => { await this.model.addTeam({ name: `Team ${this.model.getState().teams.length + 1}`, playerIds: [] } as any); },
      onRemoveTeam: async () => { const teams = this.model.getState().teams; if (teams.length > 1) { teams.pop(); await this.model.updateTeams(teams); } },
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
      onThemeChange: async (theme: string) => {
        await this.model.setTheme(theme);
        document.body.setAttribute('data-theme', theme);
      },
      onCardThemeChange: async (theme: string) => {
        await this.model.setCardTheme(theme);
      },
      onSettingsToggle: () =>  {
        // Toggle and persist settings panel state
        this.model.toggleSettings();
      }
    };

    this.view.setHandlers(handlers);

    this.model.events.on('stateChanged', (s) => this.view.render(s));
    this.model.events.on('error', (msg) => console.error('RoomModel error:', msg));

    // Resizes elements on page when window resizes (throttled with rAF)
    window.addEventListener('resize', () => {
      if (!this.resizePending) {
        this.resizePending = true;
        requestAnimationFrame(() => {
          // Re-render room view (will apply theme, settings panel, options)
          this.view.render(this.model.getState());
          // Let game-specific controllers re-render if they want
          window.dispatchEvent(new CustomEvent('room:resize'));
          this.resizePending = false;
        });
      }
    });
  }

  async init() {
    await this.model.init();
    this.view.render(this.model.getState());
  }

  async onLeaveRoom() {
    const playerId = localStorage.getItem('playerId')!;
    const result = await this.model.leaveRoom(playerId);

    if (result.type === 'DELETE_ROOM') {
      await this.model.closeRoom();
      this.view.navigateToHome();
      return;
    }

    this.model.getState().players = result.state.players;
    this.model.updateTeams = result.state.teams;

    this.model.events.on('stateChanged', (s) => this.view.render(s));
    this.view.navigateToHome();
  }

  async onStartGame() {
    if (!this.model.enoughPlayers()){
      alert('Not Enough Players to Start Game.');
      return;
    }
    this.model.startGame();
    this.model.events.on('stateChanged', (s) => this.view.render(s));
  }
}
