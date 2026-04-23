// ─────────────────────────────────────────────
//  useMatch.ts — React hook for live match state
// ─────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { MatchDocument, MovePayload } from '../multiplayer/multiplayerTypes';
import {
  listenToMatch,
  applyMove as serviceApplyMove,
  resignMatch as serviceResign,
} from '../multiplayer/matchService';
import { setUserCurrentMatch } from '../multiplayer/userService';
import { Board } from '../game/gameTypes';

interface UseMatchReturn {
  /** Latest confirmed match state from Firestore (null while loading) */
  match: MatchDocument | null;
  /** Optimistic local board — shown immediately on move, reconciled by listener */
  optimisticBoard: Board | null;
  /** True when this player can make a move right now */
  myTurn: boolean;
  loading: boolean;
  error: string | null;
  /** Submit a move. Applies optimistically then syncs to Firestore. */
  applyMove: (payload: MovePayload) => Promise<void>;
  /** Resign the match */
  resign: () => Promise<void>;
}

export function useMatch(
  matchId: string | null,
  myUid: string,
  playerSide: 'X' | 'O',
): UseMatchReturn {
  const [match, setMatch] = useState<MatchDocument | null>(null);
  const [optimisticBoard, setOptimisticBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ref to always have latest moveCount without stale closure issues
  const moveCountRef = useRef(0);
  // Prevent overlapping move submissions
  const submitting = useRef(false);

  // ── Real-time listener ─────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;

    setLoading(true);
    const unsub = listenToMatch(
      matchId,
      (updated) => {
        setMatch(updated);
        moveCountRef.current = updated.moveCount;
        // Clear optimistic state — Firestore is now the source of truth
        setOptimisticBoard(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return () => {
      unsub();
      // Clear currentMatchId when leaving the screen
      setUserCurrentMatch(myUid, null).catch(() => {});
    };
  }, [matchId, myUid]);

  // ── Derived: is it this player's turn? ─────────────────────────
  // inGame is derived — NEVER from a stored boolean
  const myTurn =
    !!match &&
    match.status === 'active' &&
    match.currentPlayer === playerSide;

  // ── applyMove (optimistic + transaction) ───────────────────────
  const applyMove = useCallback(
    async (payload: MovePayload): Promise<void> => {
      if (!match || !myTurn || submitting.current) return;

      submitting.current = true;

      // 1. Snapshot the board before optimistic update (for rollback)
      const prevBoard = match.board;

      // 2. Compute optimistic next board locally for instant feedback
      // (We don't call gameEngine here — the full validation runs in the transaction)
      const { placePiece, movePiece } = require('../game/gameEngine');
      let nextBoard: Board | null = null;
      if (payload.type === 'place') {
        nextBoard = placePiece(match.board, payload.toIndex, playerSide);
      } else if (payload.fromIndex !== undefined) {
        nextBoard = movePiece(match.board, payload.fromIndex, payload.toIndex, playerSide);
      }

      if (nextBoard) {
        setOptimisticBoard(nextBoard);
      }

      // 3. Send to Firestore (transaction validates server-side)
      try {
        await serviceApplyMove(
          match.id,
          payload,
          playerSide,
          moveCountRef.current,
        );
        // On success: Firestore listener will update `match` and clear optimisticBoard
      } catch (err: unknown) {
        // Rollback — restore previous board
        setOptimisticBoard(prevBoard);
        const message = err instanceof Error ? err.message : 'Move failed';
        setError(message);
        // Clear error after 2s so user can retry
        setTimeout(() => setError(null), 2000);
      } finally {
        submitting.current = false;
      }
    },
    [match, myTurn, playerSide],
  );

  // ── resign ────────────────────────────────────────────────────
  const resign = useCallback(async () => {
    if (!match) return;
    try {
      await serviceResign(match.id, myUid);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Resign failed';
      setError(message);
    }
  }, [match, myUid]);

  return {
    match,
    optimisticBoard,
    myTurn,
    loading,
    error,
    applyMove,
    resign,
  };
}
