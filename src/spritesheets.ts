import { SUITS } from "./deck";
import classicSheet from "./SpriteSheets/Classic_Deck.png";
import catSheet from "./SpriteSheets/Cats_Deck.png";
import poke1 from "./SpriteSheets/Pokemon1_Deck.png";
import poke1S from "./SpriteSheets/Pokemon1_Shiny_Deck.png";
import poke2 from "./SpriteSheets/Pokemon2_Deck.png";
import poke2S from "./SpriteSheets/Pokemon2_Shiny_Deck.png";
import pokeQ from "./SpriteSheets/PokemonQ_Deck.png";
import pokeQS from "./SpriteSheets/PokemonQ_Shiny_Deck.png";

export class SpriteSheet {
    sheet_width = 1300;
    sheet_height = 750;
    card_width = 100;
    card_height = 150;
    image = `url(${classicSheet})`;
    back_row = 4;
    back_col = 3;
    gap = 5;

    getCardLocation(x: number, y: number, targetWidth: number, targetHeight: number): {col: number, row: number}{
        const col = (x -1) * (this.card_width + 2 * this.gap) + this.gap;
        const row = y * this.card_height;

        const scaleX = targetWidth / this.card_width;
        const scaleY = targetHeight / this.card_height;

        return {col:(-col * scaleX), row:(-row * scaleY)};
    }

    getRow(suit: string){        
        switch (suit) {
            case SUITS[0].name: 
                return 0;
            case SUITS[1].name: 
                return 1;
            case SUITS[2].name: 
                return 2;
            case SUITS[3].name: 
                return 3;
            default: return 4;
        }   
    }

    getBackgroundSize(targetWidth: number, targetHeight: number): { bgWidth: number; bgHeight: number } {
        const scaleX = targetWidth / this.card_width;
        const scaleY = targetHeight / this.card_height;
        return {
            bgWidth: this.sheet_width * scaleX,
            bgHeight: this.sheet_height * scaleY
        };
    }

    getImage(): string {
        return this.image;
    }

    setImage(){}; //Placeholder for other sheets that have random chance of sheets (looking at you pokemon)
}

export class CatSheet extends SpriteSheet {
    image = `url(${catSheet})`;
    gap = 0;
}

export class PokemonSheet extends SpriteSheet {
    image = `url(${poke1})`;
    sheet_height = 695;
    pokemonMap: Record<string, {normal: string, shiny: string}> = {
        Pokemon1: {
            normal: poke1,
            shiny: poke1S
        },
        Pokemon2: {
            normal: poke2,
            shiny: poke2S
        },
        PokemonQ: {
            normal: pokeQ,
            shiny: pokeQS
        }
    };

    setImage(){
        var rng = Math.floor(Math.random() * 101);
        var shiny: "shiny" | "normal" = rng <= 9 ? "shiny" : "normal";

        rng = Math.floor(Math.random() * 101);

        if (rng <= 40){
            this.image = this.pokemonMap["Pokemon1"][shiny];
        }
        else if (rng <= 80){
            this.image = this.pokemonMap["Pokemon2"][shiny];
        }
        else{
            this.image = this.pokemonMap["PokemonQ"][shiny];
        }
    }
}