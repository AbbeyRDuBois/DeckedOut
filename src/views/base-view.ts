import { SpriteSheet } from "../models/spritesheets";
import { CardPlain, IndicatorDescriptor, PlayerPlain, TeamPlain } from "./types";

export type GameState = {
  players: PlayerPlain[];
  teams: TeamPlain[];
  currentPlayerId?: string | null;
  logs: string[];
  [key: string]: any; // allow game-specific extensions
};

export class BaseView {
  // Top-level render orchestration
  // Accepts an options object with handlers and an optional spriteSheet
  render(state: GameState, localPlayerId: string, options?: { onCardClick?: (cardId: number) => void; spriteSheet?: any }) {
    this.renderScoreboard(state);
    this.renderOpponents(state, localPlayerId, options?.spriteSheet, options?.onCardClick);
    this.renderLogs(state);
    this.renderHand(state, localPlayerId, options?.spriteSheet, options?.onCardClick);
    this.renderPlayed(state, localPlayerId, options?.spriteSheet);
  }

  // Render local player's hand. Controller supplies click handler and (optionally) a spriteSheet
  renderHand(state: GameState, localPlayerId: string, spriteSheet?: any, onCardClick?: (cardId: number) => void) {
    const player = state.players.find(p => p.id === localPlayerId);
    if (!player) return;

    const handContainer = document.getElementById('hand');
    if (!handContainer) return;

    // Let the controller decide if the hand should be enabled; view just renders
    handContainer.innerHTML = '';

    const unplayed = player.hand.filter(card => !player.playedCards.some(pc => pc.id === card.id));
    unplayed.forEach(card => {
      const cardEl = this.createCardElement(card, spriteSheet, {
        startsFlipped: true,
        clickable: !!onCardClick,
        container: handContainer,
        onClick: () => onCardClick ? onCardClick(card.id) : undefined
      });
      cardEl.dataset.cardId = String(card.id);
    });
  }

  // Render played cards for local player
  renderPlayed(state: GameState, localPlayerId: string, spriteSheet?: any) {
    const player = state.players.find(p => p.id === localPlayerId);
    if (!player) return;
    const playedContainer = document.getElementById('played-container');
    if (!playedContainer) return;

    playedContainer.innerHTML = '';
    player.playedCards.forEach(card => {
      const cardEl = this.createCardElement(card, spriteSheet, { startsFlipped: true, container: playedContainer });
      // appended by helper
    });

    // Apply basic layout offsets
    const cards = Array.from(playedContainer.children) as HTMLElement[];
    cards.forEach((card, i) => {
      card.style.left = `${i * -65}px`;
      card.style.zIndex = `${i}`;
    });
  }

  // Render opponents block
  renderOpponents(state: GameState, localPlayerId: string, spriteSheet?: any, onCardClick?: (cardId: number) => void) {
    const opponents = state.players.filter(p => p.id !== localPlayerId);
    const opponentContainer = document.getElementById('opponents');
    if (!opponentContainer) return;

    opponentContainer.innerHTML = '';
    const rect = opponentContainer.getBoundingClientRect();

    opponents.forEach((opp, index) => {
      const opponentDiv = document.createElement('div');
      opponentDiv.classList.add('opponent');
      opponentDiv.style.width = `${rect?.width / Math.ceil(Math.sqrt(opponents.length))}px`;
      opponentDiv.style.height = `${rect?.height}px`;

      const name = document.createElement('div');
      name.classList.add('opponent-name');
      name.textContent = opp.name;

      const oppInfo = document.createElement('div');
      oppInfo.style.display = 'flex';
      oppInfo.style.justifyContent = 'center';
      oppInfo.appendChild(name);

      opponentDiv.appendChild(oppInfo);

      const oppCards = document.createElement('div');
      oppCards.classList.add('opp-cards');
      opponentDiv.appendChild(oppCards);

      opp.hand.forEach(card => {
        const cardDiv = this.createCardElement(card, spriteSheet, { container: oppCards });
        cardDiv.style.pointerEvents = 'none';
      });

      opponentContainer.appendChild(opponentDiv);

      if (index + 1 !== opponents.length) {
        const divideLine = document.createElement('div');
        divideLine.classList.add('divide-line');
        opponentContainer.appendChild(divideLine);
      }
    });
  }

  // Render teams and players scores
  renderScoreboard(state: GameState) {
    const container = document.getElementById('scoreboard');
    if (!container) return;
    container.innerHTML = '';

    state.teams.forEach(team => {
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

      team.playerIds.forEach(id => {
        const player = state.players.find(p => p.id === id);
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

  // Render logs box (idempotent)
  renderLogs(state: GameState) {
    const logBox = document.getElementById('logs');
    if (!logBox) return;
    logBox.innerHTML = '';

    state.logs.forEach(log => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = log;
      logBox.appendChild(entry);
    });

    logBox.scrollTop = logBox.scrollHeight;
  }

  // Convert indicator descriptors into DOM toggles
  renderIndicatorsFromDescriptors(descriptors: IndicatorDescriptor[]) {
    descriptors.forEach(descriptor => {
      const el = document.getElementById(descriptor.id);
      if (!el) return;
      if (descriptor.isActive) el.classList.add('active'); else el.classList.remove('active');
    });
  }

  // Simple animation placeholder - views should animate between DOM elements
  animatePlay(playerId: string, card: CardPlain) {
    // Example: locate card DOM and add a CSS class/animation
    console.log(`Animate play for ${playerId} ${card.id}`);
  }

  // Enables/disables the local hand UI
  setHandEnabled(playerId: string, enabled: boolean) {
    const hand = document.getElementById('hand');
    if (!hand) return;
    if (!enabled) hand.classList.add('hand-disabled'); else hand.classList.remove('hand-disabled');
  }

  renderLog(log: string) {
    const logBox = document.getElementById('logs');
    if (!logBox) return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = log;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
  }

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

  createCardElement(card: CardPlain, spriteSheet: SpriteSheet, options: { container?: HTMLElement; startsFlipped?: boolean; clickable?: boolean; onClick?: (card: any, el: HTMLDivElement) => void } = {}) {
    const {
      container = document.getElementById('hand')!,
      startsFlipped = false,
      clickable = false,
      onClick
    } = options;

    // Resolve fields whether card is a model or plain object
    const cardData = {
      id: card.id,
      value: card.value ?? '',
      suit: card.suit ?? '',
      isFlipped: card.isFlipped ?? false
    };

    const style = getComputedStyle(container);
    const containerRect = container.getBoundingClientRect();
    const height = containerRect.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const width = containerRect.height / 2;

    const { bgWidth, bgHeight } = spriteSheet.getBackgroundSize(width, height);

    // valueToInt mapping (same logic as Card.toInt for face placement)
    const valueToInt = (value: string, counting = false) => {
      switch (value) {
        case 'A': return 1;
        case 'J': return counting ? 10 : 11;
        case 'Q': return counting ? 10 : 12;
        case 'K': return counting ? 10 : 13;
        case 'JK': return (cardData.suit == "Red") ? 1 : 2;
        default: return parseInt(value);
      }
    };

    const getRowFromSuit = (suit: string) => {
      switch (suit) {
        case 'Clubs': return 0;
        case 'Diamonds': return 1;
        case 'Hearts': return 2;
        case 'Spades': return 3;
        default: return 4;
      }
    };

    const colRow = spriteSheet.getCardLocation(valueToInt(cardData.value), getRowFromSuit(cardData.suit), width, height);

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card' + (startsFlipped || cardData.isFlipped ? '' : ' flipped');
    cardDiv.setAttribute('card-id', String(cardData.id));
    cardDiv.style.height = `${height}px`;
    cardDiv.style.width = `${width}px`;

    const hinge = document.createElement('div');
    hinge.className = 'card-hinge';

    const face = document.createElement('div');
    face.className = 'card-face';
    face.style.backgroundPosition = `${colRow.col}px ${colRow.row}px`;
    face.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
    face.style.backgroundImage = spriteSheet.getImage();

    const back = document.createElement('div');
    back.className = 'card-back';

    // back position
    const backPos = spriteSheet.getCardLocation(spriteSheet.back_col, spriteSheet.back_row, width, height);
    back.style.backgroundPosition = `${backPos.col}px ${backPos.row}px`;
    back.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
    back.style.backgroundImage = spriteSheet.getImage();

    hinge.appendChild(face);
    hinge.appendChild(back);
    cardDiv.appendChild(hinge);

    if (clickable && onClick) {
      cardDiv.addEventListener('click', () => onClick(card, cardDiv));
      cardDiv.style.cursor = 'pointer';
    }

    if (options.container) options.container.appendChild(cardDiv);

    return cardDiv;
  }
}
