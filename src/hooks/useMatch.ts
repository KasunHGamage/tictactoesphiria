// ─────────────────────────────────────────────
//  useMatch.ts — Real-time game state synchronization
// ─────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { MatchDocument, MovePayload } from '../services/matchTypes';
import { listenToMatch, applyMove, resignMatch } from '../services/matchService';
import { Board, Player } from '../game/gameTypes';

export function useMatch(matchId: string, myUid: string, playerSide: Player) {
  const [match, setMatch] = useState<MatchDocument | null>(null);
  const [optimisticBoard, setOptimisticBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    
    // Reset state for new matchId
    setMatch(null);
    setOptimisticBoard(null);
    setError(null);

    const unsub = listenToMatch(matchId, (updated) => {
      setMatch(updated);
      setOptimisticBoard(null);
    });
    return unsub;
  }, [matchId]);

  const myTurn = match?.currentPlayer === playerSide && match.status === 'playing';

  const performMove = useCallback(async (payload: MovePayload) => {
    if (!match || !myTurn) return;

    // Optimistic UI update
    const boardCopy = [...(optimisticBoard || match.board)] as Board;
    if (payload.type === 'place') {
      boardCopy[payload.toIndex] = playerSide;
    } else {
      boardCopy[payload.fromIndex!] = null;
      boardCopy[payload.toIndex] = playerSide;
    }
    setOptimisticBoard(boardCopy);

    try {
      await applyMove(matchId, payload, playerSide, match.moveCount);
      setError(null);
    } catch (e: any) {
      setOptimisticBoard(null);
      setError(e.message);
      console.error(e);
    }
  }, [match, matchId, playerSide, myTurn, optimisticBoard]);

  const resign = async () => {
    return resignMatch(matchId, myUid);
  };

  return { 
    match, 
    optimisticBoard, 
    myTurn, 
    error, 
    applyMove: performMove, 
    resign 
  };
}
