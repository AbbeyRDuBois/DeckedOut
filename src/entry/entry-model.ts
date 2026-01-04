// entry-model.ts
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
    const playerId = v4();

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

  async joinRoom(roomId: string, username: string): Promise<string> {
    const playerId = v4();

    localStorage.setItem("playerId", playerId);
    localStorage.setItem("username", username);

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