import { SUITS } from "./deck";
import classicSheet from "./SpriteSheets/Classic_Deck.png";
import catSheet from "./SpriteSheets/Cats_Deck.png";

export class SpriteSheet {
    sheet_width = 1040;
    sheet_height = 600;
    card_width = 70;
    card_height = 120;
    image = `url(${classicSheet})`;
    back_row = 4;
    back_col = 3;
    gap = 5;

    getCardLocation(x: number, y: number, targetWidth = 70, targetHeight = 120): {col: number, row: number}{
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
}

export class CatSheet extends SpriteSheet {
    sheet_width = 1300;
    sheet_height = 750;
    card_width = 100;
    card_height = 150;
    image = `url(${catSheet})`;
    gap = 0;
}