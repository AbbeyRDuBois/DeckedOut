import { doc, onSnapshot, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "./authentication";

async function initRoom() {
  const roomId = new URLSearchParams(window.location.search).get("roomId");
  if (!roomId) {
    alert("No room ID provided");
    window.location.href = "index.html";
    return;
  }

  //Grabs the room that matches the Id
  const roomRef = doc(db, "rooms", roomId);

  // Listens for room updates
  onSnapshot(roomRef, (docSnap) => {
    // if (!docSnap.exists()) {
    //   alert("Room closed or deleted");
    //   window.location.href = "index.html";
    //   return;
    // }

    const roomData = docSnap.data();
    const roomInfoDiv = document.getElementById("room-info")!;
    const playersListDiv = document.getElementById("players-list")!;

    roomInfoDiv.textContent = `Game: ${roomData?.gameType || "Unknown"} RoomID: ${roomId}`;
    playersListDiv.innerHTML = "<h3>Players:</h3>" + (roomData?.players || [])
      .map((p: any) => `<div>${p.sessionId}${p.sessionId === roomData.hostSessionId ? " (Host)" : ""}</div>`)
      .join("");
  });

  // Leave room button
  const leaveBtn = document.getElementById("leave-room-btn")!;
  leaveBtn.addEventListener("click", async () => {
    await leaveRoom(roomId);
  });
}

async function leaveRoom(roomId: string) {
  const roomRef = doc(db, "rooms", roomId);
  await updateDoc(roomRef, {
    players: arrayRemove({playerId: localStorage.getItem('playerId'), username: localStorage.getItem('username')}),
    lastActive: Date.now()
  });
  window.location.href = "index.html";
}

window.onload = initRoom;
