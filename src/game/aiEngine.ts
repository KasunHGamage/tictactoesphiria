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

// ─── Move Memory ─────────────────────────────────────────────────────────────
// Tracks the last N moves the AI made to detect loops
const MAX_MEMORY = 6;
const aiMoveHistory: string[] = [];

function encodeMove(move: AIMove): string {
  return `${move.fromIndex ?? 'P'}→${move.toIndex}`;
}

function recordMove(move: AIMove): void {
  aiMoveHistory.push(encodeMove(move));
  if (aiMoveHistory.length > MAX_MEMORY) aiMoveHistory.shift();
}

function isRepeatedMove(move: AIMove): boolean {
  const encoded = encodeMove(move);
  const recent = aiMoveHistory.slice(-4);
  return recent.filter(m => m === encoded).length >= 2;
}

function isLooping(): boolean {
  if (aiMoveHistory.length < 4) return false;
  // If the last 4 moves alternate between 2 states it's a loop
  const last4 = aiMoveHistory.slice(-4);
  return last4[0] === last4[2] && last4[1] === last4[3];
}

// ─── Position Value ───────────────────────────────────────────────────────────
function positionValue(idx: number, gridSize: number): number {
  const row = Math.floor(idx / gridSize);
  const col = idx % gridSize;
  const center = (gridSize - 1) / 2;
  const distFromCenter = Math.abs(row - center) + Math.abs(col - center);
  // Center = highest, edges = lowest
  return Math.max(0, 4 - distFromCenter);
}

// ─── Threat Scoring ───────────────────────────────────────────────────────────
// Counts how many pieces a player has in each line, returns a danger/opportunity score
function evaluateLine(board: Board, indices: number[], player: Player, winLength: number): number {
  const playerCount = indices.filter(i => board[i] === player).length;
  const emptyCount = indices.filter(i => board[i] === null).length;
  const opponentCount = indices.filter(i => board[i] !== null && board[i] !== player).length;

  if (opponentCount > 0) return 0; // blocked line
  if (playerCount === winLength - 1 && emptyCount >= 1) return 1000; // near-win
  if (playerCount === winLength - 2 && emptyCount >= 2) return 100;
  if (playerCount === winLength - 3 && emptyCount >= 3) return 10;
  return playerCount;
}

function getAllLines(gridSize: number, winLength: number): number[][] {
  const lines: number[][] = [];

  // Rows
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      lines.push(Array.from({ length: winLength }, (_, i) => r * gridSize + c + i));
    }
  }
  // Columns
  for (let c = 0; c < gridSize; c++) {
    for (let r = 0; r <= gridSize - winLength; r++) {
      lines.push(Array.from({ length: winLength }, (_, i) => (r + i) * gridSize + c));
    }
  }
  // Diagonals (top-left to bottom-right)
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = 0; c <= gridSize - winLength; c++) {
      lines.push(Array.from({ length: winLength }, (_, i) => (r + i) * gridSize + c + i));
    }
  }
  // Diagonals (top-right to bottom-left)
  for (let r = 0; r <= gridSize - winLength; r++) {
    for (let c = winLength - 1; c < gridSize; c++) {
      lines.push(Array.from({ length: winLength }, (_, i) => (r + i) * gridSize + c - i));
    }
  }

  return lines;
}

function scoreBoardForPlayer(board: Board, player: Player, gridSize: number, winLength: number): number {
  const lines = getAllLines(gridSize, winLength);
  return lines.reduce((total, line) => total + evaluateLine(board, line, player, winLength), 0);
}

function scoreMove(
  board: Board,
  move: AIMove,
  gridSize: number,
  winLength: number,
  maxPieces: number,
): number {
  let nextBoard: Board | null;
  if (move.fromIndex !== undefined) {
    nextBoard = movePiece(board, move.fromIndex, move.toIndex, AI);
  } else {
    nextBoard = placePiece(board, move.toIndex, AI);
  }

  if (!nextBoard) return -Infinity;

  // Instant win is always best
  if (checkWinner(nextBoard, gridSize, winLength) === AI) return 100000;

  const attackScore = scoreBoardForPlayer(nextBoard, AI, gridSize, winLength);
  const defenseScore = scoreBoardForPlayer(nextBoard, HUMAN, gridSize, winLength);
  const posScore = positionValue(move.toIndex, gridSize);

  // Penalise repeated moves to avoid loops
  const repeatPenalty = isRepeatedMove(move) ? 500 : 0;

  return attackScore * 2 - defenseScore * 1.5 + posScore - repeatPenalty;
}

// ─── Candidate Move Generation ────────────────────────────────────────────────
function generateMoves(board: Board, maxPieces: number): AIMove[] {
  const empty = getEmptyCells(board);
  const aiPieces = getPlayerPieces(board, AI);
  const moves: AIMove[] = [];

  if (canPlace(board, AI, maxPieces)) {
    for (const to of empty) moves.push({ toIndex: to });
  } else {
    for (const from of aiPieces) {
      for (const to of empty) {
        moves.push({ fromIndex: from, toIndex: to });
      }
    }
  }

  return moves;
}

// ─── Select from Top-N Moves with Randomness ─────────────────────────────────
function pickFromTopMoves(scored: { move: AIMove; score: number }[], topN = 3): AIMove {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, Math.min(topN, sorted.length));
  // Weighted random: higher scores get more weight
  const totalWeight = top.reduce((sum, s) => sum + Math.max(s.score + 1, 1), 0);
  let rand = Math.random() * totalWeight;
  for (const { move, score } of top) {
    rand -= Math.max(score + 1, 1);
    if (rand <= 0) return move;
  }
  return top[0].move;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function getAIMove(
  board: Board,
  difficulty: Difficulty = 'medium',
  gridSize: number = 3,
  winLength: number = 3,
  maxPieces: number = 3,
): AIMove {
  const empty = getEmptyCells(board);
  const aiPieces = getPlayerPieces(board, AI);

  // ── EASY MODE: mostly random with occasional block ──
  if (difficulty === 'easy') {
    // 30% chance to block a human win
    if (Math.random() < 0.3) {
      if (canPlace(board, AI, maxPieces)) {
        for (const idx of empty) {
          const next = placePiece(board, idx, HUMAN);
          if (next && checkWinner(next, gridSize, winLength) === HUMAN) {
            const move = { toIndex: idx };
            recordMove(move);
            return move;
          }
        }
      }
    }

    // Otherwise random
    let move: AIMove;
    if (canPlace(board, AI, maxPieces)) {
      move = { toIndex: empty[Math.floor(Math.random() * empty.length)] };
    } else {
      const from = aiPieces[Math.floor(Math.random() * aiPieces.length)];
      move = { fromIndex: from, toIndex: empty[Math.floor(Math.random() * empty.length)] };
    }
    recordMove(move);
    return move;
  }

  // ── MEDIUM & HARD: scored move selection ──
  const allMoves = generateMoves(board, maxPieces);
  if (allMoves.length === 0) {
    // Absolute fallback
    const move: AIMove = canPlace(board, AI, maxPieces)
      ? { toIndex: empty[0] }
      : { fromIndex: aiPieces[0], toIndex: empty[0] };
    recordMove(move);
    return move;
  }

  // Force random move to break out of detected loops
  if (isLooping()) {
    console.log('[AI] Loop detected — forcing random move');
    const shuffled = [...allMoves].sort(() => Math.random() - 0.5);
    const move = shuffled[0];
    recordMove(move);
    return move;
  }

  // Score all candidates
  const scored = allMoves.map(move => ({
    move,
    score: scoreMove(board, move, gridSize, winLength, maxPieces),
  }));

  // Hard mode looks ahead one step to avoid gifting the human a win
  if (difficulty === 'hard') {
    const safeMoves = scored.filter(({ move }) => {
      let nextBoard: Board | null;
      if (move.fromIndex !== undefined) {
        nextBoard = movePiece(board, move.fromIndex, move.toIndex, AI);
      } else {
        nextBoard = placePiece(board, move.toIndex, AI);
      }
      if (!nextBoard) return false;
      if (checkWinner(nextBoard, gridSize, winLength) === AI) return true; // winning move is always safe

      const humanPieces = getPlayerPieces(nextBoard, HUMAN);
      const nextEmpty = getEmptyCells(nextBoard);
      for (const hTo of nextEmpty) {
        if (canPlace(nextBoard, HUMAN, maxPieces)) {
          const hNext = placePiece(nextBoard, hTo, HUMAN);
          if (hNext && checkWinner(hNext, gridSize, winLength) === HUMAN) return false;
        }
        for (const hFrom of humanPieces) {
          const hNext = movePiece(nextBoard, hFrom, hTo, HUMAN);
          if (hNext && checkWinner(hNext, gridSize, winLength) === HUMAN) return false;
        }
      }
      return true;
    });

    const pool = safeMoves.length > 0 ? safeMoves : scored;
    const move = pickFromTopMoves(pool, 2); // hard mode less random (top 2)
    recordMove(move);
    return move;
  }

  // Medium mode: pick from top 3 with weighted randomness
  const move = pickFromTopMoves(scored, 3);
  recordMove(move);
  return move;
}

// Expose reset for testing / new game
export function resetAIMemory(): void {
  aiMoveHistory.length = 0;
}
