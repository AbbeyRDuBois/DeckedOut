import { Cribbage } from './games/cribbage';
import { BaseGame } from './games/base-game';
import { Deck } from './deck';
import { deleteDoc, doc, DocumentData, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Player } from './player';
import { db } from './authentication';
import './styles.css'
import { Team } from './team';

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId')!;
const gameType = urlParams.get('game')!;

let roomData: DocumentData;
let roomRef:any;
let game: BaseGame;
let players: Player[];
let sharedUILoaded = false;
let teams: Team[];


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

  players = roomData.players.map((player: any) => Player.fromPlainObject(player));
  teams = roomData.teams.map((team: any) => Team.fromPlainObject(team));
  game = new gameMap[gameType]!(new Deck(), players, roomId);
  game.setTeams(teams);

  await updateDoc(roomRef, {
    maxPlayers: game.getMaxPlayers()
  })

  onSnapshot(roomRef, async (docSnap: any) => {
    if (!docSnap.exists()) {
      alert("Room deleted or closed.");
      return window.location.href = "index.html";
    }
    roomData = docSnap.data();
    if (sharedUILoaded && !game.getStarted()) {
      players = roomData.players.map((player: any) => Player.fromPlainObject(player));
      teams = roomData.teams.map((team: any) => Team.fromPlainObject(team));
      game.setTeams(teams);
      handlePopup();
    }

    if (sharedUILoaded){
      renderInfo();
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
  if (!started) {
  document.getElementById("waiting-overlay")!.style.display = "flex";
  updatePlayerList();
  renderGameOptions();

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
        removePlayerFromTeams(playerId);

        await updateDoc(roomRef, {
          players: players.map((player: any) => player.toPlainObject()),
          teams: teams.map((team: any) => team.toPlainObject())
        });
        return window.location.href = "index.html";
    }
  }
}

function removePlayerFromTeams(playerId: string): void {
    for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        const playerIndex = team.players.findIndex(p => p.id === playerId);

        if (playerIndex !== -1) {
            team.players.splice(playerIndex, 1); // Remove the player

            // If the team is now empty, remove the team from the list
            if (team.players.length === 0) {
                teams.splice(i, 1);
            }
            break; // Player found and removed — exit the loop
        }
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
    game.start();
    document.getElementById("waiting-overlay")!.style.display = "none";
  });


  const toggleBtn = document.getElementById("panel-toggle-btn")!;
  const panel = document.getElementById("info-panel")!;
  // Toggle panel open/close
  toggleBtn.addEventListener("click", () => {
    if (panel.classList.contains("hidden")){
      panel.classList.remove("hidden");
    }
    else{
      panel.classList.add("hidden");
    }
  });

  // Tab switching logic
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.getAttribute("data-tab");

      // Toggle active tab button
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Toggle visible content
      tabContents.forEach(content => {
        if (content.id === `${tab}-tab`) {
          content.classList.remove("hidden");
        } else {
          content.classList.add("hidden");
        }
      });
    });
  });
}


function updatePlayerList() {
    const list = document.getElementById('waiting-list')!;
    list.innerHTML = `
      <div class="waiting-list-container">
        <h3 class="waiting-title">Players in room:</h3>
        ${players.map(player => `<div class="player-name">${player.name}</div>`).join('')}
      </div>
    `;
}

function renderInfo(){
  const info = document.getElementById('info-tab')!;
  info.innerHTML = game.getInfo();
}


function renderGameOptions(){
  switch(gameMap[gameType]){
    case gameMap.cribbage:
      renderTeamSelector();
      break;
    default:
      renderTeamSelector();
  }
}

function renderTeamSelector(){
  const buttons = document.getElementById('popup-btns')!;
  const popup = document.getElementById("waiting-popup")!;
  let teamsContainer = document.getElementById("teams");

  if (teamsContainer == null){
    teamsContainer = document.createElement('div');
    teamsContainer.id = "teams";
  }
  teamsContainer.innerHTML = "";

  //Render each Team into it's own column
  const columnsWrapper = document.createElement("div");
  columnsWrapper.id = "team-column-wrapper";

  teams.forEach((team, teamIndex) => {
    const column = document.createElement("div");
    column.className = "team-column";

    const teamNameInput = document.createElement("input");
    teamNameInput.id = "team-name";
    teamNameInput.value = team.name;
    //Blur is where the user clicks off element
    teamNameInput.addEventListener("blur", () => {
      const newName = teamNameInput.value.trim();

      if (newName != team.name && newName != ""){
        team.name = newName;
        updateDoc(roomRef, {
          teams: teams.map(team => team.toPlainObject())
        });
      }
    });
    column.appendChild(teamNameInput);

    //Players
    team.players.forEach(player => {
      column.appendChild(createPlayerElmt(player, teamIndex));
    });

    columnsWrapper.appendChild(column);
  });

  teamsContainer.appendChild(columnsWrapper);

  //Add/Delete Team Buttons
  teamsContainer.appendChild(createAddDelCol());

  //Random assignment controls
  teamsContainer.appendChild(createRandTeamElmts());

  popup.insertBefore(teamsContainer, buttons);
}

function createRandTeamElmts(): HTMLDivElement{
  const randomRow = document.createElement("div");
  randomRow.id = "random-teams"

  const sizeLabel = document.createElement("label");
  sizeLabel.textContent = "Rando teams: ";
  sizeLabel.className = "team-label";

  const teamSizeInput = document.createElement("input");
  teamSizeInput.className = "team-size";
  teamSizeInput.type = "number";
  teamSizeInput.value = "1";
  teamSizeInput.min = "1";
  teamSizeInput.max = players.length.toString();

  const randomBtn = document.createElement("button");
  randomBtn.textContent = "Rando";
  randomBtn.id = "random-btn";

  randomBtn.onclick = () => {
    randomizeTeams(players, teams, parseInt(teamSizeInput.value));
    updateDoc(roomRef, {
      teams: teams.map(team => team.toPlainObject())
    });
  };

  randomRow.appendChild(sizeLabel);
  randomRow.appendChild(teamSizeInput);
  randomRow.appendChild(randomBtn);

  return randomRow;
}

function createAddDelCol(): HTMLDivElement{
  const addDelContainer = document.createElement("div");
  addDelContainer.id = "add-del-container"

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Team";
  addBtn.className = "add-del-btn";

  addBtn.onclick = () => {
    if (teams.length < players.length) {
      teams.push(new Team(`Team ${teams.length + 1}`, []));
      updateDoc(roomRef, {
        teams: teams.map(team => team.toPlainObject())
      })
    }
  };

  const delBtn = document.createElement("button");
  delBtn.textContent = "Remove Team";
  delBtn.className = "add-del-btn";

  delBtn.onclick = () => {
    if (teams.length > 1) {
      const removed = teams.pop();
      // Push players from removed team back into remaining teams
      if (removed) {
        removed.players.forEach((p, i) => {
          teams[i % teams.length].players.push(p);
        });
      }
      updateDoc(roomRef, {
        teams: teams.map(team => team.toPlainObject())
      });
    }
  };

  addDelContainer.appendChild(addBtn);
  addDelContainer.appendChild(delBtn);

  return addDelContainer;
}

function createPlayerElmt(player: Player, teamIndex: number): HTMLDivElement{
  const playerDiv = document.createElement("div");
  playerDiv.className = "team-player";
  const nameSpan = document.createElement("span");
  nameSpan.textContent = player.name;
  const controls = document.createElement("div");

  if (teamIndex > 0) {
    const leftBtn = document.createElement("button");
    leftBtn.className = "move-player";
    leftBtn.textContent = "←";
    leftBtn.onclick = () => {
      movePlayer(player, teamIndex, teamIndex - 1, teams);
      updateDoc(roomRef, {
        teams: teams.map(team => team.toPlainObject())
      });
    };
    controls.appendChild(leftBtn);
  }

  if (teamIndex < teams.length - 1) {
    const rightBtn = document.createElement("button");
    rightBtn.className = "move-player";
    rightBtn.textContent = "→";
    rightBtn.onclick = () => {
      movePlayer(player, teamIndex, teamIndex + 1, teams);
      updateDoc(roomRef, {
        teams: teams.map(team => team.toPlainObject())
      })
    };
    controls.appendChild(rightBtn);
  }

  playerDiv.appendChild(nameSpan);
  playerDiv.appendChild(controls);
  return playerDiv;
}

function movePlayer(player: Player, fromIndex: number, toIndex: number, teams: Team[]) {
  teams[fromIndex].players = teams[fromIndex].players.filter(p => p.id !== player.id);
  teams[toIndex].players.push(player);
}

function shuffleArray<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function randomizeTeams(players: Player[], teams: Team[], teamSize: number) {
  const shuffled = shuffleArray(players);
  const newTeams: Team[] = [];
  let teamIndex = 0;

  for (let i = 0; i < shuffled.length; i += teamSize) {
    const slice = shuffled.slice(i, i + teamSize);
    newTeams.push(new Team(`Team ${teamIndex + 1}`, slice));
    teamIndex++;
  }

  teams.length = 0;
  teams.push(...newTeams);
}

window.onload = initRoom;