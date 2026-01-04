import { Room } from "../models/room-model";
import { RoomView, RoomViewHandlers } from "../views/room-view";

export class RoomController {
  constructor(private model: Room, private view: RoomView, private dbCtor: any) {
    // Wire view handlers back to model actions
    const handlers: RoomViewHandlers = {
      onStart: async () => { await this.model.startGame(); },
      onLeave: async () => { const pid = localStorage.getItem('playerId')!; await this.model.leaveRoom(pid); },
      onCopyId: async () => { await navigator.clipboard.writeText(this.model.getState().roomId); },
      onAddTeam: async () => { await this.model.addTeam({ name: `Team ${this.model.getState().teams.length + 1}`, playerIds: [] } as any); },
      onRemoveTeam: async () => { const teams = this.model.getState().teams; if (teams.length > 1) { teams.pop(); await this.model.updateTeams(teams); } },
      onTeamNameChange: async (idx, name) => { const teams = this.model.getState().teams; teams[idx].name = name; await this.model.updateTeams(teams); },
      onRandomize: async (size) => {
        // basic randomize implementation
        const players = this.model.getState().players.slice();
        const shuffled = players.sort(() => Math.random() - 0.5);
        const newTeams: any[] = [];
        for (let i = 0; i < shuffled.length; i += size) {
          const slice = shuffled.slice(i, i + size);
          newTeams.push({ name: `Team ${newTeams.length + 1}`, playerIds: slice.map(p => p.id) });
        }
        await this.model.setTeamsFromShuffle(newTeams as any);
      }
    };

    this.view.setHandlers(handlers);

    this.model.events.on('stateChanged', (s) => this.view.render(s));
    this.model.events.on('error', (msg) => console.error('RoomModel error:', msg));
  }

  async init() {
    await this.model.init(this.dbCtor);
    this.view.render(this.model.getState());
  }
}
