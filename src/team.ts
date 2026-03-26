import { DocumentData } from "firebase/firestore";
import { v4 } from "uuid";

export class Team {
    name: string;
    playerIds: string[];
    order: number;
    score: number = 0;
    id: string;

    constructor(name: string, playerIds: string[], order: number, score: number = 0, id: string = ""){
        this.name = name;
        this.playerIds = playerIds;
        this.order = order;
        this.score = score;
        if (id == ""){
            this.id = v4();
        }
        else{
            this.id = id;
        }
    }

    setPlayers(players: string[]){this.playerIds = players;}  
    getPlayers(): string[] {return this.playerIds;}
    getOrder(): number {return this.order;}

    removePlayer(playerId: string): void {
        this.playerIds.splice(this.playerIds.findIndex(id => id === playerId), 1); // Remove the player
    }
    
    toPlainObject() {
        return {
            name: this.name,
            order: this.order,
            score: this.score,
            playerIds: this.playerIds,
            id: this.id
        };
    }

    static fromPlainObject(data: DocumentData): Team {
        if (data == null){ return new Team("", [], 0); }
        
        let team = new Team(data.name, data.playerIds, data.order, data.score, data.id);

        return team;
    }
}