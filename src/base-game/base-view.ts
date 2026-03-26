/****************************************************************************
 * 
 *  Base View (Parent of all game Views)
 * 
 *      Handles all game elements and renders them according to the state they were sent from controller
 *      Implements the render for core elements each game has in their game
 *          hand, opponents so on
 * 
 ****************************************************************************/

import { Card } from "../card";
import { CatSheet, GenshinSheet, HollowSheet, PokemonSheet, SpriteSheet, StarWarsSheet } from "../spritesheets";
import { CardPlain, PlayerPlain, TeamPlain } from "../types";

//These will have functionality set up to them in Controller
export type BaseViewHandlers = {
  onStart: () => Promise<void>;
  onTeamNameChange: (teamIndex: number, name: string) => Promise<void> | void;
  onAddTeam: () => Promise<void> | void;
  onRemoveTeam: () => Promise<void> | void;
  onRandomize: (size: number) => Promise<void> | void;
  onMovePlayer: (playerId: string, fromIndex: number, toIndex: number) => Promise<void> | void;
};



export abstract class BaseView {
  //SpriteSheet is a purely visual class. No knowledge of game rules/logic so it's okay to have in the View
  private spriteSheet: SpriteSheet;
  private handlers!: BaseViewHandlers;
  constructor() {
    this.spriteSheet = new SpriteSheet();
  }

  abstract createIndicators(opponent: PlayerPlain): HTMLDivElement[];

  //Sets up listeners for waiting overlay Events
  attachBasicControls() {
    document.getElementById('start-game')?.addEventListener('click', async () => {
      await this.handlers.onStart?.();
    });
  }

  //Outer call to set up listeners
  setHandlers(h: BaseViewHandlers) {
    this.handlers = h;
    this.attachBasicControls();
  }

  //Basic Render of the Game
  render(state: any, localPlayerId: string, onCardClick?: (cardId: number) => void) {
    this.showWaitingOverlay(!state.started);
    this.renderScoreboard(state);
    this.renderOpponents(state, localPlayerId);
    this.renderLogs(state);
    this.renderHand(state, localPlayerId, onCardClick);
    this.renderPlayed(state, localPlayerId);
  }

  renderPlayerList(players: any[]) {
    const list = document.getElementById('waiting-list');
    if (!list) return;
    list.innerHTML = `
      <div class="waiting-list-container">
        <h3 class="waiting-title">Players in room:</h3>
        ${players.map(p => `<div class="player-name">${p.name}</div>`).join('')}
      </div>
    `;
  }

  //Renders Team containers in the Waiting overlay where teams can be edited
  renderTeams(teams: any[], players: any[]) {
    const innerContainer = document.getElementById('teams-container');
    if (!innerContainer) return;

    innerContainer.innerHTML = "";

    // Recreate teams section
    let teamsContainer = document.getElementById('teams');
    if (!teamsContainer) {
      teamsContainer = document.createElement('div');
      teamsContainer.id = 'teams';
    }
    teamsContainer.innerHTML = '';

    const columnsWrapper = document.createElement('div');
    columnsWrapper.id = 'team-column-wrapper';

    teams.forEach((team: any, teamIndex: number) => {
      const column = document.createElement('div');
      column.className = 'team-column';

      const teamNameInput = document.createElement('input');
      teamNameInput.id = `team-name`;
      teamNameInput.value = team.name;
      teamNameInput.addEventListener('blur', async () => {
        const newName = teamNameInput.value.trim();
        if (newName !== team.name && newName !== '') {
          await this.handlers.onTeamNameChange(teamIndex, newName);
        }
      });
      column.appendChild(teamNameInput);

      team.playerIds.forEach((id: string) => {
        column.appendChild(this.createPlayerElement(players, id, teamIndex, teams.length));
      });

      columnsWrapper.appendChild(column);
    });

    // Add switching team controls
    const addDel = document.createElement('div');
    addDel.id = 'add-del-container';

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Team';
    addBtn.className = 'add-del-btn';
    addBtn.onclick = async () => await this.handlers.onAddTeam();

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Remove Team';
    delBtn.className = 'add-del-btn';
    delBtn.onclick = async () => await this.handlers.onRemoveTeam();

    addDel.appendChild(addBtn);
    addDel.appendChild(delBtn);

    teamsContainer.appendChild(columnsWrapper);
    teamsContainer.appendChild(addDel);

    innerContainer.prepend(teamsContainer);
  }

  createPlayerElement(players: PlayerPlain[], playerId: string, teamIndex: number, teamAmount: number): HTMLDivElement{
      const player = document.createElement('div');
      player.className = 'team-player';
      const nameSpan = document.createElement("span");
      const name = players.find(p => p.id === playerId)?.name;

      if (!name) return document.createElement("div");
      nameSpan.textContent = name;

      const controls = document.createElement("div");

      if (teamIndex > 0) {
        const leftBtn = document.createElement("button");
        leftBtn.className = "move-player";
        leftBtn.textContent = "←";
        leftBtn.onclick = async () => {
          this.handlers.onMovePlayer(playerId, teamIndex, teamIndex - 1);
        };
        controls.appendChild(leftBtn);
      }

      if (teamIndex < teamAmount - 1) {
        const rightBtn = document.createElement("button");
        rightBtn.className = "move-player";
        rightBtn.textContent = "→";
        rightBtn.onclick = async () => {
          this.handlers.onMovePlayer(playerId, teamIndex, teamIndex + 1);
        };
        controls.appendChild(rightBtn);
      }

      player.appendChild(nameSpan);
      player.appendChild(controls);
      return player;
  }

  // Expose the game view instance so controllers can wire a game controller to the same vie
  showWaitingOverlay(show: boolean) {
    const el = document.getElementById('waiting-overlay')!;
    el.style.display = show ? 'flex' : 'none';
  }



  //This just sets up/creates the Game options container
  //Games will implement what actually goes in here (if applicable)
  renderGameOptions(options: any) {
    const optionsContainer = document.getElementById('options-container')!;
    const line = document.getElementById('divide')!;

    let modeContainer = document.getElementById('game-options');
    if (!modeContainer) {
      modeContainer = document.createElement('div');
      modeContainer.id = 'game-options';

      line.style.display = "flex"; //Make divide line visible
      optionsContainer.appendChild(modeContainer);
    }
  };

  //Render local player's hand
  renderHand(state: any, localPlayerId: string, onCardClick?: (cardId: number) => void) {
    const player = state.players[localPlayerId];
    if (!player) return;

    const handContainer = document.getElementById('hand');
    if (!handContainer) return;

    handContainer.innerHTML = '';

    let unplayed = player.hand.filter((card: CardPlain) => !player.playedCards.some((pc:CardPlain) => pc.id === card.id));

    unplayed = Card.sort(unplayed);

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
      name.style.color = opp.roleColor;

      const oppInfo = document.createElement('div');
      oppInfo.style.display = 'flex';
      oppInfo.style.justifyContent = 'center';
      oppInfo.appendChild(name);

      this.createIndicators(opp).forEach(indicator => {
        oppInfo.appendChild(indicator);
      });

      opponentDiv.appendChild(oppInfo);

      // Create containers for unplayed and played
      const oppUnplayed = document.createElement('div');
      oppUnplayed.classList.add('opp-unplayed');
      opponentDiv.appendChild(oppUnplayed);

      const oppPlayed = document.createElement('div');
      oppPlayed.classList.add('opp-played');
      opponentDiv.appendChild(oppPlayed);

      // Request is here so that card containers sizes are set in order for the cards to be sized correctly (otherwise they are invisible)
      requestAnimationFrame(() =>{
        // Unplayed (cards still in opponent's hand) - show as face-down stacked
        const unplayedCards = opp.hand.filter((c: CardPlain) => !c.isPlayed);
        unplayedCards.forEach((card: CardPlain) => {
          const cardDiv = this.createCardElement(card, { container: oppUnplayed });
          oppUnplayed.appendChild(cardDiv);
        });

        // Played - show face-up, stacked with latest on top
        opp.playedCards.forEach((card: CardPlain) => {
          const cardDiv = this.createCardElement(card, { container: oppPlayed, startsFlipped: true });
          oppPlayed.appendChild(cardDiv);
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
        
        const name = document.createElement('span');
        name.textContent = player.name;
        if(player.roleColor === "neutral"){
          //Set's the player back to the themed text color
          name.style.color = getComputedStyle(document.body)
            .getPropertyValue('--text-color')
            .trim();
        }
        else{
          name.style.color = player.roleColor;
        }

        const score = document.createElement('span');
        score.textContent = player.score;

        playerDiv.appendChild(name);
        playerDiv.appendChild(score);
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

    logBox.scrollTop = logBox.scrollHeight; //Auto scroll to bottom
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
  renderWinner(winner: any, losers: any, winnerPlayers: any) {
    const winnerPopup = document.getElementById('winner-overlay');
    if (!winnerPopup) return;
    winnerPopup.style.display = 'flex';

    const winners = document.getElementById('winners');
    if (!winners) return;
    winners.innerHTML = `
      <div id="winner-team">${winner.name} Won!</div><div class="winner-player">
      ${winnerPlayers.map(((player: any) => `${player.name}: ${player.score}`)).join("<div>")}`;

    const loserEl = document.createElement("div");
    
    loserEl.innerHTML = `
        <div id="losers">Losers:</div><div class="loser-team">
        ${losers.map((team: any) => `${team.name}: ${team.score}`).join("<div>")}
    `;
    
    winnerPopup.appendChild(loserEl);
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
