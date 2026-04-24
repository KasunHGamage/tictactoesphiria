import { Board, Player, AIMove, Difficulty } from './gameTypes';
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
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export function getAIMove(
  board: Board, 
  difficulty: Difficulty = 'medium',
  gridSize: number = 3, 
  winLength: number = 3, 
  maxPieces: number = 3
): AIMove {
  const empty = getEmptyCells(board);
  const aiPieces = getPlayerPieces(board, AI);

  // ── EASY MODE ──
  if (difficulty === 'easy') {
    if (canPlace(board, AI, maxPieces)) {
      const target = empty[Math.floor(Math.random() * empty.length)];
      return { toIndex: target };
    } else {
      const from = aiPieces[Math.floor(Math.random() * aiPieces.length)];
      const to = empty[Math.floor(Math.random() * empty.length)];
      return { fromIndex: from, toIndex: to };
    }
  }

  // ── MEDIUM & HARD MODE SHARED LOGIC ──

  // 1. WIN check (Placement)
  if (canPlace(board, AI, maxPieces)) {
    for (const idx of empty) {
      const next = placePiece(board, idx, AI);
      if (next && checkWinner(next, gridSize, winLength) === AI) return { toIndex: idx };
    }
  }

  // 2. BLOCK check (Placement)
  if (canPlace(board, AI, maxPieces)) {
    for (const idx of empty) {
      const next = placePiece(board, idx, HUMAN);
      if (next && checkWinner(next, gridSize, winLength) === HUMAN) return { toIndex: idx };
    }
  }

  // 3. WIN check (Movement)
  if (!canPlace(board, AI, maxPieces)) {
    for (const from of aiPieces) {
      for (const to of empty) {
        const next = movePiece(board, from, to, AI);
        if (next && checkWinner(next, gridSize, winLength) === AI) return { fromIndex: from, toIndex: to };
      }
    }
  }

  // 4. BLOCK check (Movement - Prevent human from winning on next turn)
  if (!canPlace(board, AI, maxPieces)) {
    for (const idx of empty) {
      // If human can win by placing/moving to idx, we should move an AI piece there
      const nextIfHuman = placePiece(board, idx, HUMAN);
      if (nextIfHuman && checkWinner(nextIfHuman, gridSize, winLength) === HUMAN) {
        // Try to move any AI piece to this idx
        for (const from of aiPieces) {
          const nextAI = movePiece(board, from, idx, AI);
          if (nextAI) return { fromIndex: from, toIndex: idx };
        }
      }
    }
  }

  // ── HARD MODE SPECIFIC ──
  if (difficulty === 'hard') {
    if (canPlace(board, AI, maxPieces)) {
      return { toIndex: getPriorityMove(board, gridSize, empty) };
    } else {
      // Find a safe piece to move to a priority spot
      const targetIdx = getPriorityMove(board, gridSize, empty);
      for (const from of aiPieces) {
        const next = movePiece(board, from, targetIdx, AI);
        if (next) {
          // Check if moving this piece gives human a win
          let humanCanWin = false;
          const humanPieces = getPlayerPieces(next, HUMAN);
          const nextEmpty = getEmptyCells(next);
          for (const hTo of nextEmpty) {
            // Placement win for human? (Not possible since board is full, but just in case)
            if (canPlace(next, HUMAN, maxPieces)) {
               const hNext = placePiece(next, hTo, HUMAN);
               if (hNext && checkWinner(hNext, gridSize, winLength) === HUMAN) humanCanWin = true;
            } else {
               // Movement win for human?
               for (const hFrom of humanPieces) {
                 const hNext = movePiece(next, hFrom, hTo, HUMAN);
                 if (hNext && checkWinner(hNext, gridSize, winLength) === HUMAN) humanCanWin = true;
               }
            }
          }
          if (!humanCanWin) return { fromIndex: from, toIndex: targetIdx };
        }
      }
    }
  }

  // ── FALLBACK (MEDIUM or HARD fallback) ──
  if (canPlace(board, AI, maxPieces)) {
    const target = difficulty === 'hard' ? getPriorityMove(board, gridSize, empty) : empty[Math.floor(Math.random() * empty.length)];
    return { toIndex: target };
  } else {
    const from = aiPieces[Math.floor(Math.random() * aiPieces.length)];
    const to = empty[Math.floor(Math.random() * empty.length)];
    return { fromIndex: from, toIndex: to };
  }
}
