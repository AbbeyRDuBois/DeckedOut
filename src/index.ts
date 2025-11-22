/*
Entry point to application 
Game selection hosting and joining
*/
import { arrayUnion } from "firebase/firestore";
import { signInWithGoogle } from "./authentication";
import { v4 } from 'uuid';
import './styles.css'
import { Player } from "./player";
import { Team } from "./team";
import { CribbageDatabase, Database, getDBInstance, setDBInstance } from "./databases";

const DBMap: Record<string, any> = {
    'cribbage': CribbageDatabase
}

let db: Database

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

  const player = new Player(playerId, host);
  
  setDBInstance(await (new DBMap[gameType]!().init("rooms", {
    hostId: playerId,
    gameType, 
    players: [player.toPlainObject()],
    teams: [(new Team(player.name, [player.id])).toPlainObject()],
    started: false
  })));

  db = getDBInstance();

  return db.getRoomId()
}

//Allows other players to join a pre setup room. Requires them to pass in a roomId and username
async function joinRoom(roomId: string, player: string) {
  const playerId = v4(); //Generates a unique playerId

  // Saves the player's Id and username in storage
  // This helps us be able to tell who is making actions later on in the application
  localStorage.setItem('playerId', playerId);
  localStorage.setItem('username', player);

  //Have to connect and set the instance of the host created db
  db = new Database();
  await db.join("rooms", roomId);
  setDBInstance(db); 
  const roomData = await db.pullState();

  if (roomData === null) {
    alert("Room does not exist");
    return;
  };

  if (roomData.started){
    alert("Game has already started. Can't join now.");
    return;
  }
  const players = roomData.players.map((player: any) => Player.fromPlainObject(player));

  if (roomData.maxPlayers == players.length){
    alert("Game is already full. Can't join now.");
    return;
  }

  const newPlayer = new Player(playerId, player);

  await db.update({
    players: arrayUnion(newPlayer.toPlainObject()),
    teams: arrayUnion((new Team(player, [newPlayer.id])).toPlainObject())
  });

  window.location.href = `room.html?roomId=${roomId}&game=${roomData.gameType}`;
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
        window.location.href = `room.html?roomId=${roomId}&game=${gameType}`;
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
    alert('Please enter the roomId name and try again.');
    return;
  }

  if (player == '' || player == null){
    alert('Please enter your player name and try again.');
    return;
  }

  if (player.length > 15){
    alert('Please enter a shorter player name and try again.');
    return;
  }

  await joinRoom(roomId, player);
});

//Sign in (Chrome throws some errors, but they don't mean anything)
document.getElementById("signInBtn")!.addEventListener('click', async () => {
  var result = await signInWithGoogle()
  var [email, name] = result;
  (document.getElementById("username") as HTMLInputElement).value = String(name);
  document.getElementById("signInBtn")!.style.display = "none" //Removes button once signed in
});