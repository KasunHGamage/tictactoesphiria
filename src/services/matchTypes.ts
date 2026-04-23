// ─────────────────────────────────────────────
//  matchTypes.ts — Match and Invite data structures
// ─────────────────────────────────────────────

import { Board, Player } from '../game/gameTypes';

export type MatchStatus = 'waiting' | 'active' | 'finished';
export type InviteStatus = 'pending' | 'accepted' | 'rejected';

export interface PlayerInfo {
  uid: string;
  displayName: string;
}

export interface MatchDocument {
  id: string;
  board: Board;
  currentPlayer: Player;
  phase: 'placement' | 'movement';
  status: MatchStatus;
  winner: Player | null;
  playerX: PlayerInfo;
  playerO: PlayerInfo | null;
  moveCount: number;
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
