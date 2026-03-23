// Shared types for the LILA Tic-Tac-Toe frontend

export type GameMode = "classic" | "timed";

export type CellValue = "X" | "O" | "";

export type GameStatus =
  | "idle"
  | "matchmaking"
  | "waiting_for_opponent"
  | "playing"
  | "game_over";

export interface GameState {
  board: CellValue[];
  currentTurn: string; // sessionId
  playerSymbols: Record<string, string>; // sessionId → "X"|"O"
  playerUsernames: Record<string, string>;
  turnTimeLeft: number;
  turnTimeLimit: number;
  moveCount: number;
  gameOver: boolean;
  winner: string | null; // sessionId
  winLine: number[] | null;
  mode: GameMode;
}

export interface GameOverPayload {
  board: CellValue[];
  gameOver: true;
  draw: boolean;
  winner: string | null;
  winnerUsername: string | null;
  winLine: number[] | null;
  playerSymbols: Record<string, string>;
  playerUsernames: Record<string, string>;
  mode: GameMode;
}

export interface TimerTickPayload {
  timeLeft: number;
  currentTurn: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  streak: number;
  bestStreak: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  wins: number;
  userId: string;
}

// Op codes must match server constants
export const OP_MOVE = 1;
export const OP_STATE = 2;
export const OP_GAME_OVER = 3;
export const OP_TIMER_TICK = 4;
export const OP_OPPONENT_LEFT = 5;
