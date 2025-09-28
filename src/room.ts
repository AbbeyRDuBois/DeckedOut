import { Cribbage } from './games/cribbage';
import { BaseGame } from './games/base-game';
import { Deck } from './deck';
import { deleteDoc, doc, DocumentData, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Player } from './player';
import { db } from './authentication';
import './styles.css'
import { Team } from './team';
import { renderGameOptions } from './room-render';

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId')!;
const gameType = urlParams.get('game')!;

let roomData: DocumentData;
let roomRef:any;
let game: BaseGame;
let players: Player[];
let sharedUILoaded = false;
let teams: Team[];

const gameMap: Record<string, any> = {
    'cribbage': Cribbage,
};

async function getRoomData(roomRef: any): Promise<DocumentData>{
    return (await getDoc(roomRef))?.data()!;
}

async function initRoom() {
  if (!roomId || !gameType || !gameMap[gameType]){
    alert("Invalid room or game");
    return window.location.href = "index.html";
  }
  roomRef = doc(db, "rooms", roomId);
  roomData = (await getDoc(roomRef)).data()!;
  if (!roomData) {
    alert("Room not found.");
    return;
  }

  players = roomData.players.map((player: any) => Player.fromPlainObject(player));
  teams = roomData.teams.map((team: any) => Team.fromPlainObject(team));
  game = new gameMap[gameType]!(new Deck(), players, roomId);
  game.setTeams(teams);

  await updateDoc(roomRef, {
    maxPlayers: game.getMaxPlayers()
  })

  onSnapshot(roomRef, async (docSnap: any) => {
    if (!docSnap.exists()) {
      alert("Room deleted or closed.");
      return window.location.href = "index.html";
    }
    roomData = docSnap.data();
    if (sharedUILoaded && !game.getStarted()) {
      players = roomData.players.map((player: any) => Player.fromPlainObject(player));
      teams = roomData.teams.map((team: any) => Team.fromPlainObject(team));
      game.setTeams(teams);
      game.setPlayers(players);
      handlePopup();
    }
  });

  await loadSharedUI();
  sharedUILoaded = true;

  document.querySelectorAll('.room-id').forEach(info => {
    info.innerHTML = `<div>Room ID: ${roomId}</div>`;
  });

  handlePopup();

  createListeners();
};

async function loadSharedUI(containerId = "room-template") {
  const container = document.getElementById(containerId)!;
  const html = await fetch("shared-ui.html").then(res => res.text());
  container.innerHTML = html;

  await new Promise(requestAnimationFrame); //Waits for the new changes to load onto the page
}

function handlePopup(){
  const started = roomData.started;
  if (!started) {
    document.getElementById("waiting-overlay")!.style.display = "flex";
    updatePlayerList();
    renderGameOptions(gameType, gameMap, game, roomRef);
  } else {
    document.getElementById("waiting-overlay")!.style.display = "none";
    game.guestSetup(roomData);
  }
}

async function exitRoom(playerId: string, players: any, hostId: string) {
  
  if(game.getStarted()){
    await deleteDoc(roomRef);
  }
  else{
    if (playerId === hostId) {
        await deleteDoc(roomRef);
    } else {
        players = players.filter((player: any) => player.id !== playerId);
        game.getPlayerTeam(playerId)?.removePlayer(playerId, game);

        await updateDoc(roomRef, {
          players: players.map((player: any) => player.toPlainObject()),
          teams: teams.map((team: any) => team.toPlainObject())
        });
        return window.location.href = "index.html";
    }
  }
}

async function createListeners(){
  const roomData = await getRoomData(roomRef);

  document.querySelectorAll('.copy-icon').forEach(copy => {
    copy.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(roomId);
      } catch(e){
        console.error("unable to copy to clipboard: ", e);
      }
    });
  });

  document.getElementById("copy-room-id")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(roomId);
  });

  //leave buttons
  document.querySelectorAll('.leave-room').forEach(btn => {
    btn.addEventListener('click', async () => {
      exitRoom(localStorage.getItem("playerId")!, players, roomData.hostId);
    });
  });

  //start
  const start = document.getElementById("start-game");
  start?.addEventListener('click', async () => {
    if (game.getMinPlayers() > players.length){
      alert(`Need ${game.getMinPlayers()} to play the game.`);
      return;
    }
    game.start();
    document.getElementById("waiting-overlay")!.style.display = "none";
  });

  // Listen for theme changes
  const themeSelector = document.getElementById('theme-selector') as HTMLSelectElement;
  const body = document.body;
  themeSelector.addEventListener('change', () => {
    body.setAttribute('data-theme', themeSelector.value);
  });

  // Toggle settings panel open/close
  const settingsToggle = document.getElementById('settings-toggle')!;
  const settingsPanel = document.getElementById('settings-panel')!;
  settingsToggle.addEventListener('click', () => {
    settingsPanel.classList.toggle('closed');
  });
}

function updatePlayerList() {
    const list = document.getElementById('waiting-list')!;
    list.innerHTML = `
      <div class="waiting-list-container">
        <h3 class="waiting-title">Players in room:</h3>
        ${players.map(player => `<div class="player-name">${player.name}</div>`).join('')}
      </div>
    `;
}

window.onload = initRoom;