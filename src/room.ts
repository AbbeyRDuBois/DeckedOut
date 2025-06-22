import { doc, onSnapshot, updateDoc, arrayRemove, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "./authentication";
import './styles.css'
import { Player } from "./player";
import { Card } from "./deck";

const roomId = new URLSearchParams(window.location.search).get("roomId")!;
const roomRef = doc(db, "rooms", roomId)!; //Grabs the room that matches the Id

const TIMEOUT_WARNING = 25;
const TIMEOUT_CLOSE = 30;
const MINUTE = 60 * 1000;
let WARNING_SHOWN = false;
let lastUpdate = 0;
const handContainer = document.getElementById("hand")!;
const playedContainer = document.getElementById("played")!;
const opponentContainter = document.getElementById('opponents')!;
let players: Player[] = [];

//Testing purposes
const cardsInHand = [
  new Card(0,"Ace", "Heart"),
  new Card(1, "King", "Club"),
  new Card(2, "4", "Spade")
];

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
    //Add players list to page
    document.getElementById("players-list")!.innerHTML = "<h3>Players:</h3>" + 
      players.map((player: Player) => `<div>${player.name}${player.id === roomData?.hostId ? " (Host)" : ""}</div>`)
      .join("");
  
    //Adds the opponent bar -> sends everyone but you
    const opponents = players.filter(player => player.id != localStorage.getItem('playerId'));
    if (opponents.length > 0){
      renderOpponents(opponents);
    }
  });
}

  /*
    Takes care of if a player decides to leave the room
    Navigates them back to game selection screen
    If host leaves room, the room closes and everyone gets navigated back
  */
  const leaveBtn = document.getElementById("leave-room-btn")!;
  leaveBtn.addEventListener("click", async () => {
    const playerId = localStorage.getItem('playerId')!;

    const roomRef = doc(db, "rooms", roomId);
    const roomData = (await getDoc(roomRef)).data()!;

    if (playerId === roomData.hostId){
      //The host is leaving, delete the room and reroute everyone
      await deleteDoc(roomRef);
    }
    else {
      //Remove the player from the list
      const playerToRemove = await getPlayer(playerId);

      await updateDoc(roomRef, {
        players: arrayRemove(playerToRemove)
      });
    }

    window.location.href = "index.html";

  });

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

//Creates the cards that are added to hands
//Attaches a listener that will remove it from hand and place it in played section when clicked
//TODO: Add this to card/hand class eventually
function createCard(card: Card): HTMLDivElement {
  const cardDiv = document.createElement('div');
  cardDiv.classList.add('card');
  cardDiv.textContent = card.value + " " + card.suit;
  cardDiv.setAttribute("card-id", card.id.toString());

  cardDiv.addEventListener('click', async () => {
    // Remove from hand
    handContainer.removeChild(cardDiv);

    // Clear previous played card
    playedContainer.innerHTML = '';

    //Add played line so hover no longer works on card
    //cloneNode strips it of all listeners
    cardDiv.classList.add('played');
    cardDiv.replaceWith(cardDiv.cloneNode(true));

    // Add card to played section
    playedContainer.appendChild(cardDiv);

    //Update players card count and last played
    const player = getPlayer(localStorage.get('playerId'))!;
    const index = player.hand.findIndex(card => cardDiv.id === card.id.toString());
    player.hand.splice(index, 1);
    player.lastPlayed = card;
  });

  return cardDiv;
}

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

//Adds in card object to page based on how much is in players hand
cardsInHand.forEach(async c => {
  getPlayer(localStorage.getItem('playerId')!)?.hand.push(c);
  const card = createCard(c);
  handContainer.appendChild(card);
});

//Gets the user out of the player list
function getPlayer(id: string) {
  return players.find((player: Player) => player.id === id);
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
