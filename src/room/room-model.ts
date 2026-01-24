/****************************************************************************
 * 
 *  Room Model
 * 
 *      Handles the initialization of room
 *      Handles the roomState that controller/view use to handle events and render
 * 
 ****************************************************************************/

import { EventEmitter } from "../event-emitter";
import { CribbageDatabase, Database } from "../services/databases";
import { Player } from "../player";
import { Team } from "../team";
import { DocumentData } from "firebase/firestore";
import { RoomState } from "../types";

const DBMap: Record<string, any> = {
    'cribbage': CribbageDatabase
}
  
export class Room {
  private db!: Database;
  private state: RoomState;
  public events = new EventEmitter<{ stateChanged: RoomState; error: string }>();

  constructor(gameType: string, roomId: string) {
    this.state = { roomId, gameType, players: [], teams: [], started: false, settingsOpen: false, theme: 'dark', cardTheme: 'Classic', hostId: ''};
  }

  async init() {
    try {
      this.db = new DBMap[this.state.gameType]();
      await this.db.join("rooms", this.state.roomId);
      this.db.setRoom(this);

      const remote = await this.db.pullState();
      if (!remote) throw new Error("Room not found");

      this.updateLocalState(remote);

      this.db.listenForUpdates();
      this.db.listenForActions();

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
    this.state.players = [];
    for (const [id, player] of Object.entries(remote.players)) {
      this.state.players.push(Player.fromPlainObject(player as DocumentData));
    }
    this.state.players.sort((a, b) => a.order - b.order);

    this.state.teams = [];
    for (const [id, team] of Object.entries(remote.teams)) {
      this.state.teams.push(Team.fromPlainObject(team as DocumentData));
    }

    this.state.started = remote.started;
    this.state.settingsOpen = remote.settingsOpen;
    this.state.hostId = remote.hostId;
    this.events.emit('stateChanged', this.getState());
  }

  setTheme(theme: string) {
    this.state.theme = theme;
    this.events.emit('stateChanged', this.getState());
  }

  setCardTheme(theme: string) {
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

  async addTeam(team: Team) {
    if (this.state.teams.length < this.state.players.length) {
      this.state.teams.push(team);
      this.updateTeams(this.state.teams);
    }
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
