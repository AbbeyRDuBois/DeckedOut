import { Gofish } from './games/gofish-game';
import { BaseGame } from './games/base-game';
import { Card, Deck } from './deck';
import { loadSharedUI, rebuildPlayer } from './utils';
import { deleteDoc, doc, DocumentData, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Player } from './player';
import { db } from './authentication';
import './styles.css'

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId')!;
const gameType = urlParams.get('game')!;

let roomData: DocumentData;
let roomRef:any;
let game: BaseGame;
let players: Player[];
let sharedUILoaded = false;

const MINUTE = 60 * 1000;
const TIMEOUT_CLOSE = 30;
const TIMEOUT_WARNING = 25;
let WARNING_SHOWN = false;

const gameMap: Record<string, any> = {
    'gofish': Gofish,
};

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
  players = roomData.players.map((player: any) => rebuildPlayer(player))
  game = new gameMap[gameType]!(new Deck(), players, roomId);

  await updateDoc(roomRef, {
    maxPlayers: game.getMaxPlayers()
  })

  onSnapshot(roomRef, (docSnap: any) => {
    if (!docSnap.exists()) {
      alert("Room deleted or closed.");
      return window.location.href = "index.html";
    }

    roomData = docSnap.data();
    game.setPlayers(players);

    if (sharedUILoaded) {
      handlePopup();
    }
  });

  await loadSharedUI();
  sharedUILoaded = true;

  document.querySelectorAll('.room-id').forEach(info => {
    info.innerHTML = `<div>Room ID: ${roomId}</div>`;
  });

  game.render();
  handlePopup();

  createListeners();
};

function handlePopup(){
  const started = roomData.started;
  players = roomData.players.map((p: any) => rebuildPlayer(p));

  if (!started) {
    document.getElementById("waiting-overlay")!.style.display = "flex";
    updatePlayerList();
  } else {
    document.getElementById("waiting-overlay")!.style.display = "none";

    const playerId = localStorage.getItem("playerId")!;
    const player = players.find(p => p.id === playerId)!;
    const opponents = players.filter(p => p.id !== playerId);

    renderHand(player);
    renderOpponents(opponents);
  }
}

async function getRoomData(roomRef: any): Promise<DocumentData>{
    return (await getDoc(roomRef))?.data()!;
}

async function updatePlayers() {
    await updateDoc(roomRef, {
        players: players.map(player => player.toPlainObject())
    });
    game.setPlayers(players);
}

async function startGame(){
    await updateDoc(roomRef, {
        started: true,
    });
    game.setPlayers(players);
    game.start();
}

async function exitRoom(playerId: string, players: any, hostId: string) {
    if (playerId === hostId) {
        await deleteDoc(roomRef);
    } else {
        players = players.filter((player: any) => player.id !== playerId);
        await updateDoc(roomRef, {
          players: players.map((player: any) => player.toPlainObject())
        });
        return window.location.href = "index.html";
    }
}

/*
  Checks to see if the room has been inactive 
  At 25 min gives a warning, at 30 min it closes the room
*/
async function checkRoomStatus() {
  try {
    const roomData = await getRoomData(roomRef)!;

    const lastActive = roomData?.lastActive as number;
    const now = Date.now();
    const minuteDiff = (now - lastActive) / MINUTE;

    if (minuteDiff >= TIMEOUT_CLOSE){
      await deleteDoc(roomRef);
    } else if (minuteDiff >= TIMEOUT_WARNING && !WARNING_SHOWN) {
      alert("Warning: Room will close in 5 minutes due to inactivity!");
      WARNING_SHOWN = true;
    } else if (minuteDiff < TIMEOUT_WARNING && WARNING_SHOWN) {
      WARNING_SHOWN = false;
    }
  } catch (error){
    console.error("Error checking room status:", error);
  }
}

async function createListeners(){
  const roomData = await getRoomData(roomRef);

  document.querySelectorAll('.copy-icon').forEach(copy => {
    copy.addEventListener("click", async () => {
      try{
        await navigator.clipboard.writeText(roomId);
        console.log("Text copied successfully");
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
    startGame();
  });

  //Inactivity Tracking
  ["mousemove", "keydown", "click", "touchstart"].forEach((event) => {
    window.addEventListener(event, async () => {
      const now = Date.now();
      if (now - roomData.lastActive > MINUTE) {
        await updateDoc(roomRef, {
          lastActive: now
        })
      }
    })
  })

  //Inactivity check every minute
  setInterval(checkRoomStatus, MINUTE);
}

export function renderOpponents(opponents: Player[]) {
    const opponentContainer = document.getElementById('opponents')!;
    opponentContainer.innerHTML = ''; // clears old content
    opponents.forEach(opponent => {
        const div = document.createElement('div');
        div.classList.add('opponent');
        div.innerHTML = `
        <div class = "opponent-name">${opponent.name}</div>
        <div class = "hand-info">
            <div class="card-back">${opponent.hand?.length || 0}</div>
            <div class="opp-played">${opponent.lastPlayed?.toString() || ""} </div>
        </div>`;
        opponentContainer.appendChild(div);
    });
}

export function renderHand(player: Player) {
    const handContainer = document.getElementById('hand')!;
    handContainer.innerHTML = '';
    player.hand?.forEach((card: Card) => {
        handContainer.appendChild(card.createCard(players));
    });
}

export function updatePlayerList() {
    const list = document.getElementById('waiting-list')!;
    list.innerHTML = "<h3>Players in room:<h3>" +
        players.map(player => `<div>${player.name}</div>`).join('');
}

window.onload = initRoom;