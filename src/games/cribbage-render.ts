import { Team } from "../team";
import { Cribbage } from "./cribbage";

export function renderPeggingTotal(game: Cribbage){
  const peggingTotal = document.getElementById('peggingTotal')!;
  peggingTotal.innerHTML = `${game.getPeggingTotal()}`;
}

export function renderFlipped(game: Cribbage){
    const flippedDiv = document.getElementById("flipped")!;
    flippedDiv.innerHTML = '';
    flippedDiv.appendChild(game.getFlipped().createCard(game.getSpriteSheet()));
}

export function renderWinner(game: Cribbage, winner: Team){
    const winnerPopup = document.getElementById("winner-overlay")!;
    winnerPopup.style.display = "flex";

    const winners = document.getElementById("winners")!;
    winners.innerHTML = `Winner: ${winner.name}!`;

    const points = document.createElement("h2");
    for(const team of game.getTeams()){
      points.innerHTML += `${team.name}: ${team.score}</br>`
    }
    winners.appendChild(points);

    const skunked = game.getTeams().filter(team => team.name != winner.name && team.score <= game.getSkunkLength());

    //Create a list of skunked teams/players to shame them
    if (skunked.length > 0){
    const skunkH2 = document.createElement("h2");
    skunkH2.innerHTML = `Skunked: ${skunked.map(team => team.name).join(", ")}`;
    winners.appendChild(skunkH2);
    }
}