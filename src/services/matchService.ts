// ─────────────────────────────────────────────
//  matchService.ts — Core game logic syncing
// ─────────────────────────────────────────────

import { 
  doc, getDoc, setDoc, runTransaction, onSnapshot, 
  serverTimestamp, Unsubscribe 
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchDocument, MatchStatus, MovePayload, PlayerInfo } from './matchTypes';
import { Board, Player } from '../game/gameTypes';
import { 
  createBoard, placePiece, movePiece, checkWinner, canPlace 
} from '../game/gameEngine';

const matchRef = (id: string) => doc(db, 'matches', id);

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateMatchId() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

export async function createMatch(uid: string, displayName: string): Promise<string> {
  let matchId = '';
  let unique = false;
  while (!unique) {
    matchId = generateMatchId();
    const snap = await getDoc(matchRef(matchId));
    if (!snap.exists()) unique = true;
  }

  const match: Partial<MatchDocument> = {
    id: matchId,
    board: createBoard(),
    currentPlayer: 'X',
    phase: 'placement',
    status: 'waiting',
    winner: null,
    playerX: { uid, displayName },
    playerO: null,
    moveCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(matchRef(matchId), match);
  return matchId;
}

export async function joinMatch(matchId: string, uid: string, displayName: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) throw new Error('Match not found');
    const data = snap.data() as MatchDocument;
    if (data.status !== 'waiting') throw new Error('Match already started');
    
    tx.update(matchRef(matchId), {
      playerO: { uid, displayName },
      status: 'active',
      updatedAt: serverTimestamp(),
    });
  });
}

export function listenToMatch(matchId: string, onUpdate: (match: MatchDocument) => void): Unsubscribe {
  return onSnapshot(matchRef(matchId), (snap) => {
    if (snap.exists()) onUpdate(snap.data() as MatchDocument);
  });
}

export async function applyMove(matchId: string, payload: MovePayload, playerSide: Player, expectedMoveCount: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    const data = snap.data() as MatchDocument;

    if (data.currentPlayer !== playerSide || data.moveCount !== expectedMoveCount) {
      throw new Error('Sync error or not your turn');
    }

    let nextBoard = payload.type === 'place' 
      ? placePiece(data.board, payload.toIndex, playerSide)
      : movePiece(data.board, payload.fromIndex!, payload.toIndex, playerSide);

    if (!nextBoard) throw new Error('Invalid move');

    const winner = checkWinner(nextBoard);
    const nextPlayer = playerSide === 'X' ? 'O' : 'X';

    tx.update(matchRef(matchId), {
      board: nextBoard,
      currentPlayer: nextPlayer,
      phase: canPlace(nextBoard, nextPlayer) ? 'placement' : 'movement',
      winner: winner ?? null,
      status: winner ? 'finished' : 'active',
      moveCount: data.moveCount + 1,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function resignMatch(matchId: string, resigningUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    const data = snap.data() as MatchDocument;
    const winner = data.playerX.uid === resigningUid ? 'O' : 'X';
    tx.update(matchRef(matchId), { status: 'finished', winner, updatedAt: serverTimestamp() });
  });
}
