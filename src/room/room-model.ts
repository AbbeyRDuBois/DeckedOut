import { EventEmitter } from "../event-emitter";
import { CribbageDatabase, Database } from "../services/databases";
import { Player } from "../player";
import { Team } from "../team";

export type RoomState = {
  roomId: string;
  gameType: string;
  players: Player[];
  teams: Team[];
  started: boolean;
  settingsOpen: boolean;
  hostId?: string;
  [key: string]: any;
};

const DBMap: Record<string, any> = {
    'cribbage': CribbageDatabase
}

export class Room {
  private db!: Database;
  private state: RoomState;
  public events = new EventEmitter<{ stateChanged: RoomState; error: string }>();

  constructor(gameType: string, roomId: string) {
    this.state = { roomId, gameType, players: [], teams: [], started: false, settingsOpen: false};
  }

  async init() {
    try {
      this.db = new DBMap[this.state.gameType]();
      await this.db.join("rooms", this.state.roomId);
      this.db.setRoom(this);

      const remote = await this.db.pullState();
      if (!remote) throw new Error("Room not found");

      this.updateLocalState(remote);

      // Listen for remote updates
      this.db.listenForUpdates();
    } catch (e: any) {
      this.events.emit('error', e.message || String(e));
      throw e;
    }
  }

  toggleSettings() {
    this.state.settingsOpen = !this.state.settingsOpen;
  }

  isSettingsOpen(): boolean {
    return this.state.settingsOpen;
  }

  //Updates state from Database values
  updateLocalState(remote: any) {
    this.state.players = remote.players.map((p: any) => Player.fromPlainObject(p));
    this.state.teams = remote.teams.map((t: any) => Team.fromPlainObject(t));
    this.state.started = remote.started;
    this.state.settingsOpen = remote.settingsOpen;
    this.state.hostId = remote.hostId;
    this.events.emit('stateChanged', this.getState());
  }

  getState(): RoomState {
    return { ...this.state };
  }

  async updateTeams(teams: Team[]) {
    this.state.teams = teams;
    await this.db.update({ teams: teams.map(t => t.toPlainObject()) });
    this.events.emit('stateChanged', this.getState());
  }

  async startGame() {
    this.state.started = true;
    await this.db.update({ started: true });
    this.events.emit('stateChanged', this.getState());
  }

  async leaveRoom(playerId: string) {
    this.state.players = this.state.players.filter(p => p.id !== playerId);
    await this.db.update({ players: this.state.players.map(p => p.toPlainObject()) });
    this.events.emit('stateChanged', this.getState());
  }

  async addTeam(team: Team) {
    this.state.teams.push(team);
    await this.db.update({ teams: this.state.teams.map(t => t.toPlainObject()) });
    this.events.emit('stateChanged', this.getState());
  }

  getDbInstance() {
    return this.db;
  }
}
