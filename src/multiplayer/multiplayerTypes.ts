// ─────────────────────────────────────────────
//  multiplayerTypes.ts — Shared types for Firestore collections
// ─────────────────────────────────────────────

import { Timestamp } from 'firebase/firestore';
import { Board, GamePhase, Player } from '../game/gameTypes';

// ── Firestore document shapes ─────────────────────────────────────

export interface PlayerInfo {
  uid: string;
  displayName: string;
}

export type MatchStatus = 'waiting' | 'active' | 'finished';

export interface MatchDocument {
  /** 6-char uppercase match code */
  id: string;
  board: Board;
  currentPlayer: Player;
  phase: GamePhase;
  status: MatchStatus;
  winner: Player | null;
  playerX: PlayerInfo;
  playerO: PlayerInfo | null;
  /** Incremented on every committed move — used to prevent race conditions */
  moveCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InviteDocument {
  id: string;
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  matchId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: Timestamp;
}

export interface UserDocument {
  uid: string;
  displayName: string;
  /** Set when creating/joining a match, cleared on finish. Derived inGame = this !== null. */
  currentMatchId: string | null;
  updatedAt: Timestamp;
}

// ── Local identity ────────────────────────────────────────────────

export interface LocalUser {
  uid: string;
  displayName: string;
}

// ── Move payload ──────────────────────────────────────────────────

export interface MovePayload {
  type: 'place' | 'move';
  toIndex: number;
  fromIndex?: number; // required when type === 'move'
}

// ── App navigation state ──────────────────────────────────────────

export type AppRoute =
  | { name: 'Home' }
  | { name: 'SinglePlayer' }
  | { name: 'Lobby' }
  | { name: 'MultiplayerGame'; matchId: string; playerSide: Player };
