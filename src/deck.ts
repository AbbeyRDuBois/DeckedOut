export class Card {
    id: number;
    value: string;
    suit: string;

    constructor(id: number, value = "2", suit = "Hearts",){
        this.value = value;
        this.suit = suit;
        this.id = id;
    }

    toString(): string{
        return this.value + " " + this.suit;
    }
}