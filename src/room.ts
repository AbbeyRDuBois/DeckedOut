import { Cribbage } from './games/cribbage';
import { BaseGame } from './games/base-game';
import { Deck } from './deck';
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
    'cribbage': Cribbage,
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
  players = roomData.players.map((player: any) => Player.fromPlainObject(player))
  game = new gameMap[gameType]!(new Deck(), players, roomId);

  await updateDoc(roomRef, {
    maxPlayers: game.getMaxPlayers()
  })

  onSnapshot(roomRef, async (docSnap: any) => {
    if (!docSnap.exists()) {
      alert("Room deleted or closed.");
      return window.location.href = "index.html";
    }

    if (sharedUILoaded && !game.getStarted()) {
      roomData = docSnap.data();
      game.setPlayers(roomData.players.map((player: any) => Player.fromPlainObject(player)));
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
  players = game.getPlayers();

  if (!started) {
  document.getElementById("waiting-overlay")!.style.display = "flex";
  updatePlayerList();
  } else {
    document.getElementById("waiting-overlay")!.style.display = "none";
    game.guestSetup(roomData);
  }
}

async function getRoomData(roomRef: any): Promise<DocumentData>{
    return (await getDoc(roomRef))?.data()!;
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
        await updateDoc(roomRef, {
          players: players.map((player: any) => player.toPlainObject())
        });
        return window.location.href = "index.html";
    }
  }
}

/*
  Checks to see if the room has been inactive 
  At 25 min gives a warning, at 30 min it closes the room
*/
async function checkRoomTimeout() {
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
    game.setPlayers(players);
    game.start();
    document.getElementById("waiting-overlay")!.style.display = "none";
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
  setInterval(checkRoomTimeout, MINUTE);
}


export function updatePlayerList() {
    const list = document.getElementById('waiting-list')!;
    list.innerHTML = "<h3>Players in room:<h3>" +
        players.map(player => `<div>${player.name}</div>`).join('');
}

window.onload = initRoom;