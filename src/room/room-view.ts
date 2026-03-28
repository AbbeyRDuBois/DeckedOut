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
  onLeave: () => Promise<void>;
  onCopyId: () => Promise<void> | void;
  onThemeChange: (theme: string) => void;
  onCardThemeChange: (theme: string) => void;
  onSettingsToggle: () => Promise<void> | void;
  onRoleChange: (role: string) => void;
};

export class RoomView {
  private handlers!: RoomViewHandlers;
  private gameView: BaseView;

  //Set up the Listeners for events
  constructor(gameView: BaseView) {
    this.gameView = gameView;
  }

  getGameView() { return this.gameView; }
  navigateToHome() { window.location.href = 'index.html'; }

  //Outer call to set up listeners
  setHandlers(h: RoomViewHandlers) {
    this.handlers = h;
    this.attachBasicControls();
  }

  render(state: any) {
    // Apply persisted theme and card theme immediately
    document.body.setAttribute('data-theme', state.theme || 'dark');
    this.gameView.setSpriteSheet(state.cardTheme || 'Classic');
    this.renderSettingsPanel(state);
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

  //Loads the Unique content of the game into the UI
  async renderGameContent(gameType: string){
    const container = document.getElementById("center-content")!;
    const html = await fetch(`/${gameType}.html`).then(res => res.text());
    container.innerHTML = html;
    container.style.display = "block"

    await new Promise(requestAnimationFrame); //Waits for the new changes to load onto the page
  }
  
  //Sets up listeners for all the click events
  attachBasicControls() {
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
}
