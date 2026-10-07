/****************************************************************************
 *
 *  Entry Model of DeckedOut
 *
 *      Handles the nitty gritty of actually joining or creating the room and updates/creates the db accordingly
 *
 ****************************************************************************/
import { v4 } from "uuid";
import { Player } from "../player";
import { Team } from "../team";
import { Database, AchievementDatabase } from "../services/databases";

export class EntryModel {
  private db!: Database;
  private adb!: AchievementDatabase;

  constructor () {
    this.adb = new AchievementDatabase();
    this.showAchievements();
  }

  async createRoom(gameType: string, username: string): Promise<string> {
    const playerId = v4(); //Generates a unique playerId
    // Saves the player's Id in storage
    // This helps us be able to tell who is making actions later on in the application
    localStorage.setItem("playerId", playerId);

    const player = new Player(playerId, username);

    this.db = await new Database().init("rooms", player, {
      hostId: playerId,
      gameType,
      started: false,
    });

    return this.db.getRoomId();
  }

  async joinRoom(roomId: string, username: string) {
    const playerId = v4();

    localStorage.setItem("playerId", playerId);
    localStorage.setItem("username", username);

    // Connect and set DB instance
    this.db = new Database();
    await this.db.join("rooms", roomId);

    // Pull current room state
    const state = await this.db.pullState();
    if (!state) throw new Error("Room does not exist");
    if (state.started) throw new Error("Game already started");

    const players: Player[] = (state.players || []).map((p: any) =>
      Player.fromPlainObject(p),
    );
    const teams = state.teams || [];

    if (state.maxPlayers && players.length >= state.maxPlayers) {
      throw new Error("Game is full");
    }

    if (players.find((p) => p.getName() === username)) {
      throw new Error("Person Already has that Username");
    }

    const player = new Player(playerId, username);
    const team = new Team(player.getName(), [player.getId()], teams.length);

    await this.db.addGuest(player.toPlainObject(), team.toPlainObject());

    return state.gameType;
  }

  //Adds achievements to a new tab
  async showAchievements() {
    if (
          localStorage.getItem("user_id") != null &&
          localStorage.getItem("user_id")!.length > 0
        ) {
          //Init player
          await this.adb.logCurPlayer();

          //Get and show achievements (if any)
          //TODO: Have each player from this.adb.getPlayers() have their own column using this.adb.getCurPlayerAchievements(player) with their name (player) at the top. Also make "Achievements" section scrollable so this works lol
          let achievementData = await this.adb.getCurPlayerAchievements();
          const achievementListElement = document.getElementById("achievement-list") as HTMLUListElement;

          if (achievementData != null) {
            for (let [achievement, data] of Object.entries(achievementData)) {
              let achievementItem = document.createElement("li");
              achievementItem.textContent = `${achievement}\t\t:\t${data}`;
              achievementListElement.appendChild(achievementItem);
            }
    }}
  }
}
