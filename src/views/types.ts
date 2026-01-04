export type CardPlain = {
  id: number;
  value: string;
  suit: string;
  isFlipped: boolean;
};

export type PlayerPlain = {
  id: string;
  name: string;
  hand: CardPlain[];
  playedCards: CardPlain[];
  score: number;
  order?: number;
};

export type TeamPlain = {
  name: string;
  score: number;
  playerIds: string[];
};

export type IndicatorPlain = {
  id: string;
  label?: string;
  isActive: boolean;
};