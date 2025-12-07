import { Deck, CardOptions, Card } from "../deck";
import { Team } from "../team";
import { Cribbage } from "./cribbage";

export function renderPeggingTotal(game: Cribbage){
  const peggingTotal = document.getElementById('peggingTotal')!;
  peggingTotal.innerHTML = `${game.getPeggingTotal()}`;
}

export function renderFlipped(game: Cribbage){
    const flippedDiv = document.getElementById("flipped")!;
    flippedDiv.innerHTML = '';
    flippedDiv.appendChild(game.getFlipped().createCard(game.getSpriteSheet(), {container: flippedDiv}));
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
export function renderJokerPopup(game: Cribbage): Promise<Card> {
  return new Promise((resolve) => {
    document.getElementById("joker-overlay")!.style.display = "flex";
    const rows = document.getElementById("joker-popup")!.children;

    for(var i = 0; i < 4; i++){
      rows.item(i)!.innerHTML = "";
    }

    const newDeck = new Deck()
    const options:CardOptions = {
      startsFlipped: true,
      clickable: true,
      container: rows.item(0)! as HTMLElement,
      onClick: async (card: Card, cardDiv: HTMLDivElement) => {
          await game.jokerCardClick(card, cardDiv);
          resolve(card); // Resolve the Promise once the joker has been chosen
        }
    }

    newDeck.deck.forEach((card, index)=> {
      const cardDiv = card.createCard(game.getSpriteSheet(), options);
      rows.item(Math.floor(index / 13))?.appendChild(cardDiv); // Add button to grid
    });
  });
}

export function renderCribAsHand(game: Cribbage){
  const handContainer = document.getElementById("hand")!;
  handContainer.innerHTML = "";
  game.getCrib().forEach((card: Card) => {
      handContainer.appendChild(card.createCard(game.getSpriteSheet(), {startsFlipped: true, clickable: false}));
  });
}