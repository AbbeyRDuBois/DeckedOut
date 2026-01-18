/****************************************************************************
 * 
 *  Entry Model of DeckedOut
 * 
 *      Handles the nitty gritty of actually joining or creating the room and updates/creates the db accordingly
 * 
 ****************************************************************************/

import { arrayUnion } from "firebase/firestore";
import { v4 } from "uuid";
import { Player } from "../player";
import { Team } from "../team";
import { CribbageDatabase, Database, getDBInstance, setDBInstance } from "../services/databases";

const DBMap: Record<string, any> = {
  cribbage: CribbageDatabase
};

export class EntryModel {
  private db!: Database;

  async createRoom(gameType: string, username: string): Promise<string> {
    const playerId = v4();  //Generates a unique playerId

    // Saves the player's Id and username in storage
    // This helps us be able to tell who is making actions later on in the application
    localStorage.setItem("playerId", playerId);
    localStorage.setItem("username", username);

    const player = new Player(playerId, username);

    setDBInstance(
      await new DBMap[gameType]().init("rooms", {
        hostId: playerId,
        gameType,
        players: [player.toPlainObject()],
        teams: [new Team(player.name, [player.id]).toPlainObject()],
        started: false
      })
    );

    this.db = getDBInstance();
    return this.db.getRoomId();
  }

  //Allows other players to join a pre setup room. Requires them to pass in a roomId and username
  async joinRoom(roomId: string, username: string): Promise<string> {
    const playerId = v4();

    localStorage.setItem("playerId", playerId);
    localStorage.setItem("username", username);

    //Have to connect and set the instance of the host created db
    this.db = new Database();
    await this.db.join("rooms", roomId);
    setDBInstance(this.db);

    const roomData = await this.db.pullState();
    if (!roomData) throw new Error("Room does not exist");
    if (roomData.started) throw new Error("Game already started");

    const players = roomData.players.map((p: any) => Player.fromPlainObject(p));
    if (roomData.maxPlayers === players.length) {
      throw new Error("Game is full");
    }

    const newPlayer = new Player(playerId, username);

    await this.db.update({
      players: arrayUnion(newPlayer.toPlainObject()),
      teams: arrayUnion(new Team(username, [newPlayer.id]).toPlainObject())
    });

    return roomData.gameType;
  }
}