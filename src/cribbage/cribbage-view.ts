import { BaseView } from "../base-game/base-view";
import { CardPlain, PlayerPlain } from "../types";

export class CribbageView extends BaseView {
  onDeckChange?: (mode: string) => void;
  onGameModeChange?: (mode: string) => void;

  render(state: any, localPlayerId: string, onCardClick?: (cardId: number) => void) {
    super.render(state, localPlayerId, onCardClick);
    this.renderPeggingTotal(state);
    this.renderFlipped(state);
    this.renderIndicators(state, localPlayerId);
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
    const opponents = state.players.filter((p: PlayerPlain) => p.id !== localPlayerId);

    opponents.forEach((opponent: PlayerPlain) => {
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

    if(state.roundState == "Throwing"){
      document.getElementById('throwing')!.style.display = "flex";
    }
    else{
      document.getElementById('throwing')!.style.display = "none";
    }
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
        container: rows[0] as HTMLElement,
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
