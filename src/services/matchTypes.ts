// ─────────────────────────────────────────────
//  matchTypes.ts — Match and Invite data structures
// ─────────────────────────────────────────────

import { Board, Player, Difficulty } from '../game/gameTypes';

export type MatchStatus = 'waiting' | 'playing' | 'finished' | 'abandoned';
export type InviteStatus = 'pending' | 'accepted' | 'rejected';

export interface PlayerInfo {
  uid: string;
  displayName: string;
}

export interface MatchDocument {
  id: string;
  board: Board;
  gridSize: number;
  winLength: number;
  maxPieces: number;
  difficulty: Difficulty;
  currentPlayer: Player;
  phase: 'placement' | 'movement';
  status: MatchStatus;
  turnStartedAt: any;
  turnDuration: number;
  winner: Player | null;
  winningLine: number[] | null;
  playerX: PlayerInfo;
  playerO: PlayerInfo | null;
  moveCount: number;
  roundNumber: number;
  scores: Record<string, number>;
  winStreaks: Record<string, number>;
  createdAt: any;
  updatedAt: any;
}

export interface MatchInvite {
  id: string;
  from: string;
  fromName: string;
  to: string;
  status: InviteStatus;
  matchId: string | null;
  createdAt: any;
}

export interface MovePayload {
  type: 'place' | 'move';
  fromIndex?: number;
  toIndex: number;
}
