// ─────────────────────────────────────────────
//  aiEngine.ts — AI move selection (no recursion, no freezing)
// ─────────────────────────────────────────────

import { Board, Player, AIMove } from './gameTypes';
import {
  getPlayerPieces,
  getEmptyCells,
  canPlace,
  placePiece,
  movePiece,
  checkWinner,
} from './gameEngine';

const AI: Player = 'O';
const HUMAN: Player = 'X';

// ── Win-line definitions (same as engine, kept local for purity) ──
const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// ── Helpers ───────────────────────────────────────────────────────

/** Count how many cells a player owns in a given line */
function lineScore(board: Board, line: number[], player: Player): number {
  return line.filter(i => board[i] === player).length;
}

/**
 * Score a board position from the AI's perspective.
 * Higher = better for AI.
 */
function scoreBoard(board: Board): number {
  let score = 0;
  for (const line of WIN_LINES) {
    const aiCount = lineScore(board, line, AI);
    const humanCount = lineScore(board, line, HUMAN);
    if (aiCount > 0 && humanCount === 0) score += aiCount * 10;
    if (humanCount > 0 && aiCount === 0) score -= humanCount * 10;
  }
  // Center bonus
  if (board[4] === AI) score += 5;
  if (board[4] === HUMAN) score -= 5;
  return score;
}

/**
 * Return true when placing on `index` wins for `player` on a given board.
 * Used for O(1) immediate-win checks.
 */
function isWinningMove(board: Board, index: number, player: Player): boolean {
  for (const line of WIN_LINES) {
    if (!line.includes(index)) continue;
    const owned = line.filter(i => i === index || board[i] === player).length;
    if (owned === 3) return true;
  }
  return false;
}

// ── Placement phase ───────────────────────────────────────────────

function getPlacementMove(board: Board): AIMove {
  const empty = getEmptyCells(board);

  // 1. Win immediately
  for (const idx of empty) {
    if (isWinningMove(board, idx, AI)) return { toIndex: idx };
  }

  // 2. Block human win
  for (const idx of empty) {
    if (isWinningMove(board, idx, HUMAN)) return { toIndex: idx };
  }

  // 3. Center
  if (empty.includes(4)) return { toIndex: 4 };

  // 4. Corners
  const corners = [0, 2, 6, 8].filter(c => empty.includes(c));
  if (corners.length > 0) {
    // Prefer corner that contributes most to AI lines
    let best = corners[0];
    let bestScore = -Infinity;
    for (const c of corners) {
      const next = placePiece(board, c, AI)!;
      const s = scoreBoard(next);
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return { toIndex: best };
  }

  // 5. Any empty cell
  return { toIndex: empty[0] };
}

// ── Movement phase ────────────────────────────────────────────────

function getMovementMove(board: Board): AIMove {
  const aiPieces = getPlayerPieces(board, AI);
  const empty = getEmptyCells(board);

  let bestScore = -Infinity;
  let bestMove: AIMove = { fromIndex: aiPieces[0], toIndex: empty[0] };
  let hasBest = false;

  for (const from of aiPieces) {
    for (const to of empty) {
      const next = movePiece(board, from, to, AI);
      if (!next) continue;

      // Immediate win → take it instantly
      if (checkWinner(next) === AI) {
        return { fromIndex: from, toIndex: to };
      }

      const s = scoreBoard(next);
      if (!hasBest || s > bestScore) {
        bestScore = s;
        bestMove = { fromIndex: from, toIndex: to };
        hasBest = true;
      }
    }
  }

  // Guaranteed: if AI has 3 pieces and there is at least 1 empty cell,
  // at least one valid (from→to) combo exists.
  return bestMove;
}

// ── Block in movement phase ───────────────────────────────────────

/**
 * Check whether human can win in one move, and if so, block the destination.
 * Returns the blocking AIMove or null.
 */
function getBlockingMove(board: Board): AIMove | null {
  const humanPieces = getPlayerPieces(board, HUMAN);
  const empty = getEmptyCells(board);
  const aiPieces = getPlayerPieces(board, AI);

  for (const from of humanPieces) {
    for (const to of empty) {
      const next = movePiece(board, from, to, HUMAN);
      if (!next) continue;
      if (checkWinner(next) === HUMAN) {
        // Try to move one of our pieces to `to` to block
        for (const aiFrom of aiPieces) {
          const block = movePiece(board, aiFrom, to, AI);
          if (block) return { fromIndex: aiFrom, toIndex: to };
        }
      }
    }
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Returns the best AI move for the current board state.
 * ALWAYS returns a valid AIMove — never undefined.
 */
export function getAIMove(board: Board): AIMove {
  if (canPlace(board, AI)) {
    // ── PLACEMENT PHASE ──
    return getPlacementMove(board);
  }

  // ── MOVEMENT PHASE ──
  // 1. Check for immediate AI win
  const aiPieces = getPlayerPieces(board, AI);
  const empty = getEmptyCells(board);

  for (const from of aiPieces) {
    for (const to of empty) {
      const next = movePiece(board, from, to, AI);
      if (!next) continue;
      if (checkWinner(next) === AI) return { fromIndex: from, toIndex: to };
    }
  }

  // 2. Block human
  const block = getBlockingMove(board);
  if (block) return block;

  // 3. Best scored move
  return getMovementMove(board);
}
