// ─────────────────────────────────────────────
//  matchService.ts — Core match operations
// ─────────────────────────────────────────────

import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchDocument, MatchStatus, MovePayload, PlayerInfo } from './multiplayerTypes';
import { Board, Player } from '../game/gameTypes';
import {
  createBoard,
  placePiece,
  movePiece,
  checkWinner,
  canPlace,
} from '../game/gameEngine';
import { setUserCurrentMatch } from './userService';

// ── Helpers ───────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I

function randomMatchId(): string {
  return Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join('');
}

function matchRef(matchId: string) {
  return doc(db, 'matches', matchId);
}

// ── createMatch ───────────────────────────────────────────────────

/**
 * Creates a new match for the calling player (always X).
 * Retries up to 5 times on ID collision.
 * Returns the 6-char match code.
 */
export async function createMatch(
  uid: string,
  displayName: string,
): Promise<string> {
  let matchId = '';
  let attempts = 0;

  while (attempts < 5) {
    matchId = randomMatchId();
    const snap = await getDoc(matchRef(matchId));
    if (!snap.exists()) break;
    attempts++;
  }

  if (!matchId) throw new Error('Could not generate a unique match ID');

  const playerX: PlayerInfo = { uid, displayName };

  const match: Omit<MatchDocument, 'createdAt' | 'updatedAt'> & {
    createdAt: unknown;
    updatedAt: unknown;
  } = {
    id: matchId,
    board: createBoard(),
    currentPlayer: 'X',
    phase: 'placement',
    status: 'waiting' as MatchStatus,
    winner: null,
    playerX,
    playerO: null,
    moveCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(matchRef(matchId), match);
  await setUserCurrentMatch(uid, matchId);

  return matchId;
}

// ── joinMatch ─────────────────────────────────────────────────────

/**
 * Joins an existing match as player O.
 * Wrapped in a transaction so two concurrent joins can't both succeed.
 */
export async function joinMatch(
  matchId: string,
  uid: string,
  displayName: string,
): Promise<void> {
  const ref = matchRef(matchId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Match not found');

    const data = snap.data() as MatchDocument;
    if (data.status !== 'waiting') throw new Error('Match is no longer open');
    if (data.playerX.uid === uid) throw new Error('Cannot join your own match');
    if (data.playerO !== null) throw new Error('Match is already full');

    const playerO: PlayerInfo = { uid, displayName };
    tx.update(ref, {
      playerO,
      status: 'active' as MatchStatus,
      updatedAt: serverTimestamp(),
    });
  });

  await setUserCurrentMatch(uid, matchId);
}

// ── listenToMatch ─────────────────────────────────────────────────

/**
 * Subscribe to real-time match updates.
 * Calls `onUpdate` whenever the Firestore document changes.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function listenToMatch(
  matchId: string,
  onUpdate: (match: MatchDocument) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    matchRef(matchId),
    (snap) => {
      if (!snap.exists()) {
        onError?.(new Error('Match document deleted'));
        return;
      }
      onUpdate(snap.data() as MatchDocument);
    },
    (err) => onError?.(err),
  );
}

// ── applyMove ─────────────────────────────────────────────────────

/**
 * Apply a validated move via Firestore transaction.
 *
 * Safety guarantees:
 *   1. currentPlayer must match playerSide (not your turn → rejected)
 *   2. moveCount must match expectedMoveCount (stale/duplicate move → rejected)
 *   3. Move is re-validated server-side using pure gameEngine functions
 *
 * @throws if validation fails — caller should rollback optimistic state
 */
export async function applyMove(
  matchId: string,
  payload: MovePayload,
  playerSide: Player,
  expectedMoveCount: number,
): Promise<void> {
  const ref = matchRef(matchId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Match not found');

    const data = snap.data() as MatchDocument;

    // ── Guard 1: correct turn ──────────────────────────────────
    if (data.currentPlayer !== playerSide) {
      throw new Error('Not your turn');
    }

    // ── Guard 2: no duplicate / stale moves ───────────────────
    if (data.moveCount !== expectedMoveCount) {
      throw new Error('Move already processed');
    }

    // ── Guard 3: match must be active ─────────────────────────
    if (data.status !== 'active') {
      throw new Error('Match is not active');
    }

    const board = data.board as Board;

    // ── Apply move using pure game engine ─────────────────────
    let nextBoard: Board | null = null;
    if (payload.type === 'place') {
      nextBoard = placePiece(board, payload.toIndex, playerSide);
    } else {
      if (payload.fromIndex === undefined) throw new Error('Missing fromIndex');
      nextBoard = movePiece(board, payload.fromIndex, payload.toIndex, playerSide);
    }

    if (!nextBoard) throw new Error('Invalid move');

    // ── Derive next state ─────────────────────────────────────
    const winner = checkWinner(nextBoard);
    const nextPlayer: Player = playerSide === 'X' ? 'O' : 'X';
    const nextPhase = canPlace(nextBoard, nextPlayer) ? 'placement' : 'movement';

    tx.update(ref, {
      board: nextBoard,
      currentPlayer: nextPlayer,
      phase: nextPhase,
      winner: winner ?? null,
      status: winner ? ('finished' as MatchStatus) : ('active' as MatchStatus),
      moveCount: data.moveCount + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

// ── resignMatch ───────────────────────────────────────────────────

/**
 * Forfeit the match. The opponent is set as winner immediately.
 */
export async function resignMatch(
  matchId: string,
  resigningUid: string,
): Promise<void> {
  const ref = matchRef(matchId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Match not found');
    const data = snap.data() as MatchDocument;

    if (data.status === 'finished') return; // already done

    // Determine winner = the other player
    const winner: Player = data.playerX.uid === resigningUid ? 'O' : 'X';

    tx.update(ref, {
      status: 'finished' as MatchStatus,
      winner,
      updatedAt: serverTimestamp(),
    });
  });

  // Clear the user's currentMatchId
  await setUserCurrentMatch(resigningUid, null);
}
