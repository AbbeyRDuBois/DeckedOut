import { DocumentData } from "firebase/firestore";
import { BaseGame } from "./games/base-game";

export class Team {
    name: string;
    playerIds: string[];
    score: number = 0;

    constructor(name: string, ids: string[], score: number = 0){
        this.name = name;
        this.playerIds = ids;
        this.score = score;
    }
    
    toPlainObject() {
        return {
            name: this.name,
            score: this.score,
            playerIds: this.playerIds
        };
    }

    static fromPlainObject(data: DocumentData): Team {
        if (data == null){
            return new Team("", []);
        }
        
        let team = new Team(data.name, data.playerIds, data.score);

        return team;
    }

    removePlayer(playerId: string, game: BaseGame): void {
        this.playerIds.splice(this.playerIds.findIndex(id => id === playerId), 1); // Remove the player

        // If the team is now empty, remove the team from the list
        if (this.playerIds.length === 0) {
            game.getTeams().splice(game.getTeams().findIndex(team => team.name = this.name), 1);
        }
    }

    setPlayers(players: string[]){
        this.playerIds = players;
    }
    
    getPlayers(): string[] {
        return this.playerIds;
    }

}