export type CardPlain = {
  id: number;
  rank: string;
  suit: string;
  flipped: boolean;
  played: boolean;
};

export type PlayerPlain = {
  id: string;
  name: string;
  hand: CardPlain[];
  playedCards: CardPlain[];
  score: number;
  order: number;
  roleColor: string;
};

export type TeamPlain = {
  name: string;
  score: number;
  playerIds: string[];
  order: number;
  id: string;
};

export type RoomAction =
| { type: "JOIN_ROOM"; playerId: string; name: string;}
| { type: "LEAVE_ROOM"; playerId: string;}
| { type: "GAME_ACTION"; playerId: string; payload: any;}
| { type: "UPDATE_PLAYER"; player: any;}
| { type: "UPDATE_TEAM"; team: any;}
| { type: "ADD_LOG"; log: string;}
| { type: "PLAY_CARD"; playerId: string; cardId: number;}
| { type: "MOVE_PLAYER"; playerId: string; fromTeam: any; toTeam: any;}
| { type: "UPDATE_NAME"; name: string; team: any}
| { type: "ADD_TEAM";}
| { type: "REMOVE_TEAM";};

export type RoomState = {
  roomId: string;
  gameType: string;
  started: boolean;
  settingsOpen: boolean;
  theme: string;
  cardTheme: string;
  hostId?: string;
  [key: string]: any;
};