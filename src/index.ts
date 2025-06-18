import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, getSessionId } from "./authentication";

export async function createRoom(gameType: string) {
  const sessionId = getSessionId();

  const roomRef = await addDoc(collection(db, 'rooms'), {
    hostSessionId: sessionId,
    gameType,
    isOpen: true,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
    players: [
      {
        sessionId: sessionId,
        joinedAt: serverTimestamp(),
      }
    ]
  });

  return roomRef.id;
}

export async function joinRoom(roomId: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error("Room does not exist");
  }

  const sessionId = getSessionId();

  //Updates the Game room to add player to the list
  await updateDoc(roomRef, {
    players: arrayUnion({
      sessionId,
      joinedAt: serverTimestamp()
    }),
    lastActive: serverTimestamp()
  });
}

// Select all buttons with the class "create-room-btn"
const buttons = document.querySelectorAll<HTMLButtonElement>('.create-room-btn');
//This adds a listener to each game host button
//When clicked, this will create a new room with user as host then redirect them to new room
buttons.forEach(button => {
  button.addEventListener('click', async () => {
    // Get the game type from the button's data attribute
    const gameType = button.dataset.gameType;
    if (!gameType) {
      console.error('Game type not specified on button');
      return;
    }

    try {
      const roomId = await createRoom(gameType);
      window.location.href = `room.html?roomId=${roomId}`;
    } catch (e) {
      console.error('Failed to create room:', e);
      alert('Failed to create room, try again.');
    }
  });
});