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

const deck = new Deck();

let players: Player[] = [];

/*
  Initializes the room.
  Sets up room closed listener, and basic looks
*/
async function initRoom() {
  if (!roomId) {
    alert("No room ID provided");
    window.location.href = "index.html";
    return;
  }

  document.getElementById("room-info")!.textContent =  `RoomID: ${roomId}`;

  // Listens for room updates
  const unsubscribe = onSnapshot(roomRef, (docSnap) => {
     if (!docSnap.exists()) {
      alert("Room closed or deleted");
      unsubscribe(); //Cleans up listener
      window.location.href = "index.html";
      return;
    }

    const roomData = docSnap.data();
    players = roomData.players.map((player: string) => rebuildPlayer(JSON.parse(player)));
    if (!roomData.started) {
      popup.style.display = "block";
      playersList.innerHTML = "<h3>Players in room:</h3><ul>" + players.map(p => `<li>${p.name}</li>`).join('') + "</ul>";
    } else {
      //Adds the opponent bar -> sends everyone but you
      const opponents = players.filter(player => player.id != localStorage.getItem('playerId'));
      if (opponents.length > 0){
      renderOpponents(opponents);

      const player = players.find((player: Player) => player.id === localStorage.getItem('playerId')!)!;
      handContainer.innerHTML = '';
      player.hand?.forEach((card: Card) => {handContainer.appendChild(card.createCard(players))});
    }
      popup.style.display = "none";
    }

    // //Add players list to page
    // document.getElementById("players-list")!.innerHTML = "<h3>Players:</h3>" + 
    //   players.map((player: Player) => `<div>${player.name}${player.id === roomData?.hostId ? " (Host)" : ""}</div>`)
    //   .join("");

  // Example handlers
  startBtn.onclick = async () => {
    const roomRef = doc(db, "rooms", roomId);
    popup.style.display = "none";

    //TODO: Add this to a game class setup eventually
    //This setup is for gofish
    players.forEach(player => {
      for(let i = 0; i < 7; i++){
        player.hand.push(deck.getCard()!);
      }
    })

    const player = players.find((player: Player) => player.id === localStorage.getItem('playerId')!)!;

    await updateDoc(roomRef, {
      started: true,
      players: players.map(p => JSON.stringify(p))
    });
  };

  leaveRm.onclick = () => {
    exitRoom();
  };
  });
}

  /*
    Takes care of if a player decides to leave the room
    Navigates them back to game selection screen
    If host leaves room, the room closes and everyone gets navigated back
  */
  const leaveBtn = document.getElementById("leave-room-btn")!;
  leaveBtn.addEventListener("click", async () => {
    exitRoom();
  });

  async function exitRoom(){
    const playerId = localStorage.getItem('playerId')!;

    const roomRef = doc(db, "rooms", roomId);
    const roomData = (await getDoc(roomRef)).data()!;

    if (playerId === roomData.hostId){
      //The host is leaving, delete the room and reroute everyone
      await deleteDoc(roomRef);
    }
    else {
      //Remove the player from the list
      const removeId = players.indexOf(players.find((player: Player) => player.id === playerId)!)
      players.splice(removeId, 1);

      await updateDoc(roomRef, {
        players: players.map(p => JSON.stringify(p))
      });
    }

    window.location.href = "index.html";
  };
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

// Run the check every minute
setInterval(checkRoomStatus, MINUTE);

/*
  Updates last active in room as players interact as page
  Has a wait period of a minute per update to avoid excessive writing to db (want to avoid paying money)
*/
["mousemove", "keydown", "click", "touchstart"].forEach((event) => {
  window.addEventListener(event, async () => {
    const now = Date.now();

    //Gives a wait period of at least a minute before writing to database.
    //Helps prevent excessive writing, preformance issues and being charged lots of money
    if (now - lastUpdate > MINUTE) {
      lastUpdate = now;
      await updateDoc(roomRef, {
        lastActive: Date.now()
      });
    }
  });
});

//Displays the opponent for the bar
function renderOpponents(opponents: Player[]){
  opponentContainter.innerHTML = ''; //Clears old content

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
    played.textContent = opponent.lastPlayed?.toString();

    const info = document.createElement('div');
    info.classList.add('hand-info');

    info.appendChild(count);
    info.appendChild(played);
    opponentDiv.appendChild(name);
    opponentDiv.appendChild(info);
    opponentContainter.appendChild(opponentDiv)
  })
}

//Needed to rebuild object from json
function rebuildPlayer(data: any): Player {
  const hand = Array.isArray(data.hand)
  ? data.hand.map((c: any) => new Card(c.id, c.value, c.suit))
  : [];

  const lastPlayed = data.lastPlayed
  ? new Card(data.lastPlayed.id, data.lastPlayed.value, data.lastPlayed.suit)
  : new Card(0);

  return new Player(data.id, data.name, lastPlayed, hand);
}

window.onload = initRoom;
