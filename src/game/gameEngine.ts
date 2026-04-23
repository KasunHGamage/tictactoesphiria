// ─────────────────────────────────────────────
//  gameEngine.ts — Pure game-logic functions
// ─────────────────────────────────────────────

import { Board, CellValue, Player } from './gameTypes';

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

/** True when the player still has fewer than pieceLimit pieces on the board */
export function canPlace(board: Board, player: Player, pieceLimit: number = 3): boolean {
  return getPlayerPieces(board, player).length < pieceLimit;
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

// Helper to check a specific line for a winner
function checkLine(board: Board, line: number[], winLength: number): Player | null {
  let count = 0;
  let lastPlayer: Player | null = null;

  for (const idx of line) {
    const player = board[idx];
    if (player && player === lastPlayer) {
      count++;
    } else {
      count = player ? 1 : 0;
      lastPlayer = player;
    }
    if (count === winLength) return lastPlayer;
  }
  return null;
}

/**
 * Check the board for a winner with dynamic size and winLength.
 */
export function checkWinner(board: Board, size: number = 3, winLength: number = 3): Player | null {
  const line = getWinningLine(board, size, winLength);
  if (!line) return null;
  return board[line[0]] as Player;
}

export function getWinningLine(board: Board, size: number = 3, winLength: number = 3): number[] | null {
  // 1. Rows
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push(r * size + (c + i));
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  // 2. Columns
  for (let c = 0; c < size; c++) {
    for (let r = 0; r <= size - winLength; r++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push((r + i) * size + c);
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  // 3. Diagonals (top-left to bottom-right)
  for (let r = 0; r <= size - winLength; r++) {
    for (let c = 0; c <= size - winLength; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push((r + i) * size + (c + i));
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  // 4. Diagonals (top-right to bottom-left)
  for (let r = 0; r <= size - winLength; r++) {
    for (let c = winLength - 1; c < size; c++) {
      const line: number[] = [];
      for (let i = 0; i < winLength; i++) line.push((r + i) * size + (c - i));
      if (line.every(i => board[i] && board[i] === board[line[0]])) return line;
    }
  }

  return null;
}

/**
 * Determine whether the board is filled and no winner exists.
 */
export function isDraw(board: Board, size: number = 3, winLength: number = 3): boolean {
  return board.every((c: CellValue) => c !== null) && checkWinner(board, size, winLength) === null;
}

export interface GameConfig {
  boardSize: number;
  winLength: number;
  pieceLimit: number;
}

export function getGameConfig(roundNumber: number): GameConfig {
  if (roundNumber >= 3) {
    return { boardSize: 4, winLength: 4, pieceLimit: 4 };
  }
  return { boardSize: 3, winLength: 3, pieceLimit: 3 };
}
