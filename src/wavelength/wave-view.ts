/****************************************************************************
 * 
 *  Wavelength View (Extends Base View )
 * 
 *     Renders the Wavelength specific elements onto the page
 *        (such as the board)
 * 
 ****************************************************************************/

import { BaseView } from "../base-game/base-view";
import { PlayerPlain } from "../types";

export class WavelengthView extends BaseView {
  private selectedValue: number | null = null;
  onSubmit?: (guess: number) => void;

  render(state: any, localPlayerId: string, hostId: string, onCardClick?: (cardId: number) => void) {
    super.render(state, localPlayerId, hostId, onCardClick); //Calls base first then does specific game renders
    this.setupWaveBoard(state, localPlayerId);
    this.attachSubmitButton();
    this.renderIndicators(state, localPlayerId);
    this.renderSubmit(state, localPlayerId);
    this.renderGoal(state, localPlayerId);
  }

  attachSubmitButton(){
    const submitBtn = document.getElementById('wave-submit')!;
    submitBtn.onclick = () => {
        const marker = document.getElementById('wave-local-marker');
        const val = marker?.dataset?.value;
        if (!val) {
            alert('Please place your marker before submitting.');
            return;
        }
        this.onSubmit?.(Number(val));
    };
  }

  setupWaveBoard(state: any, localPlayerId: string) {
    const board = document.getElementById('wave-board')!;

    // clear all selections so no previous round's selected buttons remain.
    const guesses = state.guesses || {};
    const guessValues = Object.values(guesses).filter((v: any) => typeof v === 'number');
    const allReset = guessValues.length > 0 && guessValues.every((v: number) => v < -10 || v > 10);
    if (allReset) {
      this.selectedValue = null;
      const existingButtons = board.querySelectorAll<HTMLButtonElement>('.wave-tick-button');
      existingButtons.forEach(b => b.classList.remove('selected'));
      const existingMarker = document.getElementById('wave-local-marker');
      if (existingMarker) {
        existingMarker.style.display = 'none';
        existingMarker.dataset.value = '';
      }
    }

    const buttons = board.querySelectorAll<HTMLButtonElement>('.wave-tick-button');
    buttons.forEach(button => {
      const value = Number(button.dataset.value);
      button.disabled = state.currentPlayer.id === localPlayerId;
      button.onclick = () => {
        if (state.currentPlayer.id === localPlayerId) return;
        this.selectedValue = value;
        this.updateSelectedTick(board);
        this.renderGuessStacks(state, localPlayerId);
      };
    });

    if (!document.getElementById('wave-local-marker')) {
      const marker = document.createElement('div');
      marker.id = 'wave-local-marker';
      marker.className = 'wave-local-marker';
      marker.style.display = 'none';
      board.appendChild(marker);
    }

    this.updateSelectedTick(board);
    this.renderGuessStacks(state, localPlayerId);
  }

  private updateSelectedTick(board: HTMLElement) {
    const marker = document.getElementById('wave-local-marker');
    const buttons = board.querySelectorAll<HTMLButtonElement>('.wave-tick-button');
    buttons.forEach(btn => {
      btn.classList.toggle('selected', Number(btn.dataset.value) === this.selectedValue);
    });

    if (!marker || this.selectedValue === null) {
      if (marker) {
        marker.style.display = 'none';
        marker.dataset.value = '';
      }
      return;
    }

    const selectedButton = board.querySelector<HTMLButtonElement>(`.wave-tick-button[data-value="${this.selectedValue}"]`);
    if (!selectedButton) return;

    const boardRect = board.getBoundingClientRect();
    const buttonRect = selectedButton.getBoundingClientRect();
    const left = buttonRect.left - boardRect.left + buttonRect.width / 2;

    marker.style.left = `${left}px`;
    marker.style.display = 'block';
    marker.dataset.value = String(this.selectedValue);
  }

  private renderGuessStacks(state: any, localPlayerId: string) {
    const board = document.getElementById('wave-board');
    if (!board) return;

    const localPlayer = state.players?.[localPlayerId];
    const localGuess = state.guesses?.[localPlayerId];
    const hasSubmittedLocalGuess = typeof localGuess === 'number' && localGuess >= -10 && localGuess <= 10;

    const guessesByValue: Record<number, string[]> = {};
    Object.entries(state.guesses || {}).forEach(([playerId, guessValue]) => {
      if (typeof guessValue !== 'number') return;
      if (guessValue < -10 || guessValue > 10) return;
      const player = state.players?.[playerId];
      if (!player) return;
      guessesByValue[guessValue] = guessesByValue[guessValue] || [];
      guessesByValue[guessValue].push(player.name);
    });

    if (this.selectedValue !== null && !hasSubmittedLocalGuess && localPlayer) {
      guessesByValue[this.selectedValue] = guessesByValue[this.selectedValue] || [];
      if (!guessesByValue[this.selectedValue].includes(localPlayer.name)) {
        guessesByValue[this.selectedValue].push(localPlayer.name);
      }
    }
  }

  renderIndicators(state: any, localPlayerId: string){
    //Local indicators first
    const localTurn = document.getElementById("local-turn")!;

    if (state.currentPlayer.id == localPlayerId){
      localTurn.classList.add('active');
    } else {
      localTurn.classList.remove('active');
    }

    //Opponent indicators
    const opponents = Object.fromEntries(Object.entries(state.players).filter(([id]) => id !== localPlayerId)) as Record<string, PlayerPlain>;
    Object.values(opponents).forEach((opponent: PlayerPlain) => {
      const oppTurn = document.getElementById(`${opponent.name}-turn`)!;
      if (state.currentPlayer.id == opponent.id){
        oppTurn.classList.add('active');
      } else {
        oppTurn.classList.remove('active');
      }
    });
  }

  //The turn indicator for the opponents
  override createIndicators(opponent: PlayerPlain){
    const turn = document.createElement('div');
    turn.classList.add('indicator');
    turn.dataset.type = 'turn';
    turn.innerHTML= "T";
    turn.id = `${opponent.name}-turn`;
    return [turn];
  }

  renderSubmit(state: any, localPlayerId: string){
    const submitBtn = document.getElementById('wave-submit')!;
    const isCurrentPlayer = state.currentPlayer?.id === localPlayerId;

    submitBtn.hidden = isCurrentPlayer;
    submitBtn.style.display = isCurrentPlayer ? "none" : "inline-flex";
  }

  renderGoal(state: any, localPlayerId: string){
    const goal = document.getElementById('goal')!;
    goal.innerHTML = state.goal;
    const isCurrentPlayer = state.currentPlayer?.id === localPlayerId;

    goal.hidden = !isCurrentPlayer;
    goal.style.display = isCurrentPlayer ? "inline-flex" : "none";
  }
}