import { doc, onSnapshot, updateDoc, arrayRemove, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "./authentication";

const roomId = new URLSearchParams(window.location.search).get("roomId")!;
const roomRef = doc(db, "rooms", roomId)!; //Grabs the room that matches the Id

const TIMEOUT_WARNING = 25;
const TIMEOUT_CLOSE = 30;
const MINUTE = 60 * 1000;
let WARNING_SHOWN = false;
let lastUpdate = 0;
let initialSetupDone = false;

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

  // Leave room button
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

//Update lastActive on user interaction
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

window.onload = initRoom;
