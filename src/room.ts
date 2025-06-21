import { doc, onSnapshot, updateDoc, arrayRemove, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "./authentication";
import './styles.css'

const roomId = new URLSearchParams(window.location.search).get("roomId")!;
const roomRef = doc(db, "rooms", roomId)!; //Grabs the room that matches the Id

const TIMEOUT_WARNING = 25;
const TIMEOUT_CLOSE = 30;
const MINUTE = 60 * 1000;
let WARNING_SHOWN = false;
let lastUpdate = 0;
let initialSetupDone = false;

//Testing purposes
const cardsInHand = [
  { id: 2, suit: "Spade" },
  { id: 3, suit: "Heart" },
  { id: 4, suit: "Club" },
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

  
  // Listens for room updates
  const unsubscribe = onSnapshot(roomRef, (docSnap) => {
     if (!docSnap.exists() && initialSetupDone) {
      alert("Room closed or deleted");
      unsubscribe(); //Cleans up listener
      window.location.href = "index.html";
      return;
    }

    const roomData = docSnap.data();
    const roomInfoDiv = document.getElementById("room-info")!;
    const playersListDiv = document.getElementById("players-list")!;

    roomInfoDiv.textContent = `Game: ${roomData?.gameType || "Unknown"} RoomID: ${roomId}`;

    //Add players list to page
    playersListDiv.innerHTML = "<h3>Players:</h3>" + (roomData?.players || [])
      .map((p: any) => `<div>${p.username}${p.playerId === roomData?.hostId ? " (Host)" : ""}</div>`)
      .join("");
  });

  initialSetupDone = true;
}

  /*
    Takes care of if a player decides to leave the room
    Navigates them back to game selection screen
    If host leaves room, the room closes and everyone gets navigated back
  */
  const leaveBtn = document.getElementById("leave-room-btn")!;
  leaveBtn.addEventListener("click", async () => {
    const playerId = localStorage.getItem('playerId');

    const roomRef = doc(db, "rooms", roomId);
    const roomData = (await getDoc(roomRef)).data()!;

    if (playerId === roomData.hostId){
      //The host is leaving, delete the room and reroute everyone
      await deleteDoc(roomRef);
    }
    else {
      //Remove the player from the list
      const playerToRemove = roomData.players.find((player: any) => player.playerId === playerId)

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

//Adds in card object to page based on how much is in players hand
const handContainer = document.getElementById("hand");
cardsInHand.forEach(card => {
  const cardDiv = document.createElement("div");
  cardDiv.className = "card";
  cardDiv.textContent = card.suit;
  cardDiv.dataset.id = card.id.toString();

  //Hover and click behaviours
  cardDiv.addEventListener("click", () => {
    console.log('Clicked card ID: ${card.id}, Name: ${card.name}');
  })

  handContainer?.appendChild(cardDiv);
})

window.onload = initRoom;
