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
  private scoringPresentationTimer: number | null = null;
  private readonly SLIDE_DURATION_MS = 5000; // 5 seconds per slide

  constructor(game: Cribbage, view: CribbageView, db: Database) {
    super(game, view, db);

    // Only add Cribbage-specific event listeners not in BaseController
    this.game.on('cardPlayed', async (cardId: number) => await this.onCardPlayed(localStorage.getItem("playerId")!, cardId));

    this.view.onDeckChange = this.handleDeckChange;
    this.view.onGameModeChange = this.handleGameModeChange;
  }

  private handleDeckChange = async (mode: string) => {
    await this.game.setDeckMode(mode);
    this.gameOptions(this.db.getHostId());
  };

  private handleGameModeChange = async (mode: string) => {
    await this.game.setGameMode(mode);
    this.gameOptions(this.db.getHostId());
  };

  override gameOptions(hostId: string) {
    const options = {
      deckMode: this.game.getDeckMode(),
      gameMode: this.game.getGameMode()
    }
    
    this.view.renderGameOptions(options, hostId);
  }

  override async onStateChanged() {
    this.gameRerender();
    
    if(this.game.getEnded()){
      const winner = this.game.getTeams().find(t => t.getScore() >= this.game.getPointGoal());
      const losers = this.game.getTeams().filter(t => t.getName() != winner?.getName());
      const winnerPlayers = winner?.getPlayerIds().map(id => this.game.getPlayer(id));

      this.view.renderWinner(winner, losers, winnerPlayers);
      return;
    }

    const state = this.game.getRoundState();

    // Handle Presentation
    if (state === RoundState.Scoring) {
      this.handlePresentation();
    } else {
      // Stop auto-advance if we're no longer in Scoring state
      this.stopPresentation();
    }

    this.handleJokerLogic(state);
  }

  //Stalls out other players while Crib owner makes flipped/crib joker selection  
  async waitForJokerSelection(crib = true): Promise<void> {
    let data;

    while (true) {
      data = await this.db?.pullState();

      //Check for if crib has been set
      if (crib && !data?.crib?.some((c: any) => c.rank === "JK")) break;

      //Check for if flipped has been set
      if (!crib && data?.flipped?.rank != "JK") break;

      // Small delay before checking again
      await new Promise(res => setTimeout(res, 300));
    }
  }

  async showJokerPopup(selectingPlayerId?: string) {
    const cards = this.game.getFullPlainDeck();

    const onCardClick = async (cardId: number) => {
      const deck = new Deck();
      const card = deck.getDeck().find(c => c.getId() === cardId);
      if (!card) return;

      const playerId = selectingPlayerId ?? localStorage.getItem('playerId')!;
      await this.game.applyJokerCard(card, playerId);
      this.view.hideJokerPopup();
    };

    this.view.renderJokerPopup(cards, onCardClick, []);
  }

  private startPresentation(): void {
    if (!this.game.isHost()) return; // Only host manages the timer
    
    // Clear any existing timer
    this.stopPresentation();

    // Start auto-advance timer
    this.scoringPresentationTimer = window.setInterval(async () => {
      await this.game.advanceScoringPresentation();
    }, this.SLIDE_DURATION_MS);
  }

  private stopPresentation(): void {
    if (this.scoringPresentationTimer !== null) {
      clearInterval(this.scoringPresentationTimer);
      this.scoringPresentationTimer = null;
    }
  }

  private handlePresentation(): void {
    const localId = localStorage.getItem('playerId')!;
    const cribOwner = this.game.getCribOwner();

    // Check if crib slide has joker
    if (this.game.hasCribJokerInCurrentSlide()) {
      // Pause for joker selection
      this.stopPresentation();

      // Only show popup for crib owner
      if (localId === cribOwner.getId()) {
        const gameState = this.game.toPlainObject();
        this.view.render(gameState, localId, this.db.getHostId(), cardId => this.onCardPlayed(localId, cardId));
          
        // Hide the scoring overlay for the crib owner
        const overlay = document.querySelector(".scoring-overlay") as HTMLElement;
        if (overlay) overlay.classList.add("hidden");

        const fullDeck = new Deck();
        this.view.renderJokerPopup(
          this.game.getFullPlainDeck(),
          async (cardId: number) => {
            this.view.hideJokerPopup();
            const selectedCard = fullDeck.getDeck().find(c => c.getId() === cardId);
            if (selectedCard) {
              await this.game.applyJokerCard(selectedCard, localId);
            }
          },
          this.game.getCrib().map(c => c.toPlainObject())
        );
      } else {
        // For non-crib owners, show the scoring slide and wait
        const gameState = this.game.toPlainObject();
        this.view.render(gameState, localId, this.db.getHostId(), cardId => this.onCardPlayed(localId, cardId));
      }
    } else {
      // Normal slide
      if (this.scoringPresentationTimer === null) {
        this.startPresentation();
      }
      
      // Render the scoring overlay for all players
      const gameState = this.game.toPlainObject();
      this.view.render(gameState, localId, this.db.getHostId(), cardId => this.onCardPlayed(localId, cardId));
      
      // Make sure scoring is visible
      const overlay = document.querySelector(".scoring-overlay") as HTMLElement;
      if (overlay) overlay.classList.remove("hidden");
    }
  }

  private handleJokerLogic(state: string){
    const localId = localStorage.getItem('playerId')!;
    const cribOwner = this.game.getCribOwner();

    // Freeze/Restore the local hand UI depending on whether a selection is pending
    if (this.game.waitingForJoker()) {
      this.view.setHandEnabled(false);
    } else {
      // Reset local hand enabled state based on current round and player
      const localPlayerObj = this.game.getPlayer(localId);
      this.game.setHandState(localPlayerObj);
    }

    const localPlayer = this.game.getPlayer(localId);

    // Check if local player has a Joker in hand
    if (localPlayer?.getHand().some((c: Card) => c.getRank() === 'JK') && state != RoundState.Pointing && state != RoundState.Scoring) {
      const fullDeck = new Deck();
      this.view.renderJokerPopup(
        this.game.getFullPlainDeck(),
        async (cardId: number) => {
          this.view.hideJokerPopup();
          const selected = fullDeck.getDeck().find(c => c.getId() === cardId);
          if (!selected) return;
          await this.game.applyJokerCard(selected, localId);
        },
        localPlayer.getHand().map(c => c.toPlainObject())
      );
      return;
    }

    // Check if flipped card is a Joker
    if (this.game.getFlipped().getRank() === 'JK' 
        && state != RoundState.Pointing && state != RoundState.Scoring
        && localId === cribOwner.getId()
        && this.game.getFlipped().getFlipped()) {
      const fullDeck = new Deck();
      this.view.renderJokerPopup(
        this.game.getFullPlainDeck(),
        async (cardId: number) => {
          this.view.hideJokerPopup();
          const selected = fullDeck.getDeck().find(c => c.getId() === cardId);
          if (!selected) return;
          await this.game.applyJokerCard(selected, localId);
        },
        localPlayer?.getHand().map(c => c.toPlainObject()) || []
      );
    }
  }
}
