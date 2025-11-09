import { arrayUnion, DocumentData } from "firebase/firestore";
import { BaseGame } from "./base-game";
import { Card, Deck, JokerDeck } from "../deck";
import { Player } from "../player";
import { Team } from "../team";
import { renderHand, renderScoreboard, renderOpponents, renderLogs, renderIndicators, renderPlayed} from "./game-render"
import { renderJokerPopup, renderFlipped, renderPeggingTotal, renderWinner, renderCribAsHand } from "./cribbage-render";


enum RoundState {
  Throwing = "Throwing",
  Pegging = "Pegging"
}

export class Cribbage extends BaseGame {
  protected point_goal: number = 121; //Number of points to win
  protected skunk_length: number = 90; //Number of points from skunk line to end -1
  protected crib_count: number = 4; //Number of cards in crib
  protected hand_size: number = 4; //Number of cards in a hand after throwing to crib
  protected flipped: Card = new Card(0);
  protected crib: Card[] = [];
  protected isTurn: boolean = true;
  protected crib_owner: Player = new Player("0", "");
  protected roundState: string = ""; //Holds what phase the game is in currently
  protected peggingCards: Card[] = []; //Holds sequence of cards played in pegging round
  protected peggingTotal: number = 0; //Sum of current pegging round
  protected ended: boolean = false;
  protected gameMode: string = "Standard";
  protected deckMode: string = "Standard";
  protected jokerChoice: any;

  constructor( deck: Deck, players: Player[], roomId: string){
    super(deck, players, roomId);
    this.maxPlayers = 8;

    this.cardClick = this.cardClick.bind(this); //Binds this function to game so that games variables can still be used in the onClick
    this.jokerCardClick = this.jokerCardClick.bind(this);
  }

  /***********************************************************************************************************************************************
   * 
   * Gets and Sets
   * 
   ***********************************************************************************************************************************************/
  setFlipped() {
    this.flipped = this.deck.getCard()!;
  }
  
  getFlipped(): Card {
    return this.flipped;
  }

  getCrib(): Card[] {
    return this.crib;
  }

  getCribOwner(): Player {
    return this.crib_owner;
  }

  getPeggingTotal(): number {
    return this.peggingTotal;
  }
  
  getSkunkLength(): number {
    return this.skunk_length;
  }

  getRoundState(): string {
    return this.roundState;
  }

  setIsTurn(turn: boolean){
    this.isTurn = turn;
  }

  setHandState(player: Player){
      //If they still have cards to throw or if it's their turn in pegging activate hand, else deactivate
    if (this.roundState == RoundState.Pegging && this.currentPlayer.name == player.name){
      this.activateHand();
    }
    else if (this.roundState == RoundState.Throwing && player.hand.length > this.hand_size){
      document.getElementById("played-container")!.innerHTML = '';
      this.activateHand();
    }
    else{
      this.deactivateHand();
    }
  }

  /***********************************************************************************************************************************************
   * 
   * Game Setups/States
   * 
  **********************************************************************************************************************************************/

  async start(): Promise<void> {
    this.getPlayerOrder();
    this.crib_owner = this.players[0];//First player in array starts it off
    this.currentPlayer = this.players[1]; //Player after crib owner is current player (always at least 2 people in game so it's fine)
    this.deal();
    this.setFlipped();
    this.roundState = RoundState.Throwing;
    this.started = true;

    //This call is pretty big cause it's inital setup
    await this.db.update ({
      players: this.createPlayerMap(),
      teams: this.teams.map(team => team.toPlainObject()),
      flipped: this.flipped?.toPlainObject(),
      crib: arrayUnion(...this.crib?.map(card => card.toPlainObject())),
      crib_owner: this.crib_owner.toPlainObject(),
      currentPlayer: this.currentPlayer.toPlainObject(),
      deck: this.deck.toPlainObject(),
      started: this.started,
      roundState: this.roundState,
      peggingCards: arrayUnion(...this.peggingCards?.map(card => card.toPlainObject())),
      peggingTotal: this.peggingTotal,
      ended: this.ended,
      logs: this.logs
    });

    await this.render();
    this.started = true;
  }

  async deal(): Promise<void> {
    //Deal +2 cards if 2 players, +1 if more
    const cardNum = this.players.length > 2 ? this.hand_size + 1 : this.hand_size + 2;

    this.players.forEach(player => {
      player.hand = [];
      for(let i = 0; i < cardNum; i++){
        player.hand.push(this.deck.getCard()!);
      }
      player.playedCards = [];
    })

    //Add a card to crib if 3 players
    if (this.players.length == 3){
      this.crib.push(this.deck.getCard()!);
    }
  }

  async render(): Promise<void> {
    //Render the winner popup if someone won
    if (this.ended){
      let winner: Team = new Team("", []);

      for (const team of this.teams) {
        if (team.score >= this.point_goal) {
            winner = team;
            break; // stop at the first match
        }
      }
      renderWinner(this, winner);
      return;
    }

    renderHand(this);
    renderPlayed(this);
    renderOpponents(this);
    renderScoreboard(this);
    renderFlipped(this);
    renderPeggingTotal(this);
    renderLogs(this);
    renderIndicators(this, [
      {
        name: 'turn',
        isActive: (player) => player.id === this.getCurrentPlayer().id
      },
      {
        name: 'crib',
        isActive: (player) => this.getCribOwner().id === player.id
      },

    ]);

    //Show that it is throwing round
    if(this.roundState == RoundState.Throwing){
      document.getElementById('throwing')!.style.display = "flex";
    }
    else{
      document.getElementById('throwing')!.style.display = "none";
    }

    //Check if player's hand has joker
    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
    if(player.hand?.find(card => card.value == "JK") != null){
      await renderJokerPopup(this);
    }

    //Check if flipped is joker (render for crib owner)
    if (this.flipped.isFlipped && this.flipped.value == "JK" && this.crib_owner.id == player.id){
      await renderJokerPopup(this);
    }  

    await this.waitForJokerSelection(false);
  }

  async guestSetup(data: DocumentData) {
    this.updateLocalState(data);
    await this.render();
    this.setStarted(true);
  }

  updateLocalState(data: DocumentData): void {
    this.players = []; // Clear first
    for (const [id, player] of Object.entries(data.players)) {
      this.players.push(Player.fromPlainObject(player as DocumentData)); //Recreating player objects
    }
    this.players.sort((a, b) => a.getOrder() - b.getOrder()); //Resorting to make sure everyone is in the correct order.

    this.teams = data.teams?.map((team: any) => Team.fromPlainObject(team)) ?? [];
    this.currentPlayer = Player.fromPlainObject(data.currentPlayer);
    this.crib_owner = Player.fromPlainObject(data.crib_owner);
    this.crib = data.crib?.map((c: any) => new Card(c.id, c.value, c.suit)) ?? [];
    this.deck = Deck.fromPlainObject(data.deck);
    this.roundState = data.roundState ?? RoundState.Throwing;
    this.peggingCards = data.peggingCards?.map((c: any) => new Card(c.id, c.value, c.suit)) ?? [];
    this.peggingTotal = data.peggingTotal ?? 0;
    this.flipped = Card.fromPlainObject(data.flipped);
    this.ended = data.ended ?? false;
    this.logs = data.logs ?? [];
    this.point_goal = data.point_goal ?? 121;
    this.skunk_length = data.skunk_length ?? 90;
    this.hand_size = data.hand_size ?? 4;
    this.gameMode = data.gameMode ?? "Standard";
    this.deckMode = data.deckMode ?? "Standard";
  }

  createPlayerMap(): Record<string, any> {
    const playerMap: Record<string, any> = {};
    this.players.forEach((player) => {
      playerMap[player.id] = player.toPlainObject();
    });

    return playerMap;
  }

  async waitForJokerSelection(crib = true): Promise<void> {
  let data;

  while (true) {
    data = await this.db.pullState();

    //Check for if crib has been set
    if(crib && !data.crib?.map((c: any) => new Card(c.id, c.value, c.suit)).some((card: any) => card.value === "JK")) break;

    //Check for if flipped has been set
    if(!crib && Card.fromPlainObject(data.flipped).value != "JK") break;

    // Small delay before checking again
    await new Promise(res => setTimeout(res, 300));
  }
}

  //Automatically called on the card that is selected by the player with a joker
  async jokerCardClick(card: Card, cardDiv: HTMLDivElement): Promise<void> {
    document.getElementById("joker-overlay")!.style.display = "none";
    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;

    //If there's a joker in player hand
    const playerJoker = player.hand.findIndex(card => card.value == "JK");
    if (playerJoker != -1){
      player.hand.splice(playerJoker, 1);
      card.isFlipped = true;
      player.hand.push(card);
      this.addLog(`${player.name} has turned the joker into ${card.toHTML()}`);
      await this.db.update({[`players.${player.id}`]: player.toPlainObject(), logs: this.logs});
      await this.render();
      return;
    }

    //If it's the flipped card that is joker take care of that
    if (this.flipped.value == "JK" && this.flipped.isFlipped){
      this.flipped = card;
      this.flipped.isFlipped = true;
      const changes = this.findNibs();
      this.addLog(`${player.name} has turned the joker into ${card.toHTML()}`);
      changes.logs = this.logs;
      await this.db.update({...changes, flipped: this.flipped.toPlainObject()});
      await this.render();
      return;
    }

    //If there is a joker in the crib
    var cribJoker = this.crib.findIndex(card => card.value == "JK");
    if (cribJoker != -1){
      this.crib.splice(cribJoker, 1);
      this.crib.push(card);
      this.addLog(`${player.name} has turned the joker into ${card.toHTML()}`);

      await this.db.update({crib: this.crib.map(c => c.toPlainObject()), logs: this.logs});
      await this.render();
      return;
    }
  }

  async cardClick(card: Card, cardDiv: HTMLDivElement) {
    const handContainer = document.getElementById("hand")!;
    const playedContainer = document.getElementById("played-container")!;
    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;

    if (handContainer.classList.contains('hand-disabled')) return; //Returns if hand is disabled

    if (this.roundState == RoundState.Throwing){
      await this.clickThrowing(handContainer, cardDiv, card, player);
    }
    //RoundState is Pegging
    else{
      await this.clickPegging(handContainer, playedContainer, cardDiv, card);
    }
  }

  async clickThrowing(handContainer: HTMLElement, cardDiv: HTMLDivElement, card: Card, player: Player){
      handContainer.removeChild(cardDiv);
      //Remove from hand and add to crib
      this.crib.push(card)
      const cardIndex = player.hand.findIndex(c => c.id == card.id)
      player.hand.splice(cardIndex, 1)

      //check if you've thrown necessary cards
      if (player.hand.length == this.hand_size){
        handContainer.classList.add('hand-disabled');
        this.addLog(`${player.name} has thrown all their cards.`)
      }

      let changes: Record<string, any> = {
        players: this.createPlayerMap(),
        teams: this.teams.map(team => team.toPlainObject()),
        crib: this.crib.map(c => c.toPlainObject()),
        logs: this.logs
      };

      //Once everyone has thrown get the flipped card and start pegging round
      if (this.players.every(player => player.hand.length == this.hand_size)){
        changes.roundState = RoundState.Pegging;
        this.flipped.isFlipped = true;

        changes = {
          ...changes,
          ...this.findNibs()
        };
        changes.flipped = this.flipped.toPlainObject();
      }
      await this.db.update(changes);
  }

  async clickPegging(handContainer: HTMLElement, playedContainer: HTMLElement, cardDiv: HTMLDivElement, card: Card){
    if (this.peggingTotal + card.toInt(true) > 31) return;

    card.isFlipped = true; //Flips the card for the other players to see

    this.playCard(handContainer, playedContainer, cardDiv, card);
    this.peggingTotal += card.toInt(true);

    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
    this.peggingCards.push(card)
    let points = this.calculatePeggingPoints(card);
    this.findTeamByPlayer(player)!.score += points;
    player.score += points;
    this.addLog(`${player.name} played a ${card.toHTML()}`);

    if (points > 0){
      this.addLog(`${player.name} got ${points} points in pegging.`);
    }

    this.checkIfWon(player);

    if(this.ended){
      await this.db.update({
        players: this.createPlayerMap(),
        teams: this.teams.map(team => team.toPlainObject()),
        ended: true,
        logs: this.logs
      });
      return;
    }

    await this.nextPlayer(true);

    //Doing this twice as nextPlayer could have updated the player counts after end round
    if(this.ended){
      await this.db.update({
        players: this.createPlayerMap(),
        teams: this.teams.map(team => team.toPlainObject()),
        ended: true,
        logs: this.logs
      });
      return;
    }

    let changes: Record<string, any> = {
      players: this.createPlayerMap(),
      teams: this.teams.map(team => team.toPlainObject()),
      currentPlayer: this.currentPlayer.toPlainObject(),
      peggingCards: this.peggingCards.map(card => card.toPlainObject()),
      peggingTotal: this.peggingTotal,
      logs: this.logs
    };

    //Checks if the round has been Updated back to throwing (meaning people ran out of cards for pegging)
    //Need to update a lot of variables then
    if (this.roundState == RoundState.Throwing){
      changes = {
        ...changes,
        flipped: this.flipped.toPlainObject(),
        crib: this.crib.map(card => card.toPlainObject()),
        crib_owner: this.crib_owner.toPlainObject(),
        deck: this.deck.toPlainObject(),
        roundState: this.roundState,
      }
    }

    //Updates last played and pegging arrays for all players
    await this.db.update(changes);
  }

  checkIfWon(player: Player){
    let team = this.findTeamByPlayer(player)!;

    if (team.score >= this.point_goal){
      this.ended = true;
      this.addLog(`${player.name} won the game!`);
    }
  }

  async nextPlayer(pegging = false): Promise<void> {
    const index = this.players.findIndex(player => player.id === this.currentPlayer.id);
    if(pegging){
      let found = false;

      if (this.peggingTotal != 31){
        //Find the next player who has a playable card
        for(let i = 1; i <= this.players.length && !found; i++){
          const player = this.players[(index + i) % this.players.length];

          const unplayedCards = player.hand.filter(card => !player.playedCards.some(played => played.id === card.id));
          if (unplayedCards?.some(card => card.toInt(true) + this.peggingTotal <= 31)){
            this.currentPlayer = player;
            found = true;
          }
        }
      }
      if (!found){
        //Add in that last point and restart pegging/move to next throw round
        if (this.peggingTotal != 31){
          this.findTeamByPlayer(this.players[index])!.score += 1;
          this.players[index].score += 1;
          this.addLog(`Nobody else could play! ${this.players[index].name} got the point.`);
        }

        await this.endRound(index);
      }
    }
    else{
      const index = this.players.findIndex(player => player.name === this.crib_owner.name);
      //Next player becomes crib owner
      this.crib_owner = this.players[(index + 1) % this.players.length];
      this.currentPlayer = this.players[(index + 2) % this.players.length];
      this.addLog(`${this.crib_owner.name} is the new crib owner.`);
    }

    renderIndicators(this, [
      {
        name: 'turn',
        isActive: (player) => player.id === this.getCurrentPlayer().id
      },
      {
        name: 'crib',
        isActive: (player) => this.getCribOwner().id === player.id
      },

    ]);
  }

  createIndicators(oppId: string): HTMLDivElement[]{
    const indicators = super.createIndicators(oppId); //Use all the logic from base game createIndicators + some

    const cribIndicator = document.createElement('div');
    cribIndicator.classList.add('indicator');
    cribIndicator.dataset.type = 'crib';
    cribIndicator.innerHTML= "C";
    cribIndicator.id = "crib-indicator-" + oppId;

    indicators.push(cribIndicator);

    return indicators;
  }

  createModeSelector(): HTMLDivElement | null {
    const modes = document.createElement('div');
    const stanDeckOpt = this.createSelectorOption("Standard");
    const jokerOpt = this.createSelectorOption("Joker");
    const stanModeOpt = this.createSelectorOption("Standard");
    const megaOpt = this.createSelectorOption("Mega");
    const deckSelector = document.createElement('select');
    deckSelector.classList.add("deckSelector");
    deckSelector.classList.add("menu-selector");
    deckSelector.options.add(stanDeckOpt);
    deckSelector.options.add(jokerOpt);
    deckSelector.value = this.deckMode;

    deckSelector.addEventListener("change", async (event) => {
      const target = event.target as HTMLSelectElement;
      if(target.value == "Standard"){
        this.deck = new Deck();
      }
      else{
        this.deck = new JokerDeck();
      }

      this.deckMode = target.value != "" ? target.value: "Standard";
      await this.db.update({deck: this.deck.toPlainObject(), deckMode: this.deckMode});
    });

    const modeSelector = document.createElement('select');
    modeSelector.classList.add("modeSelector");
    modeSelector.classList.add("menu-selector");
    modeSelector.options.add(stanModeOpt);
    modeSelector.options.add(megaOpt);
    modeSelector.value = this.gameMode;

    modeSelector.addEventListener("change", async (event) => {
      const target = event.target as HTMLSelectElement;
      if(target.value == "Standard"){
        this.point_goal = 121;
        this.skunk_length = 90;
        this.hand_size = 4;
      }
      else{
        this.point_goal = 241
        this.skunk_length = 180;
        this.hand_size = 8;
      }

      this.gameMode = target.value != "" ? target.value: "Standard";
      await this.db.update({
        point_goal: this.point_goal,
        skunk_length: this.skunk_length,
        hand_size: this.hand_size,
        gameMode: this.gameMode
      });
    });

    modes.appendChild(deckSelector);
    modes.appendChild(modeSelector);
    return modes;
  }

  createSelectorOption(name: string): HTMLOptionElement{
    const opt = document.createElement('option');
    opt.innerHTML= name;
    opt.value= name;

    return opt;
  }

  //Returns true when entire pegging round is done. False if just resetting loop
  async endRound(index: number){
    //If a player still has cards to play
    if(this.players.some(player => player.hand.length - player.playedCards.length > 0)){
      let found = false;
      //find the next player who has cards to play (start at one to start check at next player)
      for(let i = 1; i <= this.players.length && !found; i++){
        let player = this.players[(index + i) % this.players.length];

        if (player.hand.length - player.playedCards.length > 0){
          this.currentPlayer = player;
          found = true;
        }
      }

      //Reset the pegging values
      this.peggingTotal = 0;
      this.peggingCards = [];
    }
    //If players don't have anymore cards update everything and deal new cards
    else{
      this.addLog(`Flipped Card: ${this.flipped.toHTML()}`);
      this.countHands();
      await this.countCrib();

      //If a player got over the point goal don't need to deal with rest of it
      if (this.ended) return;

      this.deck.resetDeck();
      this.deal();
      this.setFlipped();

      this.roundState = RoundState.Throwing;
      await this.nextPlayer();
      this.peggingTotal = 0;
      this.peggingCards = [];
    }
  }

  /***********************************************************************************************************************************************
   * 
   * Calculations
   * 
  *************************************************************************************************************************************************/

  calculatePeggingPoints(card: Card): number {
    let points = 0;
    // Find longest run if enough cards
    if (this.peggingCards.length >= 3) {
      let handValues = this.peggingCards.map(card => card.toInt(true));
      for (let length = handValues.length; length >= 3; length--) {
        const slice = handValues.slice(handValues.length - length); // Always ends at last card
        const unique = new Set(slice);

        // No repeated ranks allowed
        if (unique.size !== slice.length) continue;

        const sorted = [...unique].sort((a, b) => a - b);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];

        // Check for a valid run (consecutive sequence)
        if (max - min + 1 === sorted.length) {
            points += sorted.length;
            break;
        }
      }
    }
    // Check for pairs
    let pairs = 1;
    let isDone = false;

    for(let i = this.peggingCards.length - 2 ; i >= 0 && !isDone; i--){
      if (card.value == this.peggingCards[i].value){
        pairs += 1;
      } else {
        isDone = true;
      }
    }

    // If any pairs
    if (pairs > 1) {
      points +=  pairs * (pairs -1);
    }

    // Check for 15 and 31
    if (this.peggingTotal === 15 || this.peggingTotal === 31) {
      points += 2;
    }
    return points;
  }

  countHands(){
    const currIndex = this.players.findIndex(player => player.name == this.crib_owner.name)!;

    //Have to count the hands in order starting from the person after the crib owner
    for(let i = 1; i <= this.players.length && !this.ended; i++){
      let player = this.players[(currIndex + i) % this.players.length];

      let points = 0;
      let hand = [...player.hand];
            
      //Do flush/nobs first as it doesn't need to be sorted and a card being the flipped one matters
      points += this.findFlush(hand);
      points += this.findNobs(hand);

      hand.push(this.flipped);
      hand.sort((a,b) => a.toInt() - b.toInt());

      points += this.find15s(hand);
      points += this.findPairs(hand);
      points += this.findRuns(hand);
      
      this.findTeamByPlayer(player)!.score += points;
      player.score += points;
      this.addLog(`${player.name} got ${points} points with hand ${player.hand.map(card => card.toHTML())}`);
    
      this.checkIfWon(player);
    }
  }

  async countCrib(){
    if (this.ended) return;

    const localPlayer = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;
    let hasJoker = this.crib.findIndex(c => c.value == "JK") != -1;

    //if There is joker(s) in crib render selection show crib for everyone
    if (hasJoker){
      renderCribAsHand(this);
    }

    //Let cribOwner choose joker(s)
    while(hasJoker && localPlayer.id == this.crib_owner.id){
      await renderJokerPopup(this);
      hasJoker = this.crib.findIndex(c => c.value == "JK") != -1;
    }

    //All players wait until crib no longer has Jokers
    await this.waitForJokerSelection();

    let points = 0;
    let hand = [...this.crib];

    //Do flush/nobs first as it doesn't need to be sorted and a card being the flipped one matters
    points += this.findFlush(hand, true);
    points += this.findNobs(hand);

    hand.push(this.flipped);
    hand.sort((a,b) => a.toInt() - b.toInt());

    points += this.find15s(hand);
    points += this.findPairs(hand);
    points += this.findRuns(hand);

    const player = this.players.find(player => player.name == this.crib_owner.name)!;
    this.findTeamByPlayer(player)!.score += points;
    player.score += points;
    this.addLog(`${player.name} got ${points} points with crib ${this.crib.map(card => card.toHTML())}`);
    this.crib = [];

    this.checkIfWon(player);
  }

  //Finds all the 15s in the hand
  find15s(cards: Card[]): number{
    let handValues = cards.map(card => card.toInt(true));
    let points = 0;

    //Checking all combos of 2 or more for the 15s
    for (let size = 2; size <= handValues.length; size++) {
      const combos = this.getCombinations(handValues, size);
      for (const combo of combos){
        if (combo.reduce((sum, val) => sum + val, 0) == 15){
          points += 2;
        }
      }
    }
    return points;
  }

  getCombinations(values: number[], size: number): number[][] {
    const result: number[][] = [];
    //Defines the recursion function that will generate all the combos
    const combine = (start: number, curr: number[]) => {
      if (curr.length === size) {
        result.push(curr.slice());
        return;
      }
      for (let i = start; i < values.length; i++) {
        curr.push(values[i]);
        combine(i + 1, curr);
        curr.pop();
      }
    };
    combine(0, []);
    return result;

  }

  findPairs(cards: Card[]): number{
    let handValues = cards.map(card => card.toInt());
    const counts = new Map<number, number>();
    let points = 0; 

    //Sorts all the card values into their counts Ex: 3 2s and so on
    for(let value of handValues){
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    //Use those counts to add up pairs Ex: 3 2s -> points = 3 * (3-1) = 6 and so on
    counts.forEach((count, value) => {
      points += count * (count -1);
    })
    return points;
  }  

  findRuns(cards: Card[]): number{
    let handValues = cards.map(card => card.toInt());
    let totalMult = 1;
    let mult = 1;
    let runLength = 1;
    let points = 0;

    for(let i = 0; i < handValues.length; i++){
      if (i + 1 < handValues.length){
        //Check for multiples of a card to times run with later
        if(handValues[i] == handValues[i+1]){
          mult += 1;
        } else {
          //If next card isn't a multiple and mult changed, update the mult count/total
          if(handValues[i] != handValues[i+1] && mult > 1){
            totalMult *= mult;
            mult = 1;
          }

          //Check if next card in array follows a run
          if(handValues[i] + 1 == handValues[i+1]){
            runLength +=1;
          } else{
            //When run breaks, add to points if one actually exists and reset vars
            if (runLength >= 3){
              points += runLength * totalMult;
            }

            totalMult = 1;
            mult = 1;
            runLength = 1;
          }
        }
      }
    }

    //Check if last bit forms a last run
    if(runLength >= 3){
      points += runLength * totalMult;
    }
    return points;
  } 

  findFlush(cards: Card[], crib = false): number{
    //Add flipped to the check if it's the crib
    if (crib){
      cards.push(this.flipped)
    }
    //Check for flush normally
    const suitSet = new Set(cards.map(card => card.suit));
    
    
    if (this.deckMode == "Mega" && 
      suitSet.size === 2 &&
      (suitSet.has("Hearts") && suitSet.has("Diamonds")) || (suitSet.has("Clubs") && suitSet.has("Spades"))){
        return suitSet.has(this.flipped.suit) && !crib ? cards.length + 1 : cards.length;
    }

    //If only one suit was found in the set you have a flush (Mega will go here too if somehow you only have 1 suit in your hand)
    if (suitSet.size === 1) {
      //Check to see if flipped matches to return extra point (dont if crib)
      return suitSet.has(this.flipped.suit) && !crib ? cards.length + 1 : cards.length;
    }
    return 0;
  }

  findNobs(cards: Card[]): number{
    const hasNobs = cards.some(card => card.value == 'J' && this.flipped.suit == card.suit)

    return hasNobs ? 1 : 0;
  }

  findNibs(): Record<string, any>{
    let changes: Record<string, any> = {};
    if (this.flipped.value == "J"){
      const player = this.players.find(player => player.name == this.crib_owner.name)!;
      this.findTeamByPlayer(player)!.score += 2;
      player.score += 2;
      changes.teams = this.teams.map(team => team.toPlainObject());
      changes[`players.${player.id}`] = player.toPlainObject();
      this.addLog(`${player.name} got Nibs! +2 points`);
      changes.logs = this.logs;
    }

    return changes
  }
}