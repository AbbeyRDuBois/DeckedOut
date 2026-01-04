import { BaseView } from "./base-view";
import { DeckMode, GameMode } from "../models/games/cribbage-model";
import { CardPlain } from "./types";
import { Card } from "../models/card";

export class CribbageView extends BaseView {
  onDeckChange?: (mode: DeckMode) => void;
  onGameModeChange?: (mode: GameMode) => void;

  render(state: any, localPlayerId: string, onCardClick?: (cardId: number) => void) {
    super.render(state, localPlayerId, onCardClick);
    this.renderPeggingTotal(state);
    this.renderFlipped(state);
  }

  renderPeggingTotal(state: any){
    const peggingTotal = document.getElementById('peggingTotal')!;
    peggingTotal.innerHTML = `${state.peggingTotal}`;
  }

  renderFlipped(state: any){
    const flippedDiv = document.getElementById("flipped")!;
    flippedDiv.innerHTML = '';
    flippedDiv.appendChild(this.createCardElement(state.flipped, { container: flippedDiv }));
  }

  //Cribbage Specific Options when setting up the game
  renderGameOptions(state: any) {
    const innerContainer = document.getElementById('inner-container');
    if (!innerContainer) return;

    let modeContainer = document.getElementById('crib-mode-selector');
    if (!modeContainer) {
      modeContainer = document.createElement('div');
      modeContainer.id = 'crib-mode-selector';
      modeContainer.classList.add('mode-selector');
      innerContainer.appendChild(modeContainer);
    }

    modeContainer.innerHTML = '';

    // Deck selector
    const deckLabel = document.createElement('label');
    deckLabel.textContent = 'Deck: ';

    const deckSelect = document.createElement('select');
    ['Standard', 'Joker'].forEach(mode => {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode;
      deckSelect.appendChild(opt);
    });
    deckSelect.value = state.options.deckMode;
    deckSelect.onchange = () =>
      this.onDeckChange?.(deckSelect.value as DeckMode);

    // Game mode selector
    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Mode: ';

    const modeSelect = document.createElement('select');
    ['Standard', 'Mega'].forEach(mode => {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode;
      modeSelect.appendChild(opt);
    });
    modeSelect.value = state.options.gameMode;
    modeSelect.onchange = () =>
      this.onGameModeChange?.(modeSelect.value as GameMode);

    modeContainer.append(
      deckLabel,
      deckSelect,
      modeLabel,
      modeSelect
    );
  }
  
  // Call to render the card-select popup for when a joker is available in cribbage
  renderJokerPopup(
    cards: CardPlain[],
    onCardClick: (cardId: number) => void
  ) {
    const overlay = document.getElementById("joker-overlay")!;
    overlay.style.display = "flex";

    const rows = document.getElementById("joker-popup")!.children;
    for (let i = 0; i < 4; i++) rows.item(i)!.innerHTML = "";

    cards.forEach((card, index) => {
      const rowEl = rows.item(Math.floor(index / 13)) as HTMLElement;

      const cardDiv = this.createCardElement(card, {
        clickable: true,
        startsFlipped: card.isFlipped,
        onClick: () => onCardClick(card.id) // forward ID to controller
      });

      rowEl.appendChild(cardDiv);
    });
  }

  hideJokerPopup() {
    document.getElementById("joker-overlay")!.style.display = "none";
  }

  renderCribAsHand(cards: CardPlain[]) {
    const handContainer = document.getElementById("hand")!;
    handContainer.innerHTML = "";

    cards.forEach(card => {
      const cardEl = this.createCardElement(card, {
        startsFlipped: card.isFlipped,
        clickable: false // crib cards are not clickable
      });
      handContainer.appendChild(cardEl);
    });
  }
}
