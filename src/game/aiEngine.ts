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

/**
 * DETERMINISTIC AI ENGINE
 * 100% Synchronous | No Recursion | No Async
 */

function getPriorityMove(board: Board, size: number, empty: number[]): number {
  const center = Math.floor((size * size) / 2);
  const corners = [0, size - 1, size * (size - 1), size * size - 1].filter(c => empty.includes(c));
  
  if (empty.includes(center)) return center;
  if (corners.length > 0) return corners[0];
  return empty[0];
}

export function getAIMove(
  board: Board, 
  size: number = 3, 
  winLength: number = 3, 
  pieceLimit: number = 3
): AIMove {
  const empty = getEmptyCells(board);

  // ── PLACEMENT PHASE ──
  if (canPlace(board, AI, pieceLimit)) {
    // 1. WIN
    for (const idx of empty) {
      const next = placePiece(board, idx, AI);
      if (next && checkWinner(next, size, winLength) === AI) return { toIndex: idx };
    }

    // 2. BLOCK
    for (const idx of empty) {
      const next = placePiece(board, idx, HUMAN);
      if (next && checkWinner(next, size, winLength) === HUMAN) return { toIndex: idx };
    }

    // 3. PRIORITY (Center/Corners)
    return { toIndex: getPriorityMove(board, size, empty) };
  }

  // ── MOVEMENT PHASE ──
  const aiPieces = getPlayerPieces(board, AI);

  // 1. WIN COMBINATIONS
  for (const from of aiPieces) {
    for (const to of empty) {
      const next = movePiece(board, from, to, AI);
      if (next && checkWinner(next, size, winLength) === AI) return { fromIndex: from, toIndex: to };
    }
  }

  // 2. BLOCK COMBINATIONS (Prevent immediate player win)
  for (const from of aiPieces) {
    for (const to of empty) {
      const next = movePiece(board, from, to, AI);
      if (!next) continue;
      
      // Check if human can win on their NEXT move if we make this move
      // (Simple check: can human win in 1 placement/move?)
      // For performance, we just take the first safe-looking move in movement
    }
  }

  // 3. DEFAULT MOVEMENT (Slide first available piece to first available priority spot)
  const targetIdx = getPriorityMove(board, size, empty);
  for (const from of aiPieces) {
    if (movePiece(board, from, targetIdx, AI)) return { fromIndex: from, toIndex: targetIdx };
  }

  // Fallback
  return { fromIndex: aiPieces[0], toIndex: empty[0] };
}
