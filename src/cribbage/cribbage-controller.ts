/****************************************************************************
 * 
 *  Cribbage Controller (Extends the Base Controller)
 * 
 *      Implements the Cribbage specific event handlers
 * 
 ****************************************************************************/

import { Cribbage, RoundState } from "./cribbage-model";
import { CribbageView } from "./cribbage-view";
import { Database } from "../services/databases";
import { Card } from "../card";
import { Deck } from "../deck";
import { BaseController } from "../base-game/base-controller";

export class CribbageController extends BaseController<Cribbage, CribbageView>{
  constructor(game: Cribbage, view: CribbageView, db: Database) {
    super(game, view, db);

    // Only add Cribbage-specific event listeners not in BaseController
    this.game.on('cardPlayed', async (cardId: number) => await this.onCardPlayed(localStorage.getItem("playerId")!, cardId));

    this.view.onDeckChange = this.handleDeckChange;
    this.view.onGameModeChange = this.handleGameModeChange;
  }

  private handleDeckChange = async (mode: string) => {
    await this.game.setDeckMode(mode);
    this.gameOptions();
  };

  private handleGameModeChange = async (mode: string) => {
    await this.game.setGameMode(mode);
    this.gameOptions();
  };

  override gameOptions() {
    const options = {
      deckMode: this.game.getDeckMode(),
      gameMode: this.game.getGameMode()
    }
    
    this.view.renderGameOptions(options);
  }

  override async onStateChanged() {
    if (!this.game.getStarted()){
      this.gameOptions();
      return;
    }

    if(this.game.getEnded()){
      const winner = this.game.getTeams().find(t => t.score >= this.game.getPointGoal());
      const losers = this.game.getTeams().filter(t => t.name != winner?.name);

      this.view.renderWinner(winner, losers);
      return;
    }
    
    const localId = localStorage.getItem('playerId')!;

    // Freeze/Restore the local hand UI depending on whether a selection is pending
    if (this.game.waitingForJoker()) {
      this.view.setHandEnabled(false);
    } else {
      // Reset local hand enabled state based on current round and player
      const localPlayerObj = this.game.getPlayers().find(p => p.id === localId)!;
      this.game.setHandState(localPlayerObj);
    }

    const localPlayer = this.game.getPlayers().find(p => p.id === localId);

    const state = this.game.getRoundState();

    // Check if local player has a Joker in hand
    if (localPlayer?.hand.some((c: Card) => c.value === 'JK') && state != RoundState.Pointing) {
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

    if (this.game.waitingForJoker() && (
      (state === RoundState.Pegging && flipped.value === 'JK') ||
      (state === RoundState.Pointing && cribJoker)
    )) {
      // set everyone's hands to the crib so they can see it
      if (state === RoundState.Pointing && cribJoker) {
        this.game.getPlayers().forEach(player => player.hand = this.game.getCrib());
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
}
