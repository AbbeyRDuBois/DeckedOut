// Room.ts
import { Cribbage } from './games/cribbage';
import { BaseGame } from './games/base-game';
import { Deck } from './deck';
import { DocumentData } from 'firebase/firestore';
import { Player } from './player';
import { Team } from './team';
import { renderGameOptions } from './room-render';
import { CribbageDatabase, Database, setDBInstance } from './databases';
import './styles.css';

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId')!;
const gameType = urlParams.get('game')!;

//Loads the room functions
window.onload = async () => {
  const room = new Room(gameType, roomId);
  await room.init();
};

const gameMap: Record<string, any> = {
  'cribbage': Cribbage,
};

const DBMap: Record<string, any> = {
  'cribbage': CribbageDatabase,
};

export class Room {
  roomId: string;
  gameType: string;
  db!: Database;
  game!: BaseGame;
  sharedUILoaded: boolean = false;

  constructor(gameType: string, roomId: string) {
    this.roomId = roomId;
    this.gameType = gameType;
  }

  async init() {
    if (!this.roomId || !this.gameType || !gameMap[this.gameType]) {
      alert("Invalid room or game");
      return window.location.href = "index.html";
    }

    // Initialize database
    this.db = new DBMap[this.gameType]();
    await this.db.join("rooms", this.roomId);
    setDBInstance(this.db);

    this.db.setRoom(this);

    var roomData = await this.db.pullState();
    if (!roomData) {
      alert("Room not found.");
      return;
    }

    // Game setup
    const players = roomData.players.map((p: any) => Player.fromPlainObject(p));
    const teams = roomData.teams.map((t: any) => Team.fromPlainObject(t));
    this.game = new gameMap[this.gameType](new Deck(), players, this.roomId);
    this.game.setPlayers(players);
    this.game.setTeams(teams);
    this.db.setGame(this.game);

    // Start game/room listeners
    this.db.listenForUpdates();
    await this.db.update({ maxPlayers: this.game.getMaxPlayers() });

    // Load shared UI
    await this.loadSharedUI();
    this.sharedUILoaded = true;

    document.querySelectorAll('.room-id').forEach(info => {
      info.innerHTML = `<div>Room ID: ${this.roomId}</div>`;
    });

    this.handlePopup();
    this.createListeners();
  }

  async loadSharedUI(containerId = "room-template") {
    const container = document.getElementById(containerId)!;
    const html = await fetch("shared-ui.html").then(res => res.text());
    container.innerHTML = html;
    await new Promise(requestAnimationFrame); //Waits for the new changes to load onto the page
  }

  getUILoaded(){
    return this.sharedUILoaded;
  }

  async handlePopup() {
    var roomData = await this.db.pullState();
    const started = roomData.started;
    if (!started) {
      document.getElementById("waiting-overlay")!.style.display = "flex";
      this.updatePlayerList();
      renderGameOptions(this.gameType, this.game);
    } else {
      document.getElementById("waiting-overlay")!.style.display = "none";
      this.game.guestSetup(roomData);
    }
  }

  updatePlayerList() {
    const list = document.getElementById('waiting-list')!;
    list.innerHTML = `
      <div class="waiting-list-container">
        <h3 class="waiting-title">Players in room:</h3>
        ${this.game.getPlayers().map(p => `<div class="player-name">${p.name}</div>`).join('')}
      </div>
    `;
  }

  async exitRoom() {
    const playerId = localStorage.getItem("playerId")!;
    const hostId = (await this.db.pullState()).hostId;

    if (this.game.getStarted() || playerId === hostId) {
      await this.db.delete();
    } else {
      this.game.setPlayers(this.game.getPlayers().filter(p => p.id !== playerId));
      this.game.getPlayerTeam(playerId)?.removePlayer(playerId, this.game);

      await this.db.update({
        players: this.game.getPlayers().map(p => p.toPlainObject()),
        teams: this.game.getTeams().map(t => t.toPlainObject())
      });

      window.location.href = "index.html";
    }
  }

  async createListeners() {
    const roomData = await this.db.pullState();

    // Copy room ID
    document.querySelectorAll('.copy-icon').forEach(copy => {
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(this.roomId);
        } catch (e) {
          console.error("Clipboard error:", e);
        }
      });
    });

    document.getElementById("copy-room-id")?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(this.roomId);
    });

    // Leave room
    document.querySelectorAll('.leave-room').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.exitRoom();
      });
    });

    // Start game
    document.getElementById("start-game")?.addEventListener('click', async () => {
      if (this.game.getMinPlayers() > this.game.getPlayers().length) {
        alert(`Need ${this.game.getMinPlayers()} to play the game.`);
        return;
      }
      this.game.start();
      document.getElementById("waiting-overlay")!.style.display = "none";
    });

    // Theme changes
    const themeSelector = document.getElementById('theme-selector') as HTMLSelectElement;
    themeSelector?.addEventListener('change', () => {
      document.body.setAttribute('data-theme', themeSelector.value);
    });

    const cardThemeSelector = document.getElementById('card-theme-selector') as HTMLSelectElement;
    cardThemeSelector?.addEventListener('change', () => {
      this.game.setSpriteSheet(cardThemeSelector.value);
      this.game.render();
    });

    // Settings panel toggle
    const toggle = document.getElementById('settings-toggle')!;
    const panel = document.getElementById('settings-panel')!;
    toggle?.addEventListener('click', () => {
      panel.classList.toggle('closed');
    });
  }
}
