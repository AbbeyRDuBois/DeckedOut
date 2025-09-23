import { updateDoc } from "firebase/firestore";
import { Team } from "./team";
import { Player } from "./player";

export function renderGameOptions(gameType: String, gameMap: Record<string, any>, teams: Team[], players: Player[], roomRef: any){
  switch(gameType){
    case gameMap.cribbage:
      renderTeamSelector(teams, players, roomRef);
      break;
    default:
      renderTeamSelector(teams, players, roomRef);
  }
}

function renderTeamSelector(teams: Team[], players: Player[], roomRef: any){
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
      column.appendChild(createPlayerElmt(player, teamIndex, teams, roomRef));
    });

    columnsWrapper.appendChild(column);
  });

  teamsContainer.appendChild(columnsWrapper);

  //Add/Delete Team Buttons
  teamsContainer.appendChild(createAddDelCol(teams, players, roomRef));

  //Random assignment controls
  teamsContainer.appendChild(createRandTeamElmts(players, teams, roomRef));

  popup.insertBefore(teamsContainer, buttons);
}

function createRandTeamElmts(players: Player[], teams: Team[], roomRef: any): HTMLDivElement{
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

function createAddDelCol(teams: Team[], players: Player[], roomRef: any): HTMLDivElement{
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

function createPlayerElmt(player: Player, teamIndex: number, teams: Team[], roomRef: any): HTMLDivElement{
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