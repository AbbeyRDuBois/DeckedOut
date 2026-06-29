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
  onMediaChanged?: (media: { x: number; y: number; width: number; height: number }) => void;
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
    requestAnimationFrame(() => this.renderMediaPlayer(state));
  }

  renderSettingsPanel(state: any) {
    const panel = document.getElementById('settings-panel')!;
    panel.classList.toggle('closed', !state.settingsOpen);

    // Ensure selectors reflect the current state
    const themeSelector = document.getElementById('theme-selector') as HTMLSelectElement | null;
    if (themeSelector) themeSelector.value = state.theme || 'dark';
    const cardThemeSelector = document.getElementById('card-theme-selector') as HTMLSelectElement | null;
    if (cardThemeSelector) cardThemeSelector.value = state.cardTheme || 'Classic';
  }

  renderMediaPlayer(state: any) {
      const mediaPlayer = document.getElementById('media_player')!;
      if (!mediaPlayer || !state?.mediaPlayer) return;
      // clear right/bottom so left/top positioning takes effect
      mediaPlayer.style.right = 'auto';
      mediaPlayer.style.bottom = 'auto';
      mediaPlayer.style.left = `${state.mediaPlayer.x}px`;
      mediaPlayer.style.top = `${state.mediaPlayer.y}px`;
      mediaPlayer.style.width = `${state.mediaPlayer.width}px`;
      mediaPlayer.style.height = `${state.mediaPlayer.height}px`;
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
    // Attach media player controls (drag + resize)
    this.attachMediaPlayerControls();
  }

  attachMediaPlayerControls() {
    const media = document.getElementById('media_player');
    if (!media) return;

    const header = media.querySelector('.player_header, .media_player_header, #media_player_header') as HTMLElement | null;

    let dragging = false;
    let resizing = false;
    let startX = 0;
    let startY = 0;
    let startRect: DOMRect | null = null;

    const onPointerMove = (evt: PointerEvent) => {
      if (dragging && startRect) {
        const dx = evt.clientX - startX;
        const dy = evt.clientY - startY;
        const nx = Math.max(0, Math.min(window.innerWidth - startRect.width, startRect.left + dx));
        const ny = Math.max(0, Math.min(window.innerHeight - startRect.height, startRect.top + dy));
        media.style.left = `${nx}px`;
        media.style.top = `${ny}px`;
      } else if (resizing && startRect) {
        const dw = evt.clientX - startX;
        const dh = evt.clientY - startY;
        const nw = Math.max(120, startRect.width + dw);
        const nh = Math.max(80, startRect.height + dh);
        const maxW = window.innerWidth - startRect.left;
        const maxH = window.innerHeight - startRect.top;
        media.style.width = `${Math.min(nw, maxW)}px`;
        media.style.height = `${Math.min(nh, maxH)}px`;
      }
    };

    const endPointer = () => {
      if ((dragging || resizing) && this.handlers.onMediaChanged) {
        const rect = media.getBoundingClientRect();
        this.handlers.onMediaChanged({ x: Math.round(rect.left), y: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height) });
      }
      dragging = false;
      resizing = false;
      startRect = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endPointer);
    };

    if (header) {
      header.style.touchAction = 'none';
      header.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        // If shift is held start resizing, otherwise dragging
        if (e.shiftKey) {
          resizing = true;
        } else {
          dragging = true;
        }
        startX = e.clientX;
        startY = e.clientY;
        startRect = media.getBoundingClientRect();
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', endPointer);
      });
    }
  }
}