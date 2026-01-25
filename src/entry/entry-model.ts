/****************************************************************************
 * 
 *  Entry Model of DeckedOut
 * 
 *      Handles the nitty gritty of actually joining or creating the room and updates/creates the db accordingly
 * 
 ****************************************************************************/

import { DocumentData } from "firebase/firestore";
import { v4 } from "uuid";
import { Player } from "../player";
import { Team } from "../team";
import { Database, getDBInstance, setDBInstance } from "../services/databases";

export class EntryModel {
  private db!: Database;

  async createRoom(gameType: string, username: string): Promise<string> {
    const playerId = v4();  //Generates a unique playerId

    // Saves the player's Id in storage
    // This helps us be able to tell who is making actions later on in the application
    localStorage.setItem("playerId", playerId);

    const player = new Player(playerId, username);

    setDBInstance(
      await new Database().init("rooms", {
        hostId: playerId,
        gameType,
        players: { [playerId]: player.toPlainObject() },
        teams: {[username]: new Team(player.name, [player.id], 0).toPlainObject()},
        started: false
      })
    );

    this.db = getDBInstance();
    return this.db.getRoomId();
  }

  async joinRoom(roomId: string, username: string) {
    const playerId = v4();

    localStorage.setItem("playerId", playerId);
    localStorage.setItem("username", username);

    // Connect and set DB instance
    this.db = new Database();
    await this.db.join("rooms", roomId);
    setDBInstance(this.db);

    // Pull current room state
    const roomData = await this.db.pullState();
    if (!roomData) throw new Error("Room does not exist");
    if (roomData.started) throw new Error("Game already started");

    const players: Player[] = Object.entries(roomData.players || {}).map(([id, p]) =>
      Player.fromPlainObject(p as DocumentData)
    );

    if (roomData.maxPlayers && players.length >= roomData.maxPlayers) {
        throw new Error("Game is full");
    }

    // Create a local player object
    const newPlayer = new Player(playerId, username);

    // Update the local Room state immediately
    if (this.db.room) {
        // Add to players
        players.push(newPlayer);
        this.db.room.getState().players = players;

        // Add to a team (or create a new one)
        const newTeam = new Team(username, [playerId], this.db.room.getState().teams.length);        
        this.db.room.getState().teams.push(newTeam);

        // Emit stateChanged immediately so UI updates
        this.db.events.emit("stateChanged", this.db.room.getState());
    }

    // Notify the host
    await this.db.sendAction({
        type: "JOIN_ROOM",
        playerId,
        name: username
    });

    return roomData.gameType;
  }
}