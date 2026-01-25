import classicSheet from "./assets/Card_Themes/Classic_Deck.png";
import catSheet from "./assets/Card_Themes/Cats_Deck.png";
import poke1 from "./assets/Card_Themes/Pokemon1_Deck.png";
import poke1S from "./assets/Card_Themes/Pokemon1_Shiny_Deck.png";
import poke2 from "./assets/Card_Themes/Pokemon2_Deck.png";
import poke2S from "./assets/Card_Themes/Pokemon2_Shiny_Deck.png";
import pokeQ from "./assets/Card_Themes/PokemonQ_Deck.png";
import pokeQS from "./assets/Card_Themes/PokemonQ_Shiny_Deck.png";
import shinx from "./assets/Card_Themes/Shinx_Deck.png";
import starSheet from "./assets/Card_Themes/StarWars_Deck.png";
import genshinSheet from "./assets/Card_Themes/Genshin_Deck.png";
import hollowSheet from "./assets/Card_Themes/Hollow_Deck.png";

export class SpriteSheet {
    sheet_width = 1300;
    sheet_height = 750;
    card_width = 90;
    card_height = 150;
    image = `url(${classicSheet})`;
    back_row = 4;
    back_col = 3;
    gap = 5;

    getImage(): string { return this.image; }
    setImage(){}; //Placeholder for other sheets that have random chance of sheets (looking at you pokemon)

    getCardLocation(x: number, y: number, targetWidth: number, targetHeight: number): {col: number, row: number}{
        const col = (x -1) * (this.card_width + 2 * this.gap) + this.gap;
        const row = y * this.card_height;

        const scaleX = targetWidth / this.card_width;
        const scaleY = targetHeight / this.card_height;

        return {col:(-col * scaleX), row:(-row * scaleY)};
    }

    getBackgroundSize(targetWidth: number, targetHeight: number): { bgWidth: number; bgHeight: number } {
        const scaleX = targetWidth / this.card_width;
        const scaleY = targetHeight / this.card_height;
        return {
            bgWidth: this.sheet_width * scaleX,
            bgHeight: this.sheet_height * scaleY
        };
    }
}

export class CatSheet extends SpriteSheet {
    image = `url(${catSheet})`;
    card_width = 100;
    gap = 0;
}

export class PokemonSheet extends SpriteSheet {
    image = `url(${poke1})`;
    sheet_height = 1213;
    card_height = 243;
    pokemonMap: Record<string, {normal: string, shiny: string}> = {
        Pokemon1: {
            normal: `url(${poke1})`,
            shiny: `url(${poke1S})`
        },
        Pokemon2: {
            normal: `url(${poke2})`,
            shiny: `url(${poke2S})`
        },
        PokemonQ: {
            normal: `url(${pokeQ})`,
            shiny: `url(${pokeQS})`
        },
        Shinx: {
            normal: `url(${shinx})`,
            shiny: `url(${shinx})`
        }
    };

    setImage(){
        var rng = Math.floor(Math.random() * 101);
        var shiny: "shiny" | "normal" = rng <= 9 ? "shiny" : "normal";

        rng = Math.floor(Math.random() * 101);

        if (rng <= 29){
            this.image = this.pokemonMap["Pokemon1"][shiny];
        }
        else if (rng <= 59){
            this.image = this.pokemonMap["Pokemon2"][shiny];
        }
        else if (rng <= 79){
            this.image = this.pokemonMap["Shinx"][shiny];
        }
        else{
            this.image = this.pokemonMap["PokemonQ"][shiny];
        }
    }
}

export class StarWarsSheet extends SpriteSheet {
    image = `url(${starSheet})`;
}

export class GenshinSheet extends SpriteSheet {
    image = `url(${genshinSheet})`;
}

export class HollowSheet extends SpriteSheet {
    image = `url(${hollowSheet})`;
}