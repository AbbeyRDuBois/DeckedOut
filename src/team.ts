import { DocumentData } from "firebase/firestore";
import { v4 } from "uuid";

export class Team {
    private name: string;
    private playerIds: string[];
    private order: number;
    private score: number = 0;
    private id: string;

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

    setPlayerIds(players: string[]){this.playerIds = players;}  
    getPlayerIds(): string[] {return this.playerIds;}
    getOrder(): number {return this.order;}
    getName(): string {return this.name; }
    setName(name: string) { this.name = name; }
    getId(): string { return this.id; }
    getScore(): number { return this.score; }
    setScore(score: number) { this.score = score; }

    addPlayerId(playerId: string) { this.playerIds.push(playerId); }
    removePlayerId(playerId: string) { this.playerIds = this.playerIds.filter((id: string) => id !== playerId)}
    addToScore(points: number) { this.score += points;}
    
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