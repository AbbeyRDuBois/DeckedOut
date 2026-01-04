export type RoomViewHandlers = {
  onStart?: () => Promise<void>;
  onLeave?: () => Promise<void>;
  onCopyId?: () => Promise<void> | void;
  onTeamNameChange?: (teamIndex: number, name: string) => Promise<void> | void;
  onAddTeam?: () => Promise<void> | void;
  onRemoveTeam?: () => Promise<void> | void;
  onRandomize?: (size: number) => Promise<void> | void;
  onThemeChange?: (theme: string) => void;
  onCardThemeChange?: (theme: string) => void;
};

export class RoomView {
  private handlers: RoomViewHandlers = {};

  constructor(handlers?: RoomViewHandlers) {
    if (handlers) this.handlers = handlers;
    this.attachBasicControls();
  }

  setHandlers(h: RoomViewHandlers) {
    this.handlers = h;
    this.attachBasicControls();
  }

  render(state: any) {
    this.renderPlayerList(state.players || []);
    this.renderTeams(state.teams || []);
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

  renderTeams(teams: any[]) {
    const innerContainer = document.getElementById('inner-container');
    if (!innerContainer) return;

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
      teamNameInput.id = `team-name-${teamIndex}`;
      teamNameInput.value = team.name;
      teamNameInput.addEventListener('blur', async () => {
        const newName = teamNameInput.value.trim();
        if (newName !== team.name && newName !== '') {
          await this.handlers.onTeamNameChange?.(teamIndex, newName);
        }
      });
      column.appendChild(teamNameInput);

      team.playerIds.forEach((id: string) => {
        const player = document.createElement('div');
        player.className = 'team-player';
        player.innerText = id; // ID-only here; controller can enhance with names if needed
        column.appendChild(player);
      });

      columnsWrapper.appendChild(column);
    });

    // Add controls
    const addDel = document.createElement('div');
    addDel.id = 'add-del-container';

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Team';
    addBtn.className = 'add-del-btn';
    addBtn.onclick = async () => await this.handlers.onAddTeam?.();

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Remove Team';
    delBtn.className = 'add-del-btn';
    delBtn.onclick = async () => await this.handlers.onRemoveTeam?.();

    addDel.appendChild(addBtn);
    addDel.appendChild(delBtn);

    teamsContainer.appendChild(columnsWrapper);
    teamsContainer.appendChild(addDel);

    innerContainer.appendChild(teamsContainer);
  }

  showWaitingOverlay(show: boolean) {
    const el = document.getElementById('waiting-overlay');
    if (!el) return;
    el.style.display = show ? 'flex' : 'none';
  }

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
    themeSelector?.addEventListener('change', () => this.handlers.onThemeChange?.(themeSelector.value));

    const cardThemeSelector = document.getElementById('card-theme-selector') as HTMLSelectElement | null;
    cardThemeSelector?.addEventListener('change', () => this.handlers.onCardThemeChange?.(cardThemeSelector.value));
  }
}
