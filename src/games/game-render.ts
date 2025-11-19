import { stringify } from "uuid";
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
      handContainer.appendChild(card.createCard(game.getSpriteSheet(), {startsFlipped: true, clickable: true, onClick: game.cardClick}));
  });
}

export function renderScoreboard(game: BaseGame) {
  const container = document.getElementById("scoreboard")!;
  container.innerHTML = "";

  game.getTeams().forEach(team => {
    // Team Container
    const teamDiv = document.createElement("div");
    teamDiv.className = "team";

    const teamHeader = document.createElement("div");
    teamHeader.className = "team-header";
    teamHeader.innerHTML = `
      <span class="team-name">${team.name}:  </span>
      <span class="team-score" id="team-score">${team.score}</span>
    `;
    teamDiv.appendChild(teamHeader);

    // Players list
    const playersDiv = document.createElement("div");
    playersDiv.className = "players";

    team.playerIds.forEach(id => {
      const player = game.getPlayerById(id)!;
      const playerDiv = document.createElement("div");
      playerDiv.className = "player";
      playerDiv.innerHTML = `
        <span class="player-name">${player.name}</span>
        <span class="player-score" id="player-score">${player.score}</span>
      `;
      playersDiv.appendChild(playerDiv);
    });

    teamDiv.appendChild(playersDiv);
    container.appendChild(teamDiv);
  });
}

export function renderPointDiff(playerName: string, pointDiff: number) {
  //Get player name components from scoreboard
  const container = document.getElementById("scoreboard")!;
  const spans = container.getElementsByTagName('span');

  //Find correct player
  for (let i = 0; i < spans.length; i++) {
    //If correct player, set x,y and add plus indicator as needed
    if (spans[i].textContent == playerName) {
      const pointLabel = document.createElement("label");
      pointLabel.style.height = (parseInt(spans[i].style.height.slice(0, -2)) - 20).toString() + "px";
      pointLabel.style.width = (parseInt(spans[i].style.width.slice(0, -2)) - 20).toString() + "px";
      pointLabel.textContent = pointDiff >= 0 ? "+" + pointDiff.toString() : pointDiff.toString(); //Add a plus sign if positive

      //Add fade out
      // pointLabel.style.opacity = "1";
      // pointLabel.style.transition = "opacity 2s ease-out;";
      let opacity = 1;
      const fadeInterval = setInterval(() => {
          if (opacity > 0) {
            opacity -= .05;
            pointLabel.style.opacity = opacity.toString();
          } else {
            clearInterval(fadeInterval);
            pointLabel.remove()
          }
      }, 10);
    }
  }
}

export function renderOpponents(game: BaseGame) {
  const opponents = game.getPlayers().filter(p => p.id !== localStorage.getItem('playerId'));
  const opponentContainer = document.getElementById('opponents')!;
  opponentContainer.innerHTML = '';

  opponents.forEach((opponent, index) => {
      const opponentDiv = document.createElement('div');
      opponentDiv.classList.add('opponent');

      const opponentName = document.createElement('div');
      opponentName.classList.add('opponent-name');
      opponentName.textContent = opponent.name;

      const cardRow = document.createElement('div');
      cardRow.classList.add('card-row');

      opponent.hand.forEach(card => {
        //TODO: Fix the hardcoded values?
        const cardDiv = card.createCard(game.getSpriteSheet(), {width: 40, height:60});
        cardDiv.classList.add('small-card');
        cardRow.appendChild(cardDiv);
      });

      const oppInfo = document.createElement('div');
      oppInfo.style.display = 'flex';
      oppInfo.style.justifyContent = 'center';
      oppInfo.style.height = '25px';

      oppInfo.appendChild(opponentName);
      game.createIndicators(opponent.id).forEach(indicator => {
        oppInfo.appendChild(indicator);
      });

      opponentDiv.appendChild(oppInfo);
      opponentDiv.appendChild(cardRow);
      opponentContainer.appendChild(opponentDiv);


      //Adds a line to divide opponents (except after last opponent)
      if(index + 1 != opponents.length){
        const divideLine = document.createElement('div');
        divideLine.classList.add("divide-line");
        opponentContainer.appendChild(divideLine);
      }
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

export function renderPlayed(game: BaseGame) {
  const currentId = localStorage.getItem("playerId");
  const player = game.getPlayers().find(player => player.id === currentId)!;
  const playedContainer = document.getElementById("played-container")!;

  playedContainer.innerHTML = '';

  player.playedCards.forEach((card: Card) => {
      playedContainer.appendChild(card.createCard(game.getSpriteSheet(), {startsFlipped: true, clickable: true, onClick: game.cardClick}));
  });
}