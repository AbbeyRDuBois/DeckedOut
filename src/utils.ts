import { Card } from "./deck";
import { Player } from "./player";

export async function loadSharedUI(containerId = "room-template") {
  const container = document.getElementById(containerId)!;
  const html = await fetch("shared-ui.html").then(res => res.text());
  container.innerHTML = html;

  await new Promise(requestAnimationFrame); //Waits for the new changes to load onto the page
}

//Needed to rebuild object from firebase
export function rebuildPlayer(data: any): Player {
  const hand = Array.isArray(data.hand)
  ? data.hand.map((c: any) => new Card(c.id, c.value, c.suit))
  : [];

  const lastPlayed = data.lastPlayed
  ? new Card(data.lastPlayed.id, data.lastPlayed.value, data.lastPlayed.suit)
  : new Card(0);

  return new Player(data.id, data.name, lastPlayed, hand);
}