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
  const card_grid = document.getElementById("card-btns")

  const my_deck:Deck = new Deck
  let card = my_deck.getOrderedCard()
  const options:CardOptions = {
    startsFlipped: true,
    clickable: true,
    onClick: jokerCardClicked,
  }

  while(card){
    const card_button = document.createElement("button");
    card_button.className = "card_btn"

    card_button.appendChild(card.createCard(game.getSpriteSheet(), options)) //Add card image to button
    card_grid?.appendChild(card_button) //Add button to grid

    //Get new card
    card = my_deck.getOrderedCard()
  }
}

//Automatically called on the card that is selected by the player with a joker
function jokerCardClicked(card: Card, cardDiv: HTMLDivElement): void{
  document.getElementById("joker-overlay")!.style.display = "none";

  //TODO: Do something on return
  console.log("Card clicked!") //TODO: Delete this probably lol
}