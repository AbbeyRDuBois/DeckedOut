import { DocumentData } from "firebase/firestore";
import { Player } from "./player";
import { BaseGame } from "./games/base-game";

export class Team {
    name: string;
    players: Player[];
    score: number = 0;

    constructor(name: string, players: Player[], score: number = 0){
        this.name = name;
        this.players = players;
        this.score = score;
    }
    
    toPlainObject() {
        return {
            name: this.name,
            score: this.score,
            players: this.players.map(player => player.toPlainObject())
        };
    }

    static fromPlainObject(data: DocumentData): Team {
        let players = Array.isArray(data.players)
            ? data.players.map((p: any) => new Player(p.id, p.name))
            : [];

        let team = new Team(data.name, players, data.score);

        return team;
    }

    removePlayer(playerId: string, game: BaseGame): void {
        this.players.splice(this.players.findIndex(p => p.id === playerId), 1); // Remove the player

        // If the team is now empty, remove the team from the list
        if (this.players.length === 0) {
            game.getTeams().splice(game.getTeams().findIndex(team => team.name = this.name), 1);
        }
    }

}