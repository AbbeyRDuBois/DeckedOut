import { Player } from "./player";
import { Team } from "./team";

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
  order: number;
};

export type TeamPlain = {
  name: string;
  score: number;
  playerIds: string[];
};

export type RoomAction =
| { type: "JOIN_ROOM"; playerId: string; name: string;}
| { type: "LEAVE_ROOM"; playerId: string;}
| { type: "GAME_ACTION"; playerId: string; payload: any;}
| { type: "PLAY_CARD"; playerId: string; cardId: number;};

export type RoomState = {
  roomId: string;
  gameType: string;
  players: Player[];
  teams: Team[];
  started: boolean;
  settingsOpen: boolean;
  theme: string;
  cardTheme: string;
  hostId?: string;
  [key: string]: any;
};