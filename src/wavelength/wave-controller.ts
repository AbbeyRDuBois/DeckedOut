/****************************************************************************
 * 
 *  Wavelength Controller (Extends the Base Controller)
 * 
 *      Implements the Wavelength specific event handlers
 * 
 ****************************************************************************/

import { Wavelength } from "./wave-model";
import { WavelengthView } from "./wave-view";
import { Database } from "../services/databases";
import { BaseController } from "../base-game/base-controller";

export class WavelengthController extends BaseController<Wavelength, WavelengthView>{

    constructor(game: Wavelength, view: WavelengthView, db: Database) {
        super(game, view, db);
        this.view.onSubmit = this.handleSubmit;
        this.view.attachSubmitButton();
    }
    
    override gameOptions(hostId: string) {}

    override async onStateChanged() {
        this.gameRerender();

        if(this.game.getEnded()) {
            const winner = this.game.getTeams().find(t => t.getScore() >= this.game.getPointGoal());
            const losers = this.game.getTeams().filter(t => t.getName() != winner?.getName());
            const winnerPlayers = winner?.getPlayerIds().map(id => this.game.getPlayer(id));
            const loserTeams = losers.map((team: any) => ({
                name: team.getName(),
                score: team.getScore(),
                players: team.getPlayerIds().map((id: string) => this.game.getPlayer(id))
            }));

            this.view.renderWinner(winner, loserTeams, winnerPlayers);
            return;
        }
    }

    private handleSubmit = async (guess: number) => {
        await this.game.guess(guess);
    };
}
