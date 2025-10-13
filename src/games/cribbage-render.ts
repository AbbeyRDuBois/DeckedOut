import { Deck, Card, CardOptions } from "../deck";
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

//Call to render the card-select popup for when a joker is available in cribbage
export function renderJokerPopup(game: Cribbage) {
  document.getElementById("joker-overlay")!.style.display = "flex";
  const card_grid = document.getElementById("card-btns")!;
  card_grid.innerHTML = "";

  const newDeck = new Deck()
  const options:CardOptions = {
    startsFlipped: true,
    clickable: true,
    height: 60,
    width: 40,
    onClick: game.jokerCardClick,
  }

  newDeck.deck.forEach(card => {
    const cardDiv = card.createCard(game.getSpriteSheet(), options);
    cardDiv.classList.add('small-card');
    cardDiv.style.pointerEvents = "all";
    cardDiv.style.transform = "0";
    card_grid.appendChild(cardDiv) //Add button to grid
  });
}