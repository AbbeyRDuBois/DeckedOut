/*
Entry point to application 
Game selection hosting and joining
*/

import { collection, addDoc, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./authentication";
import { v4 } from 'uuid';
import './styles.css'
import { Player } from "./player";

//Creates the room setting up user as the host
async function createRoom(gameType: string) {
  const host = (document.getElementById("username") as HTMLInputElement).value;
  if (host == '' || host == null){
    alert('Please enter your host name and try again.');
    return;
  }
  const playerId = v4(); //Generates a unique playerId

  // Saves the player's Id and username in storage
  // This helps us be able to tell who is making actions later on in the application
  localStorage.setItem('playerId', playerId);
  localStorage.setItem('username', host);

  return (await addDoc(collection(db, "rooms"), { 
    hostId: playerId,
    gameType, 
    lastActive: Date.now(),
    players: [(new Player(playerId, host)).toPlainObject()],
    started: false
  })).id;
}

//Allows other players to join a pre setup room. Requires them to pass in a roomId and username
async function joinRoom(roomId: string, player: string) {
  const playerId = v4(); //Generates a unique playerId

  // Saves the player's Id and username in storage
  // This helps us be able to tell who is making actions later on in the application
  localStorage.setItem('playerId', playerId);
  localStorage.setItem('username', player);

  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = (await getDoc(roomRef))?.data()!;

  if (roomSnap === null) {
    alert("Room does not exist");
    return;
  };

  //Updates the Game room to add player to the list
  await updateDoc(roomRef, {
    players: arrayUnion((new Player(playerId, player)).toPlainObject()),
    lastActive: Date.now()
  });
  window.location.href = `${roomSnap.gameType}.html?roomId=${roomId}&game=${roomSnap.gameType}`;
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
      if (roomId != '' || roomId != null){
        window.location.href = `${gameType}.html?roomId=${roomId}&game=${gameType}`;
      }
    } catch (e) {
      console.error('Failed to create room:', e);
      alert('Failed to create room, try again.');
    }
  });
});

//Join Room
document.getElementById("joinBtn")!.addEventListener('click', async () => {
  const roomId = (document.getElementById("roomId") as HTMLInputElement).value;
  const player = (document.getElementById("username") as HTMLInputElement).value;

  if (roomId == '' || roomId == null){
    alert('Please enter your player name and try again.');
    return;
  }

  if (player == '' || player == null){
    alert('Please enter your player name and try again.');
    return;
  }

  await joinRoom(roomId, player);
});