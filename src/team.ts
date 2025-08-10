import { DocumentData } from "firebase/firestore";
import { Card } from "./deck";
import { Player } from "./player";

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
}