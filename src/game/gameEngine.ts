// ─────────────────────────────────────────────
//  gameEngine.ts — Pure game-logic functions
// ─────────────────────────────────────────────

import { Board, CellValue, Player } from './gameTypes';

/** Win patterns: rows, columns, diagonals */
const WIN_LINES: number[][] = [
  [0, 1, 2], // top row
  [3, 4, 5], // mid row
  [6, 7, 8], // bot row
  [0, 3, 6], // left col
  [1, 4, 7], // mid col
  [2, 5, 8], // right col
  [0, 4, 8], // diag
  [2, 4, 6], // anti-diag
];

/** Create a fresh, empty 9-cell board */
export function createBoard(): Board {
  return Array(9).fill(null) as Board;
}

/** Return all indices occupied by a given player */
export function getPlayerPieces(board: Board, player: Player): number[] {
  return board.reduce<number[]>((acc, cell, idx) => {
    if (cell === player) acc.push(idx);
    return acc;
  }, []);
}

/** True when the player still has fewer than 3 pieces on the board */
export function canPlace(board: Board, player: Player): boolean {
  return getPlayerPieces(board, player).length < 3;
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
 * Check the board for a winner.
 * ONLY returns a player when 3 of their marks share a straight line.
 * Piece count is NEVER used — pattern only.
 */
export function checkWinner(board: Board): Player | null {
  console.log('Checking winner:', JSON.stringify(board));

  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (
      board[a] !== null &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      console.log(`Winner found: ${board[a]} on line [${a},${b},${c}]`);
      return board[a] as Player;
    }
  }

  return null;
}

/**
 * Determine whether all 9 cells are filled and no winner exists.
 * (Rare in Moving TicTacToe, but still handled.)
 */
export function isDraw(board: Board): boolean {
  return board.every((c: CellValue) => c !== null) && checkWinner(board) === null;
}
