import { Board, Player, AIMove } from './gameTypes';
import {
  getPlayerPieces,
  getEmptyCells,
  canPlace,
  placePiece,
  movePiece,
  checkWinner,
  getWinningLine
} from './gameEngine';

const AI: Player = 'O';
const HUMAN: Player = 'X';

export type AIDifficulty = 'random' | 'medium' | 'hard';

// ── Helpers ───────────────────────────────────────────────────────

function getRandomMove(board: Board, player: Player, pieceLimit: number): AIMove {
  const empty = getEmptyCells(board);
  if (canPlace(board, player, pieceLimit)) {
    const to = empty[Math.floor(Math.random() * empty.length)];
    return { toIndex: to };
  } else {
    const pieces = getPlayerPieces(board, player);
    const from = pieces[Math.floor(Math.random() * pieces.length)];
    const to = empty[Math.floor(Math.random() * empty.length)];
    return { fromIndex: from, toIndex: to };
  }
}

function getWinBlockMove(board: Board, player: Player, size: number, winLength: number, pieceLimit: number): AIMove | null {
  const empty = getEmptyCells(board);
  const opponent = player === 'X' ? 'O' : 'X';

  // 1. Try to win
  if (canPlace(board, player, pieceLimit)) {
    for (const idx of empty) {
      const next = placePiece(board, idx, player);
      if (next && checkWinner(next, size, winLength)) return { toIndex: idx };
    }
  } else {
    const pieces = getPlayerPieces(board, player);
    for (const from of pieces) {
      for (const to of empty) {
        const next = movePiece(board, from, to, player);
        if (next && checkWinner(next, size, winLength)) return { fromIndex: from, toIndex: to };
      }
    }
  }

  // 2. Try to block opponent win
  if (canPlace(board, opponent, pieceLimit)) {
    for (const idx of empty) {
      const next = placePiece(board, idx, opponent);
      if (next && checkWinner(next, size, winLength)) {
        // AI can only block if it has a piece to place or move
        if (canPlace(board, player, pieceLimit)) return { toIndex: idx };
        // If movement, we need to find an AI piece that can move to `idx`
        const aiPieces = getPlayerPieces(board, player);
        for (const from of aiPieces) {
          if (movePiece(board, from, idx, player)) return { fromIndex: from, toIndex: idx };
        }
      }
    }
  }

  return null;
}

/**
 * Score a board position. 
 * Simple heuristic: count how many winning lines are "alive" for AI vs Human.
 */
function evaluateBoard(board: Board, size: number, winLength: number): number {
  let score = 0;
  // This is expensive for large boards, but since we don't have recursion, it's fine.
  // Ideally we'd use a more efficient heuristic for NxN.
  const winner = checkWinner(board, size, winLength);
  if (winner === AI) return 1000;
  if (winner === HUMAN) return -1000;
  
  return score;
}

// ── Public API ────────────────────────────────────────────────────

export function getAIMove(
  board: Board, 
  size: number = 3, 
  winLength: number = 3, 
  pieceLimit: number = 3,
  difficulty: AIDifficulty = 'hard'
): AIMove {
  
  // 1. RANDOM
  if (difficulty === 'random') {
    return getRandomMove(board, AI, pieceLimit);
  }

  // 2. MEDIUM (Win/Block)
  const winBlock = getWinBlockMove(board, AI, size, winLength, pieceLimit);
  if (winBlock) return winBlock;

  if (difficulty === 'medium') {
    return getRandomMove(board, AI, pieceLimit);
  }

  // 3. HARD (Scored)
  // For now, hard will do win/block + center/corner priority or best eval
  const empty = getEmptyCells(board);
  const center = Math.floor((size * size) / 2);
  
  if (canPlace(board, AI, pieceLimit)) {
    if (empty.includes(center)) return { toIndex: center };
    
    let bestMove = empty[0];
    let bestScore = -Infinity;
    for (const idx of empty) {
      const next = placePiece(board, idx, AI)!;
      const s = evaluateBoard(next, size, winLength);
      if (s > bestScore) { bestScore = s; bestMove = idx; }
    }
    return { toIndex: bestMove };
  } else {
    const aiPieces = getPlayerPieces(board, AI);
    let bestMove: AIMove = { fromIndex: aiPieces[0], toIndex: empty[0] };
    let bestScore = -Infinity;
    
    for (const from of aiPieces) {
      for (const to of empty) {
        const next = movePiece(board, from, to, AI);
        if (!next) continue;
        const s = evaluateBoard(next, size, winLength);
        if (s > bestScore) {
          bestScore = s;
          bestMove = { fromIndex: from, toIndex: to };
        }
      }
    }
    return bestMove;
  }
}
