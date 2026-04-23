// ─────────────────────────────────────────────
//  gameTypes.ts — Shared type definitions
// ─────────────────────────────────────────────

export type Player = 'X' | 'O';

export type CellValue = Player | null;

/** 9-element flat array representing the 3×3 board */
export type Board = CellValue[];

export type GamePhase = 'placement' | 'movement';

export type GameStatus = 'playing' | 'won' | 'draw';

export interface GameState {
  board: Board;
  currentPlayer: Player;
  phase: GamePhase;
  status: GameStatus;
  winner: Player | null;
  /** Index of the piece currently selected for movement (human only) */
  selectedIndex: number | null;
}

export interface AIMove {
  /** Only present in movement phase */
  fromIndex?: number;
  toIndex: number;
}
