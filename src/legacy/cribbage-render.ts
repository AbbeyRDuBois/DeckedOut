// import { Deck } from "../models/deck";
// import { Team } from "../models/team";
// import { Cribbage } from "./cribbage";
// import { CribbageView } from "../views/cribbage-view";
// import { BaseView } from "../views/base-view";

// // These functions are kept as deprecated shims that delegate to the new CribbageView where possible.
// export function renderPeggingTotal(game: Cribbage){
//   const cv = new CribbageView();
//   cv.renderPeggingTotal(game);
// }

// export function renderFlipped(game: Cribbage){
//     const cv = new CribbageView();
//     cv.renderFlipped(game);
// }

// export function renderWinner(game: Cribbage, winner: Team){
//     const cv = new CribbageView();
//     cv.renderWinner(game, winner);
// }

// //Call to render the card-select popup for when a joker is available in cribbage
// export function renderJokerPopup(game: Cribbage): Promise<any> {
//   const cv = new CribbageView();
//   // The new API returns a Card directly; the old function returned a Promise that resolved when the user selected a card.
//   return cv.renderJokerPopup(game) as Promise<any>;
// }

// export function renderCribAsHand(game: Cribbage){
//   const cv = new CribbageView();
//   cv.renderCribAsHand(game);
// }