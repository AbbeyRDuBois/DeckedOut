import { Card } from "../deck";
import { BaseGame } from "./base-game";

  export function renderHand(game: BaseGame) {
    const currentId = localStorage.getItem("playerId");
    const player = game.getPlayers().find(player => player.id === currentId)!;
    const handContainer = document.getElementById('hand')!;

    game.setHandState(player);

    handContainer.innerHTML = '';

    const unplayedCards = player.hand.filter(card => !player.playedCards.some(played => played.id === card.id));
    unplayedCards.forEach((card: Card) => {
        handContainer.appendChild(card.createCard(true, game.cardClick));
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
        const cardBack = (new Card(1, "","")).createCard();
        cardBack.innerHTML = `${(opponent.hand?.length - opponent.playedCards.length) || 0}`;
        cardBack.className = ''; 
        cardBack.classList.add('card-back');

        const opponentDiv = document.createElement('div');
        opponentDiv.classList.add('opponent');

        const opponentName = document.createElement('div');
        opponentName.classList.add('opponent-name');
        opponentName.textContent = opponent.name;

        const handInfo = document.createElement('div');
        handInfo.classList.add('hand-info');

        handInfo.appendChild(cardBack);
        var oppCard;
        if (opponent.lastPlayed) {
          oppCard = opponent.lastPlayed.createCard();
        }
        else{
          oppCard = (new Card(1, "","")).createCard();
        }

        oppCard.className = ''; 
        oppCard.innerHTML = opponent.lastPlayed == null ? "" : opponent.lastPlayed.toHTML();
        oppCard.classList.add('opp-played');

        handInfo.appendChild(oppCard);
        
        opponentDiv.appendChild(opponentName);
        opponentDiv.appendChild(handInfo);
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