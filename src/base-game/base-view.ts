/****************************************************************************
 * 
 *  Base View (Parent of all game Views)
 * 
 *      Handles all game elements and renders them according to the state they were sent from controller
 *      Implements the render for core elements each game has in their game
 *          hand, opponents so on
 * 
 ****************************************************************************/

import { CatSheet, GenshinSheet, HollowSheet, PokemonSheet, SpriteSheet, StarWarsSheet } from "../spritesheets";
import { CardPlain, PlayerPlain, TeamPlain } from "../types";

export abstract class BaseView {
  //SpriteSheet is a purely visual class. No knowledge of game rules/logic so it's okay to have in the View
  private spriteSheet: SpriteSheet;
  constructor() {
    this.spriteSheet = new SpriteSheet();
  }

  //Basic Render of the Game
  render(state: any, localPlayerId: string, onCardClick?: (cardId: number) => void) {
    this.renderScoreboard(state);
    this.renderOpponents(state, localPlayerId);
    this.renderLogs(state);
    this.renderHand(state, localPlayerId, onCardClick);
    this.renderPlayed(state, localPlayerId);
  }

  abstract renderGameOptions(options: any): void;
  abstract createIndicators(opponent: PlayerPlain): HTMLDivElement[];

  //Render local player's hand
  renderHand(state: any, localPlayerId: string, onCardClick?: (cardId: number) => void) {
    const player = state.players[localPlayerId];
    if (!player) return;

    const handContainer = document.getElementById('hand');
    if (!handContainer) return;

    handContainer.innerHTML = '';

    const unplayed = player.hand.filter((card: CardPlain) => !player.playedCards.some((pc:CardPlain) => pc.id === card.id));
    unplayed.forEach((card: CardPlain) => {
      const cardEl = this.createCardElement(card, {
        startsFlipped: true,
        clickable: !!onCardClick,
        container: handContainer,
        onClick: onCardClick
      });
      handContainer.appendChild(cardEl);
    });
  }

  // Render played cards for local player
  renderPlayed(state: any, localPlayerId: string) {
    const player = state.players[localPlayerId];
    if (!player) return;
    const playedContainer = document.getElementById('played-container');
    if (!playedContainer) return;

    playedContainer.innerHTML = '';
    player.playedCards.forEach((card: CardPlain) => {
      const cardEl = this.createCardElement(card, { startsFlipped: true, container: playedContainer });
      playedContainer.appendChild(cardEl);
    });

    // Apply basic layout offsets
    const cards = Array.from(playedContainer.children) as HTMLElement[];
    cards.forEach((card, i) => {
      card.style.left = `${i * -65}px`;
      card.style.zIndex = `${i}`;
    });
  }

  // Render opponents block
  renderOpponents(state: any, localPlayerId: string) {
    const opponents = Object.fromEntries(Object.entries(state.players).filter(([id]) => id !== localPlayerId)) as Record<string, PlayerPlain>;
    const opponentContainer = document.getElementById('opponents')!;

    opponentContainer.innerHTML = '';
    const rect = opponentContainer.getBoundingClientRect();

    Object.values(opponents).forEach((opp: PlayerPlain, index: number) => {
      const opponentDiv = document.createElement('div');
      opponentDiv.classList.add('opponent');
      opponentDiv.style.width = `${rect?.width / Math.ceil(Math.sqrt(Object.keys(opponents).length))}px`; //Dividing width equally between opponents
      opponentDiv.style.height = `${rect?.height}px`;

      const name = document.createElement('div');
      name.classList.add('opponent-name');
      name.textContent = opp.name;

      const oppInfo = document.createElement('div');
      oppInfo.style.display = 'flex';
      oppInfo.style.justifyContent = 'center';
      oppInfo.appendChild(name);

      this.createIndicators(opp).forEach(indicator => {
        oppInfo.appendChild(indicator);
      });

      opponentDiv.appendChild(oppInfo);

      const oppCards = document.createElement('div');
      oppCards.classList.add('opp-cards');
      opponentDiv.appendChild(oppCards);

      //Request is here so that oppCards container size is set in order for the cards to be sized correctly (otherwise they are invisible)
      requestAnimationFrame(() =>{
        opp.hand.forEach((card: CardPlain) => {
          const cardDiv = this.createCardElement(card, { container: oppCards });
          cardDiv.style.pointerEvents = 'none';
          oppCards.appendChild(cardDiv)
        });
      });

      opponentContainer.appendChild(opponentDiv);

      //Adds a line to divide opponents (except after last opponent)
      if (index + 1 !== Object.keys(opponents).length) {
        const divideLine = document.createElement('div');
        divideLine.classList.add('divide-line');
        opponentContainer.appendChild(divideLine);
      }
    });
  }

  // Render teams and players scores
  renderScoreboard(state: any) {
    const container = document.getElementById('scoreboard');
    if (!container) return;
    container.innerHTML = '';

    var teams = state.teams as Record<string, TeamPlain>;

    Object.values(teams).forEach((team: TeamPlain) => {
      const teamDiv = document.createElement('div');
      teamDiv.className = 'team';

      const teamHeader = document.createElement('div');
      teamHeader.className = 'team-header';
      teamHeader.innerHTML = `
        <span class="team-name">${team.name}:  </span>
        <span class="team-score">${team.score}</span>
      `;
      teamDiv.appendChild(teamHeader);

      const playersDiv = document.createElement('div');
      playersDiv.className = 'players';

      team.playerIds.forEach((id: string) => {
        const player = state.players[id];
        if (!player) return;
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.innerHTML = `
          <span class="player-name">${player.name}</span>
          <span class="player-score">${player.score}</span>
        `;
        playersDiv.appendChild(playerDiv);
      });

      teamDiv.appendChild(playersDiv);
      container.appendChild(teamDiv);
    });
  }

  // Render logs box all in entirety
  renderLogs(state: any) {
    const logBox = document.getElementById('logs');
    if (!logBox) return;
    logBox.innerHTML = '';

    const logs = Array.isArray(state?.logs) ? state.logs : [];

    logs.forEach((log: string) => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = log;
      logBox.appendChild(entry);
    });
  }

  //Just add a log to the log box
  renderLog(log: string) {
    const logBox = document.getElementById('logs');
    if (!logBox) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = log;
    logBox.appendChild(entry);
  }

  //Played Animation Placeholder TODO: Implement Later? eventually.....
  animatePlay(playerId: string, card: CardPlain) {
    console.log(`Animate play for ${playerId} ${card.id}`);
  }

  // Enables/disables the local hand UI
  setHandEnabled(enabled: boolean) {
    const hand = document.getElementById("hand")!;
    enabled ? hand.classList.remove('hand-disabled') : hand.classList.add('hand-disabled');
  }

  //Render the Winner! (and the losers I suppose)
  renderWinner(winner: any, losers: any) {
    const winnerPopup = document.getElementById('winner-overlay');
    if (!winnerPopup) return;
    winnerPopup.style.display = 'flex';

    const winners = document.getElementById('winners');
    if (!winners) return;
    winners.innerHTML = `Winner: ${winner.name}!`;
    const loserEl = document.createElement("h2");
    
    loserEl.innerHTML = `
        <strong>Losers:</strong><br>
        ${losers.map((team: any) => `${team.name}: ${team.score}`).join("<br>")}
    `;
    
    winners.appendChild(loserEl);
  }

  setSpriteSheet(sheet: string) {
    switch(sheet){
      case "Classic":
        this.spriteSheet = new SpriteSheet();
        break;
      case "Cats":
        this.spriteSheet = new CatSheet();
        break;
      case "StarWars":
        this.spriteSheet = new StarWarsSheet();
        break;
      case "Genshin":
        this.spriteSheet = new GenshinSheet();
        break;
      case "Hollow":
        this.spriteSheet = new HollowSheet();
        break;
      case "Pokemon":
        this.spriteSheet = new PokemonSheet();
        this.spriteSheet.setImage(); //Have to do this to rando the cards you get
        break;
      default:
        this.spriteSheet = new SpriteSheet();
    }
  }

  createCardElement(card: CardPlain, options: { container?: HTMLElement; startsFlipped?: boolean; clickable?: boolean; onClick?: (cardId: number) => void } = {}) {
    const {
      container = document.getElementById('hand')!,
      startsFlipped = false,
      clickable = false,
      onClick
    } = options;

    const cardDiv = document.createElement('div');
    options.container?.appendChild(cardDiv);

    const style = getComputedStyle(container);
    const containerRect = container.getBoundingClientRect();
    const height = containerRect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const width = containerRect.height / 2;

    const { bgWidth, bgHeight } = this.spriteSheet.getBackgroundSize(width, height);

    //Maps the value of the cards to the column they exist in the spritesheet
    const valueToInt = (value: string, counting = false) => {
      switch (value) {
        case 'A': return 1;
        case 'J': return counting ? 10 : 11;
        case 'Q': return counting ? 10 : 12;
        case 'K': return counting ? 10 : 13;
        case 'JK': return (card.suit == "Red") ? 1 : 2;
        default: return parseInt(value);
      }
    };

    //Finds what row the card is apart of in spritesheet
    const getRowFromSuit = (suit: string) => {
      switch (suit) {
        case 'Clubs': return 0;
        case 'Diamonds': return 1;
        case 'Hearts': return 2;
        case 'Spades': return 3;
        default: return 4;
      }
    };

    const colRow = this.spriteSheet.getCardLocation(valueToInt(card.value), getRowFromSuit(card.suit), width, height);

    cardDiv.className = 'card' + (startsFlipped || card.isFlipped ? '' : ' flipped');
    cardDiv.setAttribute('card-id', String(card.id));
    cardDiv.style.height = `${height}px`;
    cardDiv.style.width = `${width}px`;

    //Hinge for the animations?
    const hinge = document.createElement('div');
    hinge.className = 'card-hinge';

    //Face of the Card
    const face = document.createElement('div');
    face.className = 'card-face';
    face.style.backgroundPosition = `${colRow.col}px ${colRow.row}px`;
    face.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
    face.style.backgroundImage = this.spriteSheet.getImage();

    //Back of the Card
    const back = document.createElement('div');
    back.className = 'card-back';
    const backPos = this.spriteSheet.getCardLocation(this.spriteSheet.back_col, this.spriteSheet.back_row, width, height);
    back.style.backgroundPosition = `${backPos.col}px ${backPos.row}px`;
    back.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
    back.style.backgroundImage = this.spriteSheet.getImage();

    hinge.appendChild(face);
    hinge.appendChild(back);
    cardDiv.appendChild(hinge);

    if (clickable && onClick) {
      cardDiv.addEventListener('click', () => {onClick(card.id);});
      cardDiv.style.cursor = 'pointer';
    }

    return cardDiv;
  }
}
