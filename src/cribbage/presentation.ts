export type ScoringSlide =
  | {
      type: "HAND";
      playerId: string;
      points: number;
    }
  | {
      type: "CRIB";
      dealerId: string;
      points: number;
    };

export interface Presentation {
  slides: ScoringSlide[];
  index: number;
}