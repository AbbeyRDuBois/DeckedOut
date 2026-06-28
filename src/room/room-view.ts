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

  showLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.remove('hidden');
    }
  }

  hideLoadingScreen() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }

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
    if (localStorage.getItem("theme") != null && localStorage.getItem("theme")!.length > 0) {
      this.handlers.onThemeChange(String(localStorage.getItem("theme")))
    }
    themeSelector?.addEventListener('change', () => this.handlers.onThemeChange(themeSelector.value));

    const cardThemeSelector = document.getElementById('card-theme-selector') as HTMLSelectElement | null;
    if (localStorage.getItem("card_theme") != null && localStorage.getItem("card_theme")!.length > 0) {
      this.handlers.onCardThemeChange(String(localStorage.getItem("card_theme")))
    }
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

  dragElement(elmnt:HTMLElement) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "_header")) {
      // if present, the header is where you move the DIV from:
      var md = document.getElementById(elmnt.id + "_header")?.onmousedown
      md = dragMouseDown;
    } else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e:any) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e:any) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
}