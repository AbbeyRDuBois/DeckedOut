import { DocumentData } from "firebase/firestore";
import { BaseGame } from "./base-game/base-model";

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
}