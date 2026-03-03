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
import { DocumentData, deleteField } from "firebase/firestore";
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

  findPlayerById(playerId: string): Player {
    return this.state.players.find(p => p.id === playerId)!;
  }

  async init() {
    try {
      this.db = new Database();
      await this.db.join("rooms", this.state.roomId);
      this.db.setRoom(this);

      const remote = await this.db.pullState();
      if (!remote) throw new Error("Room not found");

      this.updateLocalState(remote);

      //If Host hasn't processed Guest yet add them on their side in so they can see what's happening
      const localId = localStorage.getItem('playerId');
      const localName = localStorage.getItem('username');
      if (localId && localName) {
        const already = this.state.players.some(p => p.id === localId);
        if (!already) {
          const placeholder = new Player(localId, localName);
          placeholder.setOrder(this.state.players.length);
          this.state.players.push(placeholder);

          // also give them a team so the team rendering code won't break
          const hasTeam = this.state.teams.some(t => t.playerIds.includes(localId));
          if (!hasTeam) {
            const team = new Team(localName, [localId], this.state.teams.length);
            this.state.teams.push(team);
          }

          // notify any listeners that the state has changed
          this.events.emit('stateChanged', this.getState());
        }
      }

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
      // build list from remote content
      const remoteIds = new Set<string>(Object.keys(remote.players));
      const mergedPlayers: Player[] = [];

      for (const [id, player] of Object.entries(remote.players)) {
        mergedPlayers.push(Player.fromPlainObject(player as DocumentData));
      }

      // include any existing local players that the remote doesn't yet know about
      for (const p of this.state.players) {
        if (!remoteIds.has(p.id)) {
          mergedPlayers.push(p);
        }
      }

      mergedPlayers.sort((a, b) => a.order - b.order);
      this.state.players = mergedPlayers;
    }

    if (remote.teams) {
      const mergedTeams: Team[] = [];
      const removedNames = new Set<string>();

      if (Array.isArray(remote.teams)) {
        remote.teams.forEach((t: any) => {
          if (t && typeof t.name === 'string') {
            mergedTeams.push(Team.fromPlainObject(t as DocumentData));
          }
        });
      } else {
        for (const [teamName, teamObj] of Object.entries(remote.teams)) {
          if (teamObj && typeof (teamObj as any).name === 'string') {
            mergedTeams.push(Team.fromPlainObject(teamObj as DocumentData));
          } else {
            removedNames.add(teamName);
          }
        }
      }

      // keep any local teams not mentioned in the patch, but skip ones that were
      // explicitly deleted
      const remoteNames = new Set<string>(mergedTeams.map(t => t.name));
      for (const t of this.state.teams) {
        if (!remoteNames.has(t.name) && !removedNames.has(t.name)) {
          mergedTeams.push(t);
        }
      }

      mergedTeams.sort((a, b) => a.order - b.order);
      this.state.teams = mergedTeams;
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
      this.state.teams.push(team);
      await this.updateTeams(this.state.teams);
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
    const player = this.findPlayerById(localStorage.getItem("playerId")!);

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

    await this.db.update({[`players.${player.id}.roleColor`]: trueColor});
    return roleName;
  }
}
