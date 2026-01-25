/****************************************************************************
 * 
 *  Room View
 * 
 *      Renders Room elements
 *        Waiting Overlay, Settings Panel, So on ...
 * 
 ****************************************************************************/

import { BaseView } from "../base-game/base-view";

//These will have functionality set up to them in Controller
export type RoomViewHandlers = {
  onStart: () => Promise<void>;
  onLeave: () => Promise<void>;
  onCopyId: () => Promise<void> | void;
  onTeamNameChange: (teamIndex: number, name: string) => Promise<void> | void;
  onAddTeam: () => Promise<void> | void;
  onRemoveTeam: () => Promise<void> | void;
  onRandomize: (size: number) => Promise<void> | void;
  onThemeChange: (theme: string) => void;
  onCardThemeChange: (theme: string) => void;
  onSettingsToggle: () => Promise<void> | void;
  onMovePlayer: (playerId: string, fromIndex: number, toIndex: number) => Promise<void> | void;
  onRoleChange: (role: string) => void;
};

export class RoomView {
  private handlers!: RoomViewHandlers;
  private gameView: BaseView;

  //Set up the Listeners for events
  constructor(gameView: BaseView) {
    this.gameView = gameView;
  }

  //Outer call to set up listeners
  setHandlers(h: RoomViewHandlers) {
    this.handlers = h;
    this.attachBasicControls();
  }

  renderSettingsPanel(state: any) {
    const panel = document.getElementById('settings-panel')!
    panel.classList.toggle('closed', !state.settingsOpen);

    // Ensure selectors reflect the current state
    const themeSelector = document.getElementById('theme-selector') as HTMLSelectElement | null;
    if (themeSelector) themeSelector.value = state.theme || 'dark';
    const cardThemeSelector = document.getElementById('card-theme-selector') as HTMLSelectElement | null;
    if (cardThemeSelector) cardThemeSelector.value = state.cardTheme || 'Classic';
  }

  render(state: any) {
    // Apply persisted theme and card theme immediately
    document.body.setAttribute('data-theme', state.theme || 'dark');
    this.gameView.setSpriteSheet(state.cardTheme || 'Classic');
    this.renderSettingsPanel(state);

    this.renderPlayerList(state.players);
    this.renderTeams(state.teams, state.players);
    this.showWaitingOverlay(!state.started);
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
    const innerContainer = document.getElementById('inner-container');
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

  createPlayerElement(players: any[], playerId: string, teamIndex: number, teamAmount: number): HTMLDivElement{
      const player = document.createElement('div');
      player.className = 'team-player';
      const nameSpan = document.createElement("span");
      nameSpan.textContent = players.find((p: any) => p.id === playerId).name;

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

  //Loads the Unique content of the game into the UI
  async renderGameContent(gameType: string){
    const container = document.getElementById("center-content")!;
    const html = await fetch(`/${gameType}.html`).then(res => res.text());
    container.innerHTML = html;
    container.style.display = "block"

    await new Promise(requestAnimationFrame); //Waits for the new changes to load onto the page
  }

  // Expose the game view instance so controllers can wire a game controller to the same view
  getGameView() {
    return this.gameView;
  }
  showWaitingOverlay(show: boolean) {
    const el = document.getElementById('waiting-overlay')!;
    el.style.display = show ? 'flex' : 'none';
  }

  //Sets up listeners for all the click events
  attachBasicControls() {
    document.getElementById('start-game')?.addEventListener('click', async () => {
      await this.handlers.onStart?.();
    });

    document.querySelectorAll('.leave-room').forEach(btn => {
      btn.addEventListener('click', async () => {
        await this.handlers.onLeave?.();
      });
    });

    document.querySelectorAll('.copy-icon').forEach(copy => {
      copy.addEventListener('click', async () => {
        await this.handlers.onCopyId?.();
      });
    });

    const themeSelector = document.getElementById('theme-selector') as HTMLSelectElement | null;
    themeSelector?.addEventListener('change', () => this.handlers.onThemeChange(themeSelector.value));

    const cardThemeSelector = document.getElementById('card-theme-selector') as HTMLSelectElement | null;
    cardThemeSelector?.addEventListener('change', () => this.handlers.onCardThemeChange(cardThemeSelector.value));

    const toggle = document.getElementById('settings-toggle')!;
    toggle.addEventListener('click', () => this.handlers.onSettingsToggle());

    const buttons = document.querySelectorAll<HTMLButtonElement>('.role-btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.handlers.onRoleChange(btn.dataset.color!);
      });
    });
  }

  navigateToHome() {
    window.location.href = 'index.html';
  }
}
