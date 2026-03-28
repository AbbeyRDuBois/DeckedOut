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
import { RoomState } from "../types";

export class Room {
  private db!: Database;
  private state: RoomState;
  public events = new EventEmitter<{ stateChanged: {}; error: string }>();

  constructor(gameType: string, roomId: string) {
    this.state = { roomId, gameType, started: false, settingsOpen: false, theme: 'dark', cardTheme: 'Classic', hostId: ''};
  }

  getState(): RoomState { return { 
    ...this.state
   }; }

  setTheme(theme: string) {
    this.state.theme = theme;
    this.events.emit('stateChanged', this.getState());
  }
  
  setCardTheme(theme: string) {
    this.state.cardTheme = theme;
    this.events.emit('stateChanged', this.getState());
  }

  async findPlayerById(playerId: string): Promise<Player> {
    const state = await this.db.pullState();

    return state.players.find((p: any) => p.id === playerId)!;
  }

  async init() {
    try {
      this.db = new Database();
      await this.db.join("rooms", this.state.roomId);
      this.db.setRoom(this);

      const remote = await this.db.pullState();
      if (!remote) throw new Error("Room not found");
      this.updateLocalState(remote);
      this.db.setupListeners();
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

  getDbInstance() {
    return this.db;
  }

  async updateRole(role: string): Promise<string> {
    const player = await this.findPlayerById(localStorage.getItem("playerId")!);

    var trueColor = role;
    if (role === player.roleColor) trueColor = "lavender";

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

    this.db.addLog(`${player?.name} has become a ${roleName}!`);
    await this.db.update({[`players.${player.id}.roleColor`]: trueColor});
    return roleName;
  }
}
