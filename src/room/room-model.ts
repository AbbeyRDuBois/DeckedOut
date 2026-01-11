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
  theme: string;
  cardTheme: string;
  hostId?: string;
  [key: string]: any;
};

const DBMap: Record<string, any> = {
    'cribbage': CribbageDatabase
}

export type LeaveRoomResult =
  | { type: 'DELETE_ROOM' }
  | { type: 'LEFT_ROOM'; state: any };
  
export class Room {
  private db!: Database;
  private state: RoomState;
  public events = new EventEmitter<{ stateChanged: RoomState; error: string }>();

  constructor(gameType: string, roomId: string) {
    this.state = { roomId, gameType, players: [], teams: [], started: false, settingsOpen: false, theme: 'dark', cardTheme: 'Classic'};
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

  async closeRoom () {
    await this.db.delete();
  }

  toggleSettings() {
    this.state.settingsOpen = !this.state.settingsOpen;
    this.events.emit('stateChanged', this.getState());
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

  async setTheme(theme: string) {
    this.state.theme = theme;
    this.events.emit('stateChanged', this.getState());
  }

  async setCardTheme(theme: string) {
    this.state.cardTheme = theme;
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

  async leaveRoom(playerId: string): Promise<LeaveRoomResult> {
    if (this.state.started || playerId === this.state.hostId) {
      return { type: 'DELETE_ROOM' };
    }

    // Remove player
    this.state.players = this.state.players.filter(p => p.id !== playerId);

    // Remove from team
    const team = this.state.teams.find(t => t.playerIds.includes(playerId)) as Team;
    team?.removePlayer(playerId);

    return {
      type: 'LEFT_ROOM',
      state: this.state
    };
  }

  async addTeam(team: Team) {
    this.state.teams.push(team);
    await this.db.update({ teams: this.state.teams.map(t => t.toPlainObject()) });
    this.events.emit('stateChanged', this.getState());
  }

  getDbInstance() {
    return this.db;
  }

  //Generic as most (if not all) games at least require 2 people
  enoughPlayers(): boolean {
    if (this.state.players.length < 2){
      return false
    }

    return true
  }
}
