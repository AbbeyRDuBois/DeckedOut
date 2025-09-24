import { Team } from "../team";
import { Cribbage } from "./cribbage";

  export function renderGameInfo(game: Cribbage){
    const currents = document.getElementById('currents')!;
    currents.innerHTML = ''; // clears old content

    const div = document.createElement('div');
    div.innerHTML=`
      <div class="current-player"> Current Player: ${game.getCurrentPlayer().name}</div>
      <div class="current-owner">Crib Owner: ${game.getCribOwner()}</div>
      <div class="pegging-total">Pegging Total: ${game.getPeggingTotal()}</div>
    `;
    currents.appendChild(div);
  }

export function renderFlipped(game: Cribbage){
    const flippedDiv = document.getElementById("flipped")!;
    flippedDiv.innerHTML = '';
    flippedDiv.appendChild(game.getFlipped().createCard(true));
}

export function renderWinner(game: Cribbage, winner: Team){
    const winnerPopup = document.getElementById("winner-overlay")!;
    winnerPopup.style.display = "flex";

    const winners = document.getElementById("winners")!;
    winners.innerHTML = `Winner: ${winner.name}!`;

    const skunked = game.getTeams().filter(team => team.name != winner.name && team.score <= game.getSkunkLength());

    //Create a list of skunked teams/players to shame them
    if (skunked.length > 0){
    const skunkH2 = document.createElement("h2");
    skunkH2.innerHTML = `Skunked: ${skunked.map(team => team.name).join(", ")}`;
    winners.appendChild(skunkH2);
    }
}