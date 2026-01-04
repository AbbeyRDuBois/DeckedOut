import { DocumentData } from "firebase/firestore";
import { BaseGame } from "./base-model";
import { Deck, JokerDeck } from "../deck";
import { Card } from "../card";
import { Player } from "../player";
import { Team } from "../team";

enum RoundState {
  Throwing = "Throwing",
  Pegging = "Pegging"
}

export class Cribbage extends BaseGame {
  protected point_goal: number = 121;
  protected skunk_length: number = 90;
  protected crib_count: number = 4;
  protected hand_size: number = 4;
  protected flipped: Card = new Card(0);
  protected crib: Card[] = [];
  protected crib_owner: Player = new Player("0", "");
  protected roundState: RoundState = RoundState.Throwing;
  protected peggingCards: Card[] = [];
  protected peggingTotal: number = 0;
  protected gameMode: string = "Standard";
  protected deckMode: string = "Standard";

  constructor(deck: Deck, players: Player[], roomId: string){
    super(deck, players, roomId);
    this.maxPlayers = 8;
  }

  // --- Basic getters / state
  setFlipped() { this.flipped = this.deck.getCard()!; }
  getFlipped(): Card { return this.flipped; }
  getCrib(): Card[] { return this.crib; }
  getCribOwner(): Player { return this.crib_owner; }
  getPeggingTotal(): number { return this.peggingTotal; }
  getSkunkLength(): number { return this.skunk_length; }
  getRoundState(): string { return this.roundState; }

  setIsTurn(turn: boolean){ this.isTurn = turn; }

  setHandState(player: Player){
    // Model emits that the hand state should be enabled or disabled; Controller will decide how to present it
    if (this.roundState == RoundState.Pegging && this.currentPlayer.name == player.name){
      this.events.emit('handStateChanged', { playerId: player.id, enabled: true } as any);
    } else if (this.roundState == RoundState.Throwing && player.hand.length > this.hand_size){
      this.events.emit('handStateChanged', { playerId: player.id, enabled: true } as any);
    } else {
      this.events.emit('handStateChanged', { playerId: player.id, enabled: false } as any);
    }
  }

  // --- Core game flows (stripped of DB and DOM calls)
  async start(): Promise<void> {
    this.getPlayerOrder();
    this.crib_owner = this.players[0];
    this.currentPlayer = this.players[1];
    this.deal();
    this.setFlipped();
    this.roundState = RoundState.Throwing;
    this.started = true;
    this.events.emit('stateChanged', this.toPlainObject());
  }

  async deal(): Promise<void> {
    const cardNum = this.players.length > 2 ? this.hand_size + 1 : this.hand_size + 2;

    this.players.forEach(player => {
      player.hand = [];
      for(let i = 0; i < cardNum; i++){
        player.hand.push(this.deck.getCard()!);
      }
      player.playedCards = [];
    })

    if (this.players.length == 3){
      this.crib.push(this.deck.getCard()!);
    }

    this.events.emit('stateChanged', this.toPlainObject());
  }

  async guestSetup(data: DocumentData) {
    this.updateLocalState(data);
    this.events.emit('stateChanged', this.toPlainObject());
    this.setStarted(true);
  }

  updateLocalState(data: DocumentData): void {
    this.players = [];
    for (const [id, player] of Object.entries(data.players)) {
      this.players.push(Player.fromPlainObject(player as DocumentData));
    }
    this.players.sort((a, b) => a.getOrder() - b.getOrder());

    this.teams = data.teams?.map((team: any) => Team.fromPlainObject(team)) ?? [];
    this.currentPlayer = Player.fromPlainObject(data.currentPlayer);
    this.crib_owner = Player.fromPlainObject(data.crib_owner);
    this.crib = data.crib?.map((c: any) => new Card(c.id, c.value, c.suit)) ?? [];
    this.deck = Deck.fromPlainObject(data.deck);
    this.roundState = data.roundState ?? RoundState.Throwing;
    this.peggingCards = data.peggingCards?.map((c: any) => new Card(c.id, c.value, c.suit)) ?? [];
    this.peggingTotal = data.peggingTotal ?? 0;
    this.flipped = Card.fromPlainObject(data.flipped);
    this.logs = data.logs ?? [];
    this.point_goal = data.point_goal ?? 121;
    this.skunk_length = data.skunk_length ?? 90;
    this.hand_size = data.hand_size ?? 4;
    this.gameMode = data.gameMode ?? "Standard";
    this.deckMode = data.deckMode ?? "Standard";

    this.events.emit('stateChanged', this.toPlainObject());
  }

  // Card click handling simplified: delegate to throwing/pegging handlers
  async cardClick(card: Card, _cardDiv?: HTMLDivElement) {
    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
    if (!player) return;

    if (this.roundState == RoundState.Throwing) {
      // Move card to crib
      const cardIndex = player.hand.findIndex(c => c.id == card.id);
      if (cardIndex === -1) return;
      player.hand.splice(cardIndex, 1);
      this.crib.push(card);
      this.addLog(`${player.name} has thrown a card to the crib.`);

      // If all players have thrown, move to pegging
      if (this.players.every(p => p.hand.length == this.hand_size)){
        this.roundState = RoundState.Pegging;
        this.flipped.isFlipped = true;
      }
      this.events.emit('stateChanged', this.toPlainObject());
    } else {
      // Pegging: play card if legal
      if (this.peggingTotal + card.toInt(true) > 31) return;
      card.isFlipped = true;
      // Move to played
      const hand = this.players.find(p => p.id === localStorage.getItem('playerId')!)!;
      const idx = hand.hand.findIndex(c => c.id === card.id);
      if (idx === -1) return;
      hand.hand.splice(idx, 1);
      hand.playedCards.push(card);
      this.peggingTotal += card.toInt(true);
      this.peggingCards.push(card);
      // scoring left to game-specific counting methods
      this.addLog(`${hand.name} played ${card.toHTML()}`);

      // Update turn to next player according to simple rotation (detailed pegging rules not fully ported)
      this.nextPlayer();
      this.events.emit('stateChanged', this.toPlainObject());
    }
  }

  /**
   * Handle a joker being turned into another card. This is pure model logic —
   * it updates state and emits events; persistence and DOM work is a controller/view responsibility.
   */
  async jokerCardClick(card: Card, selectingPlayerId?: string): Promise<void> {
    const playerId = selectingPlayerId ?? localStorage.getItem('playerId')!;
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return;

    // If there's a joker in player's hand, replace it with selected card
    const playerJoker = player.hand.findIndex(c => c.value == "JK");
    if (playerJoker != -1){
      player.hand.splice(playerJoker, 1);
      card.isFlipped = true;
      player.hand.push(card);
      this.addLog(`${player.name} has turned the joker into ${card.toHTML()}`);
      this.events.emit('stateChanged', this.toPlainObject());
      return;
    }

    // If it's the flipped card that is joker
    if (this.flipped.value == "JK" && this.flipped.isFlipped){
      this.flipped = card;
      this.flipped.isFlipped = true;
      // Score adjustments (nobs/nibs) should be done by dedicated methods; logged here for now.
      this.addLog(`${player.name} has turned the joker into ${card.toHTML()}`);
      this.events.emit('stateChanged', this.toPlainObject());
      return;
    }

    // If there is a joker in the crib, replace it
    const cribJoker = this.crib.findIndex(c => c.value == "JK");
    if (cribJoker != -1){
      this.crib.splice(cribJoker, 1);
      this.crib.push(card);
      this.addLog(`${player.name} has turned the joker into ${card.toHTML()}`);
      this.events.emit('stateChanged', this.toPlainObject());
      return;
    }
  }

  // Counting / scoring and round transitions would be implemented here (methods ported from original)

  // extend view snapshot with cribbage-specific fields
  toViewState() {
    const base = super.toViewState();
    return {
      ...base,
      flipped: this.flipped?.toPlainObject(),
      crib: this.crib.map(c => c.toPlainObject()),
      cribOwnerId: this.crib_owner?.id,
      roundState: this.roundState,
      peggingTotal: this.peggingTotal,
      peggingCards: this.peggingCards.map(c => c.toPlainObject()),
      gameMode: this.gameMode,
      deckMode: this.deckMode,
      pointGoal: this.point_goal,
      skunkLength: this.skunk_length,
      handSize: this.hand_size
    };
  }
}
