import { 
  doc, getDoc, setDoc, runTransaction, onSnapshot, 
  serverTimestamp, Unsubscribe, updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchDocument, MatchStatus, MovePayload, PlayerInfo } from './matchTypes';
import { Board, Player } from '../game/gameTypes';
import { 
  createBoard, placePiece, movePiece, checkWinner, canPlace, getWinningLine 
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

  const match: MatchDocument = {
    id: matchId,
    board: createBoard(3),
    boardSize: 3,
    winLength: 3,
    pieceLimit: 3,
    currentPlayer: 'X',
    phase: 'placement',
    status: 'waiting',
    winner: null,
    winningLine: null,
    playerX: { uid, displayName },
    playerO: null,
    moveCount: 0,
    roundNumber: 1,
    scores: { [uid]: 0 },
    winStreaks: { [uid]: 0 },
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
      [`scores.${uid}`]: 0,
      [`winStreaks.${uid}`]: 0,
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

    if (data.status !== 'active') throw new Error('Match is not active');
    if (data.currentPlayer !== playerSide || data.moveCount !== expectedMoveCount) {
      throw new Error('Sync error or not your turn');
    }

    let nextBoard = payload.type === 'place' 
      ? placePiece(data.board, payload.toIndex, playerSide)
      : movePiece(data.board, payload.fromIndex!, payload.toIndex, playerSide);

    if (!nextBoard) throw new Error('Invalid move');

    const winningLine = getWinningLine(nextBoard, data.boardSize, data.winLength);
    const winner = winningLine ? playerSide : null;
    const nextPlayer = playerSide === 'X' ? 'O' : 'X';

    const updates: any = {
      board: nextBoard,
      currentPlayer: nextPlayer,
      phase: canPlace(nextBoard, nextPlayer, data.pieceLimit) ? 'placement' : 'movement',
      moveCount: data.moveCount + 1,
      updatedAt: serverTimestamp(),
    };

    if (winner) {
      updates.winner = winner;
      updates.winningLine = winningLine;
      updates.status = 'finished';
      
      const winnerUid = winner === 'X' ? data.playerX.uid : data.playerO!.uid;
      const loserUid = winner === 'X' ? data.playerO!.uid : data.playerX.uid;
      
      updates[`scores.${winnerUid}`] = (data.scores[winnerUid] || 0) + 1;
      updates[`winStreaks.${winnerUid}`] = (data.winStreaks[winnerUid] || 0) + 1;
      updates[`winStreaks.${loserUid}`] = 0;
    }

    tx.update(matchRef(matchId), updates);
  });
}

export async function startNextRound(matchId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    
    if (data.status !== 'finished') return;

    const nextRound = data.roundNumber + 1;
    let size = 3;
    let winLen = 3;
    let pieceLimit = 3;

    if (nextRound >= 3 && nextRound <= 4) {
      size = 4; winLen = 4; pieceLimit = 4;
    } else if (nextRound >= 5) {
      size = 5; winLen = 4; pieceLimit = 5;
    }

    tx.update(matchRef(matchId), {
      board: createBoard(size),
      boardSize: size,
      winLength: winLen,
      pieceLimit: pieceLimit,
      roundNumber: nextRound,
      currentPlayer: 'X', // Or alternate? Let's keep it simple
      phase: 'placement',
      status: 'active',
      winner: null,
      winningLine: null,
      moveCount: 0,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function resignMatch(matchId: string, resigningUid: string): Promise<void> {
  await updateDoc(matchRef(matchId), { status: 'finished', updatedAt: serverTimestamp() });
}
