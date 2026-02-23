/****************************************************************************
 * 
 *  Cribbage View (Extends Base View )
 * 
 *     Renders the Cribbage specific elements onto the page
 *        Flipped card, joker popups so on
 * 
 ****************************************************************************/

import { BaseView } from "../base-game/base-view";
import { CardPlain, PlayerPlain } from "../types";

export class CribbageView extends BaseView {
  onDeckChange?: (mode: string) => void;
  onGameModeChange?: (mode: string) => void;

  render(state: any, localPlayerId: string, onCardClick?: (cardId: number) => void) {
    super.render(state, localPlayerId, onCardClick); //Calls base first then does specific game renders
    this.renderPeggingTotal(state);
    this.renderFlipped(state);
    this.renderIndicators(state, localPlayerId);
    this.renderScoringOverlay(state);
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
  override renderGameOptions(options: any) {
    const innerContainer = document.getElementById('inner-container')!;

    let modeContainer = document.getElementById('mode-container');
    if (!modeContainer) {
      modeContainer = document.createElement('div');
      modeContainer.id = 'mode-container';

      const divideLine = document.createElement('div');
      divideLine.classList.add('divide-line');
      innerContainer.appendChild(divideLine);
      innerContainer.appendChild(modeContainer);
    }

    modeContainer.innerHTML = '';

    // Deck selector
    const deckLabel = document.createElement('label');
    deckLabel.textContent = 'Deck: ';

    const deckSelect = document.createElement('select');
    deckSelect.classList.add('menu-selector');
    ['Standard', 'Joker'].forEach(mode => {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode;
      deckSelect.appendChild(opt);
    });

    deckSelect.value = options.deckMode;
    deckSelect.onchange = () => 
      this.onDeckChange?.(deckSelect.value);

    // Game mode selector
    const modeLabel = document.createElement('label');
    modeLabel.textContent = 'Mode: ';

    const modeSelect = document.createElement('select');
    modeSelect.classList.add('menu-selector');
    ['Standard', 'Mega'].forEach(mode => {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode;
      modeSelect.appendChild(opt);
    });

    modeSelect.value = options.gameMode;
    modeSelect.onchange = () =>
      this.onGameModeChange?.(modeSelect.value);

    modeContainer.append(
      deckLabel,
      deckSelect,
      modeLabel,
      modeSelect
    );
  }

  renderIndicators(state: any, localPlayerId: string){
    //Local indicators first
    const localTurn = document.getElementById("local-turn")!;
    const localCrib = document.getElementById("local-owner")!;

    if (state.currentPlayer.id == localPlayerId){
      localTurn.classList.add('active');
    } else {
      localTurn.classList.remove('active');
    }

    if(state.cribOwner.id == localPlayerId){
      localCrib.classList.add('active');
    } else {
      localCrib.classList.remove('active');
    }

    //Opponent indicators
    const opponents = Object.fromEntries(Object.entries(state.players).filter(([id]) => id !== localPlayerId)) as Record<string, PlayerPlain>;

     Object.values(opponents).forEach((opponent: PlayerPlain, index: number) => {
      const oppTurn = document.getElementById(`${opponent.name}-turn`)!;
      const oppCrib = document.getElementById(`${opponent.name}-owner`)!;

      if (state.currentPlayer.id == opponent.id){
        oppTurn.classList.add('active');
      } else {
        oppTurn.classList.remove('active');
      }

      if(state.cribOwner.id == opponent.id){
        oppCrib.classList.add('active');
      } else {
        oppCrib.classList.remove('active');
      }
    })

    //Show if throwing round or not
    if(state.roundState == "Throwing"){
      document.getElementById('throwing')!.style.display = "flex";
    }
    else{
      document.getElementById('throwing')!.style.display = "none";
    }
  }

  //The turn and crib indicators for the opponents
  override createIndicators(opponent: PlayerPlain){
    const turn = document.createElement('div');
    turn.classList.add('indicator');
    turn.dataset.type = 'turn';
    turn.innerHTML= "T";
    turn.id = `${opponent.name}-turn`

    const crib = document.createElement('div');
    crib.classList.add('indicator');
    crib.dataset.type = 'crib';
    crib.innerHTML= "C";
    crib.id = `${opponent.name}-owner`

    return [turn, crib]
  }
  
  // Call to render the card-select popup for when a joker is available in cribbage
  renderJokerPopup(
    cards: CardPlain[],
    onCardClick: (cardId: number) => void,
    choiceCards: CardPlain[]
  ) {
    const overlay = document.getElementById("joker-overlay")!;
    overlay.style.display = "flex";

    // Clear deck section
    const deckSection = document.getElementById("joker-deck")!;
    const deckRows = deckSection.querySelectorAll(".joker-row");
    deckRows.forEach(row => row.innerHTML = "");

    // Render deck cards (full deck)
    cards.forEach((card, index) => {
      const rowEl = deckRows.item(Math.floor(index / 13)) as HTMLElement;

      const cardDiv = this.createCardElement(card, {
        container: rowEl,
        clickable: true,
        startsFlipped: card.isFlipped,
        onClick: () => onCardClick(card.id)
      });

      rowEl.appendChild(cardDiv);
    });

    // Clear hand section
    if (choiceCards && choiceCards.length > 0) {
      const handSection = document.getElementById("joker-hand")!;
      handSection.innerHTML = "";

      choiceCards.forEach((card, index) => {
        const cardDiv = this.createCardElement(card, {
          container: handSection,
          startsFlipped: true
        });
        cardDiv.style.pointerEvents = 'none';
        handSection.appendChild(cardDiv);
      });
    }
  }

  hideJokerPopup() {
    document.getElementById("joker-overlay")!.style.display = "none";
  }

  renderScoringOverlay(state: any) {
    const overlay = document.querySelector(
      ".scoring-overlay"
    ) as HTMLElement;

    if (state.roundState !== "Scoring") {
      overlay.classList.add("hidden");
      return;
    }

    overlay.classList.remove("hidden");

    const slide =
      state.presentation.slides[
        state.presentation.index
      ];

    this.renderSlide(slide, state);
  }

  renderSlide(slide: any, state: any) {
    const nameEl = document.getElementById("scoring-name")!;
    const handEl = document.getElementById("scoring-hand")!;
    const scoreEl = document.getElementById("scoring-score")!;

    handEl.innerHTML = "";

    if (slide.type === "HAND") {
      const player = Object.entries(state.players).find(([id]) => id == slide.playerId)?.[1] as PlayerPlain;
      nameEl.textContent = `${player.name}'s Hand`;

      for (const card of player.hand) {
        const cardEl = this.createCardElement(card, { container: handEl, startsFlipped: true });
        cardEl.style.pointerEvents = 'none';
        handEl.appendChild(cardEl);
      }

      // plus flipped card
      const plus = document.createElement("span");
      plus.textContent = "+";
      handEl.appendChild(plus);

      const flippedEl = this.createCardElement(state.flipped, { container: handEl, startsFlipped: true });
      flippedEl.style.pointerEvents = 'none';
      handEl.appendChild(flippedEl);
    }

    if (slide.type === "CRIB") {
      const dealer = Object.entries(state.players).find(([id]) => id == slide.dealerId)?.[1] as PlayerPlain;
      nameEl.textContent = `${dealer.name}'s Crib`;

      for (const card of state.crib) {
        const cardEl = this.createCardElement(card, { container: handEl, startsFlipped: true });
        cardEl.style.pointerEvents = 'none';
        handEl.appendChild(cardEl);
      }

      const plus = document.createElement("span");
      plus.textContent = "+";
      handEl.appendChild(plus);

      const flippedEl = this.createCardElement(state.flipped, { container: handEl, startsFlipped: true });
      flippedEl.style.pointerEvents = 'none';
      handEl.appendChild(flippedEl);
    }

    scoreEl.textContent = `Total Points: ${slide.points}`;
  }}