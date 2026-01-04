// import { Team } from "../models/team";
// import { Player } from "../models/player";
// import { BaseGame } from "./Old/base-game";

// export function renderGameOptions(gameType: String, game: BaseGame){
//   switch(gameType){
//     case 'cribbage':
//       renderTeamSelector(game);
//       renderModeSelector(game)
//       break;
//     default:
//       renderTeamSelector(game);
//   }
// }

// function renderTeamSelector(game: BaseGame){
//   const innerContainer = document.getElementById("inner-container")!;
//   innerContainer.innerHTML = '';
//   let teamsContainer = document.getElementById("teams");

//   if (teamsContainer == null){
//     teamsContainer = document.createElement('div');
//     teamsContainer.id = "teams";
//   }
//   teamsContainer.innerHTML = "";

//   //Render each Team into it's own column
//   const columnsWrapper = document.createElement("div");
//   columnsWrapper.id = "team-column-wrapper";

//   game.getTeams().forEach((team, teamIndex) => {
//     const column = document.createElement("div");
//     column.className = "team-column";

//     const teamNameInput = document.createElement("input");
//     teamNameInput.id = "team-name";
//     teamNameInput.value = team.name;
//     //Blur is where the user clicks off element
//     teamNameInput.addEventListener("blur", async () => {
//       const newName = teamNameInput.value.trim();

//       if (newName != team.name && newName != ""){
//         team.name = newName;
//         await game.getDB().update({teams: game.getTeams().map(team => team.toPlainObject())});
//       }
//     });
//     column.appendChild(teamNameInput);

//     //Players
//     team.playerIds.forEach(id => {
//       const player = game.getPlayerById(id)!;
//       column.appendChild(createPlayerElmt(player, teamIndex, game));
//     });

//     columnsWrapper.appendChild(column);
//   });

//   teamsContainer.appendChild(columnsWrapper);

//   //Add/Delete Team Buttons
//   teamsContainer.appendChild(createAddDelCol(game));

//   //Random assignment controls
//   teamsContainer.appendChild(createRandTeamElmts(game));

//   innerContainer.appendChild(teamsContainer);
// }

// function renderModeSelector(game: BaseGame){
//   const innerContainer = document.getElementById("inner-container")!;
//   const teamsContainer = document.getElementById("teams");

//   if (teamsContainer != null){
//     const divideLine = document.createElement('div');
//     divideLine.classList.add("divide-line");
//     innerContainer.appendChild(divideLine)
//   }

//   const modeSelector = document.createElement('div');
//   modeSelector.classList.add("mode-selector");

//   modeSelector.appendChild(game.createModeSelector()!);

//   innerContainer.appendChild(modeSelector);
// }

// function createRandTeamElmts(game: BaseGame): HTMLDivElement{
//   const players = game.getPlayers();
//   const teams = game.getTeams();
//   const randomRow = document.createElement("div");
//   randomRow.id = "random-teams"

//   const sizeLabel = document.createElement("label");
//   sizeLabel.textContent = "Rando teams: ";
//   sizeLabel.className = "team-label";

//   const teamSizeInput = document.createElement("input");
//   teamSizeInput.className = "team-size";
//   teamSizeInput.type = "number";
//   teamSizeInput.value = "1";
//   teamSizeInput.min = "1";
//   teamSizeInput.max = players.length.toString();

//   const randomBtn = document.createElement("button");
//   randomBtn.textContent = "Rando";
//   randomBtn.id = "random-btn";

//   randomBtn.onclick = async () => {
//     randomizeTeams(players, teams, parseInt(teamSizeInput.value));
//     await game.getDB().update({teams: teams.map(team => team.toPlainObject())});
//   };

//   randomRow.appendChild(sizeLabel);
//   randomRow.appendChild(teamSizeInput);
//   randomRow.appendChild(randomBtn);

//   return randomRow;
// }

// function createAddDelCol(game: BaseGame): HTMLDivElement{
//   const players = game.getPlayers();
//   const teams = game.getTeams();
//   const addDelContainer = document.createElement("div");
//   addDelContainer.id = "add-del-container"

//   const addBtn = document.createElement("button");
//   addBtn.textContent = "Add Team";
//   addBtn.className = "add-del-btn";

//   addBtn.onclick = async () => {
//     if (teams.length < players.length) {
//       teams.push(new Team(`Team ${teams.length + 1}`, []));
//       await game.getDB().update({teams: teams.map(team => team.toPlainObject())});
//     }
//   };

//   const delBtn = document.createElement("button");
//   delBtn.textContent = "Remove Team";
//   delBtn.className = "add-del-btn";

//   delBtn.onclick = async () => {
//     if (teams.length > 1) {
//       const removed = teams.pop();
//       // Push players from removed team back into remaining teams
//       if (removed) {
//         removed.playerIds.forEach((id, i) => {
//           teams[i % teams.length].playerIds.push(id);
//         });
//       }
//       await game.getDB().update({teams: teams.map(team => team.toPlainObject())});
//     }
//   };

//   addDelContainer.appendChild(addBtn);
//   addDelContainer.appendChild(delBtn);

//   return addDelContainer;
// }

// function createPlayerElmt(player: Player, teamIndex: number, game: BaseGame): HTMLDivElement{
//   const teams = game.getTeams();
//   const playerDiv = document.createElement("div");
//   playerDiv.className = "team-player";
//   const nameSpan = document.createElement("span");
//   nameSpan.textContent = player.name;
//   const controls = document.createElement("div");

//   if (teamIndex > 0) {
//     const leftBtn = document.createElement("button");
//     leftBtn.className = "move-player";
//     leftBtn.textContent = "←";
//     leftBtn.onclick = async () => {
//       movePlayer(player, teamIndex, teamIndex - 1, teams);
//       await game.getDB().update({teams: teams.map(team => team.toPlainObject())});
//     };
//     controls.appendChild(leftBtn);
//   }

//   if (teamIndex < teams.length - 1) {
//     const rightBtn = document.createElement("button");
//     rightBtn.className = "move-player";
//     rightBtn.textContent = "→";
//     rightBtn.onclick = async () => {
//       movePlayer(player, teamIndex, teamIndex + 1, teams);
//       await game.getDB().update({teams: teams.map(team => team.toPlainObject())});
//     };
//     controls.appendChild(rightBtn);
//   }

//   playerDiv.appendChild(nameSpan);
//   playerDiv.appendChild(controls);
//   return playerDiv;
// }

// function movePlayer(player: Player, fromIndex: number, toIndex: number, teams: Team[]) {
//   teams[fromIndex].playerIds = teams[fromIndex].playerIds.filter(id => id !== player.id);
//   teams[toIndex].playerIds.push(player.id);
// }

// function shuffleArray<T>(arr: T[]): T[] {
//   return arr.slice().sort(() => Math.random() - 0.5);
// }

// function randomizeTeams(players: Player[], teams: Team[], teamSize: number) {
//   const shuffled = shuffleArray(players);
//   const newTeams: Team[] = [];
//   let teamIndex = 0;

//   for (let i = 0; i < shuffled.length; i += teamSize) {
//     const slice = shuffled.slice(i, i + teamSize);
//     newTeams.push(new Team(`Team ${teamIndex + 1}`, slice.map(player => player.id)));
//     teamIndex++;
//   }

//   teams.length = 0;
//   teams.push(...newTeams);
// }