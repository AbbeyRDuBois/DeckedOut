import { Card } from "../deck";
import { Player } from "../player";
import { BaseGame } from "./base-game";

  export function renderHand(game: BaseGame) {
    const currentId = localStorage.getItem("playerId");
    const player = game.getPlayers().find(player => player.id === currentId)!;
    const handContainer = document.getElementById('hand')!;

    game.setHandState(player);

    handContainer.innerHTML = '';

    const unplayedCards = player.hand.filter(card => !player.playedCards.some(played => played.id === card.id));
    unplayedCards.forEach((card: Card) => {
        handContainer.appendChild(card.createCard({startsFlipped: true, clickable: true, onClick: game.cardClick}));
    });
  }

  export function renderScoreboard(game: BaseGame) {
    const scoreboard = document.getElementById('scoreboard')!;
    scoreboard.innerHTML = ''; // clears old content

    //For each team now update scoreboard
    game.getTeams().forEach(team => { 
      const div = document.createElement('div');
      div.classList.add('team');
      div.innerHTML=`
        <div class="team-name">${team.name}</div>
        <div class="team-score">${team.score}</div>
      `;
      scoreboard.appendChild(div);
    })
  }

  export function renderOpponents(game: BaseGame) {
    const opponents = game.getPlayers().filter(p => p.id !== localStorage.getItem('playerId'));
    const opponentContainer = document.getElementById('opponents')!;
    opponentContainer.innerHTML = ''; // clears old content
    opponents.forEach(opponent => {
        const opponentDiv = document.createElement('div');
        opponentDiv.classList.add('opponent');

        const opponentName = document.createElement('div');
        opponentName.classList.add('opponent-name');
        opponentName.textContent = opponent.name;

        const cardRow = document.createElement('div');
        cardRow.classList.add('card-row');

        opponent.hand.forEach(card => {
          //TODO: Fix the hardcoded values
          const cardDiv = card.createCard({width: 40, height:60});
          cardDiv.classList.add('opp-card');
          cardRow.appendChild(cardDiv);
        });

        const oppInfo = document.createElement('div');
        oppInfo.style.display = 'flex';
        oppInfo.style.justifyContent = 'center';

        oppInfo.appendChild(opponentName);
        game.createIndicators(opponent.id).forEach(indicator => {
          oppInfo.appendChild(indicator);
        });

        opponentDiv.appendChild(oppInfo);
        opponentDiv.appendChild(cardRow);
        opponentContainer.appendChild(opponentDiv);
    });
}

export function renderLogs(game: BaseGame){
  const logBox = document.getElementById('logs')!;
  logBox.innerHTML = '';
  game.getLogs().forEach(log => {
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = log;
    logBox.appendChild(logEntry);
  });

  // Auto-scroll to bottom
  logBox.scrollTop = logBox.scrollHeight;
}

type IndicatorConfig = {
  name: string;
  isActive: (player: Player) => boolean;
  indicatorId?: string;
};

export function renderIndicators(
  game: BaseGame,
  indicators: IndicatorConfig[],
) {
  game.getPlayers().forEach(player => {
    indicators.forEach(({ name, isActive, indicatorId }) => {
      const defaultId =
        player.id === localStorage.getItem('playerId')
          ? `local-${name}-indicator`
          : `${name}-indicator-${player.id}`;

      const indicator = document.getElementById(indicatorId ? indicatorId : defaultId);
      if (!indicator) return;

      if (isActive(player)) {
        indicator.classList.add("active");
      } else {
        indicator.classList.remove("active");
      }
    });
  });
}