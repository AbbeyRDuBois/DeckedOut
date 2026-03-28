/****************************************************************************
 * 
 *  Entry Model of DeckedOut
 * 
 *      Handles the nitty gritty of actually joining or creating the room and updates/creates the db accordingly
 * 
 ****************************************************************************/
import { v4 } from "uuid";
import { Player } from "../player";
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
      await new Database().init("rooms", player, {
        hostId: playerId,
        gameType,
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
    const state = await this.db.pullState();
    if (!state) throw new Error("Room does not exist");
    if (state.started) throw new Error("Game already started");

    const players: Player[] = state.players.map((p:any) => Player.fromPlainObject(p));

    if (state.maxPlayers && players.length >= state.maxPlayers) {
      throw new Error("Game is full");
    }

    if (players.find(p => p.name === username)){
      throw new Error("Person Already has that Username");
    }
    
    // Notify the host
    await this.db.sendAction({
        type: "JOIN_ROOM",
        playerId,
        name: username
    });

    return state.gameType;
  }
}