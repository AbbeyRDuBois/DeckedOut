import { Cribbage, DeckMode, GameMode, RoundState } from "../models/games/cribbage-model";
import { CribbageView } from "../views/cribbage-view";
import { Database } from "../services/databases";
import { Card } from "../models/card";
import { Deck } from "../models/deck";

export class CribbageController {
  constructor(private game: Cribbage, private view: CribbageView, private db?: Database) {
    this.game.on('stateChanged', () => this.onStateChanged());

    this.game.on('playRequested', ({ playerId, card }) => {
      const plain = card.toPlainObject();
      view.animatePlay(playerId, plain);
    });

    this.game.on('logAdded', (log) => this.view.renderLog(log));

    this.view.onDeckChange = this.handleDeckChange;
    this.view.onGameModeChange = this.handleGameModeChange;
  }

  init() {
    this.view.renderGameOptions(this.game.getGameOptions());
  }

  private handleDeckChange = (mode: DeckMode) => {
    this.game.setDeckMode(mode);
  };

  private handleGameModeChange = (mode: GameMode) => {
    this.game.setGameMode(mode);
  };

  private async onStateChanged() {
    const localId = localStorage.getItem('playerId')!;

    //Update DB
    if (this.db) {
      try { this.db.update(this.game.toPlainObject()); } catch (e) { console.warn('DB update failed', e); }
    }

    const viewState = this.game.toPlainObject();
    this.view.render(viewState, localId, 
      (cardId) => this.game.cardClick(this.game.getDeck().deck.find((c: any) => c.id === cardId)!)
    );

    const localPlayer = this.game.getPlayers().find(p => p.id === localId);

    // Check if local player has a Joker in hand
    if (localPlayer?.hand.some((c: Card) => c.value === 'JK')) {
      const fullDeck = new Deck();
      this.view.renderJokerPopup(this.game.getFullPlainDeck(),
        async (cardId: number) => {
          this.game.applyJokerCard(fullDeck.deck.find(c => c.id === cardId)!, localId);
          // Hide the popup after selection
          this.view.hideJokerPopup();
        }
      );
    }

    //If local player is crib owner and flipped or crib has joker, prompt for selection, otherwise let the others wait it out
    const flipped = this.game.getFlipped();
    const cribJoker = this.game.getCrib().some((c: any) => c?.value === 'JK');
    const cribOwner = this.game.getCribOwner();
    const state = this.game.getRoundState();

    if ((flipped.isFlipped && flipped.value === 'JK') || 
      (state == RoundState.Pointing && cribJoker)){

      //Move Crib to Hand so user can make selection (and others can see)
      if (state==RoundState.Pointing && cribJoker){
        this.view.renderCribAsHand(this.game.getCribRenderState());
      }

      if(localId === cribOwner.id){
        const fullDeck = new Deck();
        this.view.renderJokerPopup(this.game.getFullPlainDeck(),
          async (cardId: number) => {
            this.game.applyJokerCard(fullDeck.deck.find(c => c.id === cardId)!, localId);
            // Hide the popup after selection
            this.view.hideJokerPopup();
          }
        );
      }
      else{
        await this.waitForJokerSelection();
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

    const onCardClick = (cardId: number) => {
      const deck = new Deck();
      const card = deck.deck.find(c => c.id === cardId);
      if (!card) return;

      const playerId = selectingPlayerId ?? localStorage.getItem('playerId')!;
      this.game.applyJokerCard(card, playerId); // call model logic
      this.view.hideJokerPopup();
    };

    this.view.renderJokerPopup(cards, onCardClick);
  }

  // Called by view when a user interacts with a card
  onCardClicked(cardId: number) {
    this.game.cardClick(new (this.game as any).deck.deck.find((c: any) => c.id === cardId));
  }
}
