import { Cribbage, DeckMode, GameMode, RoundState } from "./cribbage-model";
import { CribbageView } from "./cribbage-view";
import { Database } from "../services/databases";
import { Card } from "../card";
import { Deck } from "../deck";

export class CribbageController {
  constructor(private game: Cribbage, private view: CribbageView, private db?: Database) {
    this.game.on('stateChanged', () => this.onStateChanged());

    this.game.on('playRequested', ({ playerId, card }) => {
      const plain = card.toPlainObject();
      view.animatePlay(playerId, plain);
    });

    this.game.on('logAdded', (log) => this.view.renderLog(log));

    this.game.on('cardPlayed', async (cardId: number) => await this.onCardPlayed(cardId));

    this.view.onDeckChange = this.handleDeckChange;
    this.view.onGameModeChange = this.handleGameModeChange;

    // Re-render when room triggers a resize (throttled by RoomController)
    window.addEventListener('room:resize', () => {
      // Call onStateChanged which will re-render the game view with current state
      void this.onStateChanged();
    });
  }

  private handleDeckChange = (mode: DeckMode) => {
    this.game.setDeckMode(mode);
  };

  private handleGameModeChange = (mode: GameMode) => {
    this.game.setGameMode(mode);
  };

  private async onStateChanged() {
    const localId = localStorage.getItem('playerId')!;

    const gameState = this.game.toPlainObject();

    //Render is always called to ensure UI stays in sync
    this.view.render(gameState, localId, 
      async (cardId) => await this.game.cardPlayed(cardId));

    // Freeze/Restore the local hand UI depending on whether a selection is pending
    if (gameState.awaitingJokerSelection) {
      this.view.setHandEnabled(false);
    } else {
      // Reset local hand enabled state based on current round and player
      const localPlayerObj = this.game.getPlayers().find(p => p.id === localId)!;
      this.game.setHandState(localPlayerObj);
    }

    const localPlayer = this.game.getPlayers().find(p => p.id === localId);

    // Check if local player has a Joker in hand
    if (localPlayer?.hand.some((c: Card) => c.value === 'JK')) {
      const fullDeck = new Deck();
      this.view.renderJokerPopup(this.game.getFullPlainDeck(),
        async (cardId: number) => {
          await this.game.applyJokerCard(fullDeck.deck.find(c => c.id === cardId)!, localId);
          // Hide the popup after selection
          this.view.hideJokerPopup();
        }
      );
    }

    // If a joker selection is pending, show the crib (if applicable) and prompt crib owner to select
    const flipped = this.game.getFlipped();
    const cribJoker = this.game.getCrib().some((c: any) => c?.value === 'JK');
    const cribOwner = this.game.getCribOwner();
    const state = this.game.getRoundState();

    if (gameState.awaitingJokerSelection && (
      (state === RoundState.Pegging && flipped.value === 'JK') ||
      (state === RoundState.Pointing && cribJoker)
    )) {
      // Show crib to everyone while awaiting selection (if crib case)
      if (state === RoundState.Pointing && cribJoker) {
        this.view.renderCribAsHand(this.game.getCribRenderState());
      }

      if (localId === cribOwner.id) {
        const fullDeck = new Deck();
        this.view.renderJokerPopup(this.game.getFullPlainDeck(),
          async (cardId: number) => {
            await this.game.applyJokerCard(fullDeck.deck.find(c => c.id === cardId)!, localId);
            // Hide the popup after selection
            this.view.hideJokerPopup();
          }
        );
      }
    }
  }

  //Stalls out other players while Crib owner makes flipped/crib joker selection  
  async waitForJokerSelection(crib = true): Promise<void> {
    let data;

    while (true) {
      data = await this.db?.pullState();

      //Check for if crib has been set
      if(crib && !this.game.getCrib().map((c: any) => new Card(c.id, c.value, c.suit)).some((card: any) => card.value === "JK")) break;

      //Check for if flipped has been set
      if(!crib && Card.fromPlainObject(data?.flipped).value != "JK") break;

      // Small delay before checking again
      await new Promise(res => setTimeout(res, 300));
    }
  }

  async showJokerPopup(selectingPlayerId?: string) {
    const cards = this.game.getFullPlainDeck();

const onCardClick = async (cardId: number) => {
      const deck = new Deck();
      const card = deck.deck.find(c => c.id === cardId);
      if (!card) return;

      const playerId = selectingPlayerId ?? localStorage.getItem('playerId')!;
      await this.game.applyJokerCard(card, playerId); // call model logic and wait for any post-selection counting
      this.view.hideJokerPopup();
    };

    this.view.renderJokerPopup(cards, onCardClick);
  }

  // Called by view when a user interacts with a card
  async onCardPlayed(cardId: number) {
    await this.game.cardPlayed(cardId);
  }
}
