// ─────────────────────────────────────────────
//  gameTypes.ts — Shared type definitions
// ─────────────────────────────────────────────

export type Player = 'X' | 'O';

export type CellValue = Player | null;

/** Dynamic flat array representing the board of any size (size*size) */
export type Board = CellValue[];

export type GamePhase = 'placement' | 'movement';

export type GameStatus = 'playing' | 'won' | 'draw' | 'next-round';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'auto';

export interface GameConfig {
  gridSize: number;
  winLength: number;
  maxPieces: number;
  difficulty: Difficulty;
}

export interface GameState {
  board: Board;
  config: GameConfig;
  currentPlayer: Player;
  phase: GamePhase;
  status: GameStatus;
  winner: Player | null;
  winningLine: number[] | null;
  /** Index of the piece currently selected for movement (human only) */
  selectedIndex: number | null;
}

export interface AIMove {
  /** Only present in movement phase */
  fromIndex?: number;
  toIndex: number;
}
