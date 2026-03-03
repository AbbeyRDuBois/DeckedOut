export type ScoringSlide =
  | {
      type: "HAND";
      playerId: string;
      points: number;
      grandTotal: number;
    }
  | {
      type: "CRIB";
      dealerId: string;
      points: number;
      grandTotal: number;
    };

export interface Presentation {
  slides: ScoringSlide[];
  index: number;
}