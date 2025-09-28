import { SUITS } from "./deck";

export class SpriteSheet {
    sheet_width = 1300;
    sheet_height = 750;
    card_width = 100;
    card_height = 150;
    image = "url('card_art/Cats_Deck.png')";
    back_row = 4;
    back_col = 3;

    getCardLocation(x: number, y: number, targetWidth = 100, targetHeight = 150): {col: number, row: number}{
        const col = (x -1) * this.card_width;
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
}