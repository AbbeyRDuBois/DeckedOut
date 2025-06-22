import { doc, onSnapshot, updateDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "./authentication";
import './styles.css'
import { Player } from "./player";
import { Card, Deck } from "./deck";

const roomId = new URLSearchParams(window.location.search).get("roomId")!;
const roomRef = doc(db, "rooms", roomId)!; //Grabs the room that matches the Id


const TIMEOUT_WARNING = 25;
const TIMEOUT_CLOSE = 30;
const MINUTE = 60 * 1000;
let WARNING_SHOWN = false;
let lastUpdate = 0;

const handContainer = document.getElementById('hand')!;
const opponentContainter = document.getElementById('opponents')!;
const popup = document.getElementById("waiting-popup")!;
const playersList = document.getElementById("waiting-players-list")!;
const startBtn = document.getElementById("start-game-btn")!;
const leaveRm = document.getElementById("leave-room")!;
const leaveBtn = document.getElementById("leave-room-btn")!;


const deck = new Deck();
let players: Player[] = [];

//Utility Functions
function getCurrentPlayerId(){
  return localStorage.getItem("playerId");
}

function getLocalPlayer(): Player {
  return players.find(player => player.id === getCurrentPlayerId())!;
}

function renderPlayerHand(player: Player) {
  if (!handContainer) return;

  handContainer.innerHTML = '';
  player.hand.forEach(card => {
    handContainer.appendChild(card.createCard(players));
  });
}

//Displays the opponent for the bar
function renderOpponents(){
  if(!opponentContainter) return;

  opponentContainter.innerHTML = ''; //Clears old content
  const opponents = players.filter(player => player.id !== getCurrentPlayerId());

  opponents.forEach(opponent => {
    const opponentDiv = document.createElement('div');
    opponentDiv.classList.add('opponent');

    const name = document.createElement('div');
    name.classList.add('opponent-name');
    name.textContent = opponent.name;

    const count = document.createElement('div');
    count.classList.add('card-back');
    count.textContent = opponent.hand?.length.toString();

    const played = document.createElement('div');
    played.classList.add('opp-played');
    played.textContent = opponent.lastPlayed?.toString() ?? '';

    const info = document.createElement('div');
    info.classList.add('hand-info');

    info.appendChild(count);
    info.appendChild(played);
    opponentDiv.appendChild(name);
    opponentDiv.appendChild(info);
    opponentContainter.appendChild(opponentDiv)
  });
}

//Needed to rebuild object from firebase
function rebuildPlayer(data: any): Player {
  const hand = Array.isArray(data.hand)
  ? data.hand.map((c: any) => new Card(c.id, c.value, c.suit))
  : [];

  const lastPlayed = data.lastPlayed
  ? new Card(data.lastPlayed.id, data.lastPlayed.value, data.lastPlayed.suit)
  : new Card(0);

  return new Player(data.id, data.name, lastPlayed, hand);
}

function initEventListeners() {
  if (leaveBtn){
    leaveBtn.addEventListener("click", exitRoom);
  }
  if (leaveRm){
    leaveRm.addEventListener("click", exitRoom);
  }
  if (startBtn) {
    startBtn.onclick = async () => {
      popup!.style.display = "none";

      players.forEach(player => {
        for (let i = 0; i < 7; i++) {
          player.hand.push(deck.getCard()!);
        }
      });

      await updateDoc(roomRef, {
        started: true,
        players: players.map(p => p.toPlainObject())
      });
    };
  }
}

async function exitRoom(){
  const playerId = getCurrentPlayerId();
  const roomData = (await getDoc(roomRef)).data()!;

  if (playerId === roomData.hostId){
    //The host is leaving, delete the room and reroute everyone
    await deleteDoc(roomRef);
  }
  else {
    //Remove the player from the list
    players = players.filter(player => player.id !== playerId);

    await updateDoc(roomRef, {
      players: players.map(p => p.toPlainObject())
    });
  }

  window.location.href = "index.html";
};

function listenForRoomChanges() {
  onSnapshot(roomRef, (docSnap) => {
    if (!docSnap.exists()){
      alert("Room deleted or closed.");
      window.location.href = "index.html";
      return;
    }

    const roomData = docSnap.data();
    players = roomData.players.map((player: any) => rebuildPlayer(player));

    if (!roomData.started) {
      popup!.style.display = "block";
      playersList!.innerHTML = "<ul>" + players.map(player => `<li>${player.name}<li>`).join("") + "</ul>";
    } else {
      popup!.style.display = "none";
      renderPlayerHand(getLocalPlayer());
      renderOpponents();
    }
  })
}

/*
  Checks to see if the room has been inactive 
  At 25 min gives a warning, at 30 min it closes the room
*/
async function checkRoomStatus() {
  try {
    const roomData = (await getDoc(roomRef)).data();

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

/*
  Updates last active in room as players interact as page
  Has a wait period of a minute per update to avoid excessive writing to db (want to avoid paying money)
*/
function setupInactivityTracking(){
  ["mousemove", "keydown", "click", "touchstart"].forEach((event) => {
    window.addEventListener(event, async () => {
      const now = Date.now();
      if (now - lastUpdate > MINUTE) {
        lastUpdate = now;
        await updateDoc(roomRef, {
          lastActive: Date.now()
        });
      }
    });
  });
}

// Run inactivity check every minute
setInterval(checkRoomStatus, MINUTE);

//Entry Point. Sets everything up on load
window.onload = () => {
  if (!roomId) {
    alert("Missing room ID.");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("room-info")!.textContent = `Room ID: ${roomId}`;
  initEventListeners();
  listenForRoomChanges();
  setupInactivityTracking();
}