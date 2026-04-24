// ─────────────────────────────────────────────
//  gameEngine.ts — Pure game-logic functions
// ─────────────────────────────────────────────

import { Board, CellValue, Player, GameConfig } from './gameTypes';

/** Create a fresh, empty board of given size */
export function createBoard(size: number = 3): Board {
  return Array(size * size).fill(null) as Board;
}

/** Return all indices occupied by a given player */
export function getPlayerPieces(board: Board, player: Player): number[] {
  return board.reduce<number[]>((acc, cell, idx) => {
    if (cell === player) acc.push(idx);
    return acc;
  }, []);
}

/** True when the player still has fewer than maxPieces pieces on the board */
export function canPlace(board: Board, player: Player, maxPieces: number = 3): boolean {
  return getPlayerPieces(board, player).length < maxPieces;
}

/** Return indices of all empty cells */
export function getEmptyCells(board: Board): number[] {
  return board.reduce<number[]>((acc, cell, idx) => {
    if (cell === null) acc.push(idx);
    return acc;
  }, []);
}

/**
 * Place a piece for `player` at `index`.
 * Returns a new board; does NOT mutate the original.
 * Returns null if the cell is already occupied.
 */
export function placePiece(
  board: Board,
  index: number,
  player: Player,
): Board | null {
  if (board[index] !== null) return null;
  const next = [...board] as Board;
  next[index] = player;
  return next;
}

/**
 * Move a piece belonging to `player` from `from` to `to`.
 * Returns new board or null on invalid move.
 */
export function movePiece(
  board: Board,
  from: number,
  to: number,
  player: Player,
): Board | null {
  if (board[from] !== player) return null; // not player's piece
  if (board[to] !== null) return null;     // destination occupied
  if (from === to) return null;            // same cell
  const next = [...board] as Board;
  next[from] = null;
  next[to] = player;
  return next;
}

/**
 * Check the board for a winner with dynamic size and winLength.
 */
export function checkWinner(board: Board, gridSize: number = 3, winLength: number = 3): Player | null {
  const line = getWinningLine(board, gridSize, winLength);
  if (!line) return null;
  return board[line[0]] as Player;
}

export function getWinningLine(board: Board, gridSize: number = 3, winLength: number = 3): number[] | null {
  // 1. Rows
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push(r * gridSize + (c + i));
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  // 2. Columns
  for (let c = 0; c < gridSize; c++) {
    for (let r = 0; r <= gridSize - winLength; r++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push((r + i) * gridSize + c);
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  // 3. Diagonals (top-left to bottom-right)
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push((r + i) * gridSize + (c + i));
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  // 4. Diagonals (top-right to bottom-left)
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = winLength - 1; c < gridSize; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push((r + i) * gridSize + (c - i));
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  return null;
}

/**
 * Determine whether the board is filled and no winner exists.
 */
export function isDraw(board: Board, gridSize: number = 3, winLength: number = 3): boolean {
  return board.every((c: CellValue) => c !== null) && checkWinner(board, gridSize, winLength) === null;
}

export const DEFAULT_CONFIG: GameConfig = {
  gridSize: 3,
  winLength: 3,
  maxPieces: 3,
  difficulty: 'easy'
};

export function validateConfig(config: GameConfig): boolean {
  if (config.winLength > config.gridSize) return false;
  if (config.maxPieces > config.gridSize * config.gridSize) return false;
  return true;
}
