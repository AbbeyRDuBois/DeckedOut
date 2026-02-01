/****************************************************************************
 * 
 *  Room Model
 * 
 *      Handles the initialization of room
 *      Handles the roomState that controller/view use to handle events and render
 * 
 ****************************************************************************/

import { EventEmitter } from "../event-emitter";
import { Database } from "../services/databases";
import { Player } from "../player";
import { Team } from "../team";
import { DocumentData } from "firebase/firestore";
import { RoomState } from "../types";

export class Room {
  private db!: Database;
  private state: RoomState;
  public events = new EventEmitter<{ stateChanged: {}; error: string }>();

  constructor(gameType: string, roomId: string) {
    this.state = { roomId, gameType, players: [], teams: [], started: false, settingsOpen: false, theme: 'dark', cardTheme: 'Classic', hostId: ''};
  }

  getState(): RoomState { return { ...this.state }; }

  setTheme(theme: string) {
    this.state.theme = theme;
    this.events.emit('stateChanged', this.getState());
  }
  
  setCardTheme(theme: string) {
    this.state.cardTheme = theme;
    this.events.emit('stateChanged', this.getState());
  }

  async init() {
    try {
      this.db = new Database();
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
    if (remote.players) {
      const nextPlayers: Player[] = [];

      for (const [id, player] of Object.entries(remote.players)) {
        nextPlayers.push(Player.fromPlainObject(player as DocumentData));
      }

      nextPlayers.sort((a, b) => a.order - b.order);
      this.state.players = nextPlayers;
    }

    if (remote.teams) {
      const nextTeams: Team[] = [];

      for (const [, team] of Object.entries(remote.teams)) {
        nextTeams.push(Team.fromPlainObject(team as DocumentData));
      }
      nextTeams.sort((a, b) => a.order - b.order);
      this.state.teams = nextTeams;
    }

    if (typeof remote.started === 'boolean') {
      this.state.started = remote.started;
    }

    if (typeof remote.settingsOpen === 'boolean') {
      this.state.settingsOpen = remote.settingsOpen;
    }

    if (typeof remote.hostId === 'string') {
      this.state.hostId = remote.hostId;
    }

    this.events.emit('stateChanged', this.getState());
  }

  async updateTeams(teams: Team[]) {
    await this.db.update({ teams: teams.map(t => t.toPlainObject()) });
  }

  async startGame() {
    await this.db.update({ started: true });
  }

  async addTeam(team: Team) {
    if (this.state.teams.length < this.state.players.length) {
      await this.db.update({
        [`teams.${team.name}`]: team.toPlainObject()
      });
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

  async updateRole(role: string): Promise<string> {
    const player = this.state.players.find(p => p.id === localStorage.getItem('playerId')!)!;

    var trueColor = role;
    if (role === player.roleColor) trueColor = "darkorchid";


    var roleName = "";
    switch (trueColor){
      case "teal":
        roleName = "Garbage Man";
        break;
      case "lightgreen":
        roleName = "Dumpster Boy";
        break;
      case "orange":
        roleName = "Glamour Girl";
        break;
      case "tomato":
        roleName = "Treasure Lady";
        break;
      default:
        roleName = "Neutral";
        break;
    }

    await this.db.update({[`players.${player.id}.roleColor`]: trueColor});
    return roleName;
  }
}
