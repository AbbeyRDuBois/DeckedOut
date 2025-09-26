import { arrayUnion, DocumentData, onSnapshot, updateDoc } from "firebase/firestore";
import { BaseGame } from "./base-game";
import { Card, Deck } from "../deck";
import { Player } from "../player";
import { Team } from "../team";
import { renderHand, renderScoreboard, renderOpponents, renderLogs} from "./game-render"
import { renderFlipped, renderGameInfo, renderWinner } from "./cribbage-render";


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
  protected isTurn: boolean = true; //Is it players turn to play card
  protected crib_owner: string = "";
  protected roundState: string = ""; //Holds what phase the game is in currently
  protected peggingCards: Card[] = []; //Holds sequence of cards played in pegging round
  protected peggingTotal: number = 0; //Sum of current pegging round
  protected ended: boolean = false;

  constructor( deck: Deck, players: Player[], roomId: string){
    super(deck, players, roomId);
    this.maxPlayers = 8;

    this.cardClick = this.cardClick.bind(this); //Binds this function to game so that games variables can still be used in the onClick
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

  getCribOwner(): String {
    return this.crib_owner;
  }

  getPeggingTotal(): number {
    return this.peggingTotal;
  }
  
  getSkunkLength(): number {
    return this.skunk_length;
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
    this.crib_owner = this.players[0].name;//First player in array starts it off
    this.currentPlayer = this.players[1]; //Player after crib owner is current player (always at least 2 people in game so it's fine)
    this.deal();
    this.setFlipped();
    this.roundState = RoundState.Throwing;

    //This call is pretty big cause it's inital setup
    this.updateDBState({
      players: this.players.map(player => player.toPlainObject()),
      teams: this.teams.map(team => team.toPlainObject()),
      flipped: this.flipped.toPlainObject(),
      crib: arrayUnion(...this.crib.map(card => card.toPlainObject())),
      crib_owner: this.crib_owner,
      currentPlayer: this.currentPlayer.toPlainObject(),
      deck: this.deck.toPlainObject(),
      started: true,
      roundState: this.roundState,
      peggingCards: arrayUnion(...this.peggingCards.map(card => card.toPlainObject())),
      peggingTotal: this.peggingTotal,
      ended: this.ended,
      logs: this.logs
    });

    this.render();
    this.setupListener();
    this.started = true;
  }

  async deal(): Promise<void> {
    //Deal 6 cards if 2 players, 5 if more
    const cardNum = this.players.length > 2 ? 5 : 6;

    this.players.forEach(player => {
      player.hand = [];
      for(let i = 0; i < cardNum; i++){
        player.hand.push(this.deck.getCard()!);
      }

      player.playedCards = [];
    })
  }

  render(): void {
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
    renderOpponents(this);
    renderScoreboard(this);
    renderFlipped(this);
    renderGameInfo(this);
    renderLogs(this);
  }

  setupListener() {
    //Game specific room listener
    onSnapshot(this.roomRef, (docSnap: any) => {
      const roomData = docSnap.data() as DocumentData;
      this.updateLocalState(roomData);
      //Enables your hand if it's your turn
      if (this.roundState == RoundState.Pegging && this.currentPlayer.id === localStorage.getItem('playerId')){
        const handContainer = document.getElementById("hand")!;
        handContainer.classList.remove('hand-disabled');
        this.isTurn = true;
      }

      this.render();
    });
  }

  guestSetup(data: DocumentData): void {
    this.updateLocalState(data);
    this.render();
    this.setupListener();
    this.setStarted(true);
  }

  updateLocalState(data: DocumentData): void {
    this.players = data.players.map((player: any) =>Player.fromPlainObject(player));
    this.teams = data.teams.map((team: any) => Team.fromPlainObject(team));
    this.currentPlayer = Player.fromPlainObject(data.currentPlayer);
    this.crib_owner = data.crib_owner;
    this.crib = data.crib.map((c: any) => new Card(c.id, c.value, c.suit));
    this.deck = Deck.fromPlainObject(data.deck);
    this.roundState = data.roundState;
    this.peggingCards = data.peggingCards.map((c: any) => new Card(c.id, c.value, c.suit));
    this.peggingTotal = data.peggingTotal;
    this.flipped = Card.fromPlainObject(data.flipped);
    this.ended = data.ended;
    this.logs = data.logs;
  }

  async updateDBState(changes: { [key: string]: any}){
    await updateDoc(this.roomRef, changes);
  }

  async cardClick(card: Card, cardDiv: HTMLDivElement) {
    const handContainer = document.getElementById("hand")!;
    const playedContainer = document.getElementById("played-container")!;
    const player = this.players?.find((p) => p.id === localStorage.getItem('playerId')!)!;

    if (handContainer.classList.contains('hand-disabled')) return; //Returns if hand is disabled

    if (this.roundState == RoundState.Throwing){
      this.clickThrowing(handContainer, cardDiv, card, player);
    }
    //RoundState is Pegging
    else{
      this.clickPegging(handContainer, playedContainer, cardDiv, card);
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
        players: this.players.map(p => p.toPlainObject()),
        teams: this.teams.map(team => team.toPlainObject()),
        crib: this.crib.map(c => c.toPlainObject()),
        logs: this.logs
      };

      //Once everyone has thrown get the flipped card and start pegging round
      if (this.players.every(player => player.hand.length == this.hand_size)){
        changes.roundState = RoundState.Pegging;
        this.flipped.isFlipped = true;

        //Check for Nibs
        if (this.flipped.value == "J"){
          const player = this.players.find(player => player.name == this.crib_owner)!;
          this.findTeamByPlayer(player)!.score += 2;
          player.score += 2;
          changes.teams = this.teams.map(team => team.toPlainObject());
          this.addLog(`${player.name} got Nibs! +2 points`);
          changes.logs = this.logs;
        }

        changes.flipped = this.flipped.toPlainObject();
      }
      await this.updateDBState(changes);
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
      await this.updateDBState({
        players: this.players.map(p => p.toPlainObject()),
        teams: this.teams.map(team => team.toPlainObject()),
        ended: true,
        logs: this.logs
      });
      return;
    }

    this.nextPlayer(true);

    //Doing this twice as nextPlayer could have updated the player counts after end round
    if(this.ended){
      await this.updateDBState({
        players: this.players.map(p => p.toPlainObject()),
        teams: this.teams.map(team => team.toPlainObject()),
        ended: true,
        logs: this.logs
      });
      return;
    }

    let changes: Record<string, any> = {
      players: this.players.map(p => p.toPlainObject()),
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
        crib_owner: this.crib_owner,
        deck: this.deck.toPlainObject(),
        roundState: this.roundState,
      }
    }

    //Updates last played and pegging arrays for all players
    await this.updateDBState(changes);
  }

  checkIfWon(player: Player){
    let team = this.findTeamByPlayer(player)!;

    if (team.score >= this.point_goal){
      this.ended = true;
      this.addLog(`${player.name} won the game!`);
    }
  }

  nextPlayer(pegging = false): void {
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

        this.endRound(index);
      }
    }
    else{
      const index = this.players.findIndex(player => player.name === this.crib_owner);
      //Just get the next player in the array
      this.currentPlayer = this.players[(index + 1) % this.players.length];
      this.crib_owner = this.currentPlayer.name;
      this.addLog(`${this.crib_owner} is the new crib owner.`);
    }
  }


  //Returns true when entire pegging round is done. False if just resetting loop
  endRound(index: number){
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
      this.countCrib();

      //If a player got over the point goal don't need to deal with rest of it
      if (this.ended) return;

      this.deck.resetDeck();
      this.deal();
      this.setFlipped();
      this.roundState = RoundState.Throwing;
      this.flipped = new Card(0);
      this.nextPlayer();
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
    const currIndex = this.players.findIndex(player => player.name == this.crib_owner)!;

    //Have to count the hands in order
    for(let i = 0; i <= this.players.length && !this.ended; i++){
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
      points += this.findFlush(hand);
      
      this.findTeamByPlayer(player)!.score += points;
      player.score += points;
      this.addLog(`${player.name} got ${points} points with hand ${player.hand.map(card => card.toHTML())}`);
    
      this.checkIfWon(player);
    }
  }

  countCrib(){
    if (this.ended) return;

    let points = 0;
    let hand = [...this.crib];

    //Do flush/nobs first as it doesn't need to be sorted and a card being the flipped one matters
    points += this.findFlush(hand);
    points += this.findNobs(hand);

    hand.push(this.flipped);
    hand.sort((a,b) => a.toInt() - b.toInt());

    points += this.find15s(hand);
    points += this.findPairs(hand);
    points += this.findRuns(hand);
    points += this.findFlush(hand);

    const player = this.players.find(player => player.name == this.crib_owner)!;
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

    const suits = cards.map(card => card.suit);

    //If only one suit was found in the set you have a flush
    if (new Set(suits).size === 1) {
      //check to see if flipped matches to return extra point (dont if crib)
      return this.flipped.suit == suits[0] && !crib ? cards.length + 1 : cards.length;
    }
    return 0;
  } 

  findNobs(cards: Card[]): number{
    const hasNobs = cards.some(card => card.value == 'J' && this.flipped.suit == card.suit)

    return hasNobs ? 1 : 0;
  }
}