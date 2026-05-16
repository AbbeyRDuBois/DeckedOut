/****************************************************************************
 * 
 *  Cribbage (Extends Base Game)
 * 
 *      Handles Cribbage specific data and updates
 * 
 ****************************************************************************/

import { DocumentData } from "firebase/firestore";
import { BaseGame } from "../base-game/base-model";
import { Deck } from "../deck";
import { Player } from "../player";
import { Team } from "../team";

const DUMMY_GUESS_VALUE = 100;

export class Wavelength extends BaseGame {
    private prompt: string = "How hot is this?";
    private goal: number = 0; // Secret value in range -10..10
    private guesses: Record<string, number> = {};

    constructor(deck: Deck, players: Player[], teams: Team[], db: any){
        super(deck, players, teams, db);
        this.pointGoal = 20;
    }

    // Start a new game: set player order and pick initial goal
    async start(): Promise<void> {
        this.teams = this.teams.filter(t => t.getPlayerIds().length > 0);
        this.setPlayerOrder();
        this.currentPlayer = this.players[0];
        this.goal = this.randomGoal();
        this.started = true;

        // init guesses map
        this.guesses = {};
        this.players.forEach(p => {
            this.guesses[p.getId()] = DUMMY_GUESS_VALUE;
        });

        await this.updateTeams(this.teams);
        await this.updatePlayers(this.players);

        await this.db.update({
            currentPlayer: this.currentPlayer.toPlainObject(),
            goal: this.goal,
            prompt: this.prompt,
            started: this.started,
            guesses: this.guesses});
    }

    deal(): void {
        // Wavelength doesn't use a deck
    }

    async guestSetup(data: DocumentData): Promise<void> {
        this.setStarted(true);
        await this.updateLocalState(data);
        this.db.listenForLogs();
        this.db.listenForTeams();
        this.db.listenForPlayers();
    }

    cardPlayed(playerId: string, cardId: number): void | Promise<void> {
        // Not used in Wavelength
    }

    randomGoal(): number {
        return Math.floor(Math.random() * 21) - 10; // -10..10
    }

    getPrompt() { return this.prompt; }
    getGoal() { return this.goal; }
    getGuesses() { return this.guesses; }

    override async updateLocalState(data: DocumentData) {
        this.prompt = data.prompt ?? this.prompt;
        this.goal = data.goal ?? this.goal;
        this.guesses = data.guesses ?? this.guesses;

        // If all non-current players have submitted, do scoring
        const nonCurrent = this.players.filter(p => p.getId() !== this.currentPlayer.getId());
        if (nonCurrent.every(p => this.guesses[p.getId()] != DUMMY_GUESS_VALUE)) {
            await this.performScoring();
        }

        await super.updateLocalState(data);
    }

    // Compute points based on closeness, update players/teams, rotate current player, reset guesses
    private async performScoring() {
        const changes: any = {};
        let totalForCurrent = 0;

        const nonCurrent = this.players.filter(p => p.getId() !== this.currentPlayer.getId());

        await this.db.addLog(`The target is ${this.goal}.`);

        for (const player of nonCurrent) {
            const guess = this.guesses[player.getId()];
            var points = 0;
            //if within 2. Worth 4 if exact, 3 if one off, and 2 if two off. Else worth 0.
            var difference = Math.abs(guess - this.goal)
            if (difference <= 2){
                points = Math.abs(difference - 2) + 2;
            }

            player.addToScore(points);
            this.findTeamByPlayer(player).addToScore(points);

            totalForCurrent += points;
            await this.db.addLog(`${player.getName()} guessed ${guess} for ${points} points.`);
        }

        await this.db.addLog(`${this.currentPlayer.getName()} got ${totalForCurrent} points this round!`);

        // Give current player the sum of others' points
        this.currentPlayer.addToScore(totalForCurrent);
        this.findTeamByPlayer(this.currentPlayer).addToScore(totalForCurrent);

        await this.updatePlayers(this.players);
        await this.updateTeams(this.teams);

        // Advance to next player and reset for next round
        this.nextPlayer();
        this.goal = this.randomGoal();

        // reset guesses
        this.guesses = {};
        this.players.forEach(p => this.guesses[p.getId()] = DUMMY_GUESS_VALUE);

        changes.currentPlayer = this.currentPlayer.toPlainObject();
        changes.goal = this.goal;
        changes.guesses = this.guesses;

        await this.db.update(changes);
        this.events.emit('stateChanged', changes);
    }

    override toPlainObject() {
        return {
            ...super.toPlainObject(),
            prompt: this.prompt,
            goal: this.goal,
            guesses: this.guesses,
            pointGoal: this.pointGoal,
            logs: this.logs
        };
    }

    async setChoice(choice: number) {
        const playerId = localStorage.getItem('playerId');
        if (!playerId) return;

        // Current player does not submit
        if (this.currentPlayer && this.currentPlayer.getId() === playerId) return;

        // Update local map and push to DB
        this.guesses[playerId] = choice;

        const changes: any = {};
        changes[`guesses.${playerId}`] = choice;

        await this.db.update(changes);
    }
}