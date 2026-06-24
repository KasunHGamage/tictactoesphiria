import { 
  doc, getDoc, setDoc, runTransaction, onSnapshot, 
  serverTimestamp, Unsubscribe, updateDoc, arrayUnion, collection, query, where, getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { MatchDocument, MatchStatus, MovePayload, PlayerInfo } from './matchTypes';
import { Board, Player, GameConfig } from '../game/gameTypes';
import { 
  createBoard, placePiece, movePiece, checkWinner, canPlace, getWinningLine, DEFAULT_CONFIG 
} from '../game/gameEngine';

const matchRef = (id: string) => doc(db, 'matches', id);

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateMatchId() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

/**
 * Check if a user is already in an active match
 * Returns the match ID if they are in a playing/waiting match, null otherwise
 */
export async function getUserActiveMatch(uid: string): Promise<string | null> {
  const activeStatuses: MatchStatus[] = ['playing', 'timeout_pending'];
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;

  // We fetch matches where player is involved and filter out stale ones
  const checkDocs = (docs: any[]) => {
    for (const d of docs) {
      const data = d.data() as MatchDocument;
      const updatedAt = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : now;
      if (now - updatedAt < FIVE_MINUTES) {
        return data.id;
      }
    }
    return null;
  };

  const playerXQ = query(
    collection(db, 'matches'),
    where('playerX.uid', '==', uid),
    where('status', 'in', activeStatuses)
  );
  const playerXSnap = await getDocs(playerXQ);
  const activeX = checkDocs(playerXSnap.docs);
  if (activeX) return activeX;

  const playerOQ = query(
    collection(db, 'matches'),
    where('playerO.uid', '==', uid),
    where('status', 'in', activeStatuses)
  );
  const playerOSnap = await getDocs(playerOQ);
  const activeO = checkDocs(playerOSnap.docs);
  if (activeO) return activeO;

  return null;
}

export async function createMatch(uid: string, displayName: string, config: GameConfig = DEFAULT_CONFIG): Promise<string> {
  let matchId = '';
  let unique = false;
  while (!unique) {
    matchId = generateMatchId();
    const snap = await getDoc(matchRef(matchId));
    if (!snap.exists()) unique = true;
  }

  const match: MatchDocument = {
    id: matchId,
    board: createBoard(config.gridSize),
    gridSize: config.gridSize,
    winLength: config.winLength,
    maxPieces: config.maxPieces,
    difficulty: config.difficulty,
    currentPlayer: 'X',
    phase: 'placement',
    status: 'waiting',
    turnStartedAt: serverTimestamp(),
    turnDuration: 60,
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
    timedOutPlayer: null,
  };

  await setDoc(matchRef(matchId), match);
  return matchId;
}

export async function joinMatch(matchId: string, uid: string, displayName: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) throw new Error('Match not found');
    const data = snap.data() as MatchDocument;
    
    // Check if match is still waiting
    if (data.status !== 'waiting') throw new Error('Match already started or unavailable');
    
    // Check if playerO slot is still empty (prevent race condition)
    if (data.playerO !== null) throw new Error('Match already has two players');
    
    // Check if the inviter (playerX) is still the same person (not in another match)
    if (!data.playerX || !data.playerX.uid) throw new Error('Invalid match - no inviter');
    
    tx.update(matchRef(matchId), {
      playerO: { uid, displayName },
      status: 'playing',
      turnStartedAt: serverTimestamp(),
      [`scores.${uid}`]: 0,
      [`winStreaks.${uid}`]: 0,
      updatedAt: serverTimestamp(),
    });
  });
}

export function listenToMatch(
  matchId: string,
  onUpdate: (match: MatchDocument) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    matchRef(matchId),
    (snap) => {
      if (snap.exists()) onUpdate(snap.data() as MatchDocument);
    },
    (error) => {
      console.warn('[Firestore] match listener failed:', error);
      onError?.(error);
    }
  );
}

export async function applyMove(matchId: string, payload: MovePayload, playerSide: Player, expectedMoveCount: number): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    const data = snap.data() as MatchDocument;

    if (data.status !== 'playing') throw new Error('Match is not playing');
    if (data.currentPlayer !== playerSide || data.moveCount !== expectedMoveCount) {
      throw new Error('Sync error or not your turn');
    }

    let nextBoard = payload.type === 'place' 
      ? placePiece(data.board, payload.toIndex, playerSide)
      : movePiece(data.board, payload.fromIndex!, payload.toIndex, playerSide);

    if (!nextBoard) throw new Error('Invalid move');

    const winningLine = getWinningLine(nextBoard, data.gridSize, data.winLength);
    const winner = winningLine ? playerSide : null;
    const nextPlayer = playerSide === 'X' ? 'O' : 'X';

    const updates: any = {
      board: nextBoard,
      currentPlayer: nextPlayer,
      phase: canPlace(nextBoard, nextPlayer, data.maxPieces) ? 'placement' : 'movement',
      moveCount: data.moveCount + 1,
      turnStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (winner) {
      updates.winner = winner;
      updates.winningLine = winningLine;
      updates.status = 'finished';
      updates.endReason = 'win';
      
      const winnerUid = winner === 'X' ? data.playerX.uid : data.playerO!.uid;
      const loserUid = winner === 'X' ? data.playerO!.uid : data.playerX.uid;
      
      updates[`scores.${winnerUid}`] = (data.scores[winnerUid] || 0) + 1;
      updates[`winStreaks.${winnerUid}`] = (data.winStreaks[winnerUid] || 0) + 1;
      updates[`winStreaks.${loserUid}`] = 0;
    }

    tx.update(matchRef(matchId), updates);
  });
}

export async function setReadyForNextRound(matchId: string, uid: string): Promise<void> {
  await updateDoc(matchRef(matchId), {
    status: 'waiting_next_round',
    readyPlayers: arrayUnion(uid),
    updatedAt: serverTimestamp()
  });
}

export async function startNextRound(matchId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    
    if (data.status !== 'waiting_next_round' || (data.readyPlayers?.length || 0) < 2) return;

    const nextRound = data.roundNumber + 1;

    tx.update(matchRef(matchId), {
      board: createBoard(data.gridSize),
      roundNumber: nextRound,
      currentPlayer: 'X', 
      phase: 'placement',
      status: 'playing',
      winner: null,
      winningLine: null,
      moveCount: 0,
      turnStartedAt: serverTimestamp(),
      timedOutPlayer: null,
      readyPlayers: [],
      updatedAt: serverTimestamp()
    });
  });
}

export async function triggerTimeout(matchId: string, timedOutPlayer: Player): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    if (data.status !== 'playing') return;

    tx.update(matchRef(matchId), {
      status: 'timeout_pending',
      timedOutPlayer,
      updatedAt: serverTimestamp()
    });
    console.log("[SERVICE] Match status set to timeout_pending");
  });
}

export async function continueMatch(matchId: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    if (data.status !== 'timeout_pending') return;

    tx.update(matchRef(matchId), {
      status: 'playing',
      timedOutPlayer: null,
      board: createBoard(data.gridSize),
      roundNumber: data.roundNumber + 1,
      currentPlayer: 'X',
      phase: 'placement',
      moveCount: 0,
      turnStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });
}

export async function forfeitMatch(matchId: string, loserSide: Player): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    if (data.status !== 'timeout_pending') return;

    console.log("[SERVICE] Forfeiting match for loser:", loserSide);
    const winnerSide = loserSide === 'X' ? 'O' : 'X';
    const winnerUid = winnerSide === 'X' ? data.playerX.uid : data.playerO!.uid;
    const loserUid = loserSide === 'X' ? data.playerO!.uid : data.playerX.uid;

    tx.update(matchRef(matchId), {
      status: 'finished',
      winner: winnerSide,
      endReason: 'timeout',
      timedOutPlayer: null,
      [`scores.${winnerUid}`]: (data.scores[winnerUid] || 0) + 1,
      [`winStreaks.${winnerUid}`]: (data.winStreaks[winnerUid] || 0) + 1,
      [`winStreaks.${loserUid}`]: 0,
      updatedAt: serverTimestamp()
    });
  });
}

export async function resignMatch(matchId: string, resigningUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    if (data.status !== 'playing') return;
    const winner = resigningUid === data.playerX.uid ? 'O' : 'X';
    tx.update(matchRef(matchId), { 
      status: 'abandoned', winner, endReason: 'resign',
      updatedAt: serverTimestamp() 
    });
  });
}

/**
 * Either player can call this to immediately end the match from ANY active state.
 * The caller is treated as the forfeiting side.
 */
export async function abandonMatch(matchId: string, leavingUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    if (!['playing', 'timeout_pending', 'waiting'].includes(data.status)) return;

    const winner: Player = leavingUid === data.playerX.uid ? 'O' : 'X';
    const winnerUid = winner === 'X' ? data.playerX.uid : data.playerO?.uid;

    const updates: any = {
      status: 'abandoned',
      winner,
      endReason: 'abandoned',
      updatedAt: serverTimestamp(),
    };
    if (winnerUid) {
      updates[`scores.${winnerUid}`]    = (data.scores?.[winnerUid] || 0) + 1;
      updates[`winStreaks.${winnerUid}`] = (data.winStreaks?.[winnerUid] || 0) + 1;
      updates[`winStreaks.${leavingUid}`] = 0;
    }
    tx.update(matchRef(matchId), updates);
  });
}

/**
 * Called by the PRESENT player when the opponent has gone offline.
 * Present player wins.
 */
export async function winByAbsence(matchId: string, winnerUid: string): Promise<void> {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(matchRef(matchId));
    if (!snap.exists()) return;
    const data = snap.data() as MatchDocument;
    if (!['playing', 'timeout_pending'].includes(data.status)) return;

    const winner: Player = winnerUid === data.playerX.uid ? 'X' : 'O';
    const loserUid = winnerUid === data.playerX.uid ? data.playerO?.uid : data.playerX.uid;

    const updates: any = {
      status: 'abandoned',
      winner,
      endReason: 'opponent_offline',
      updatedAt: serverTimestamp(),
      [`scores.${winnerUid}`]:     (data.scores?.[winnerUid] || 0) + 1,
      [`winStreaks.${winnerUid}`]:  (data.winStreaks?.[winnerUid] || 0) + 1,
    };
    if (loserUid) updates[`winStreaks.${loserUid}`] = 0;
    tx.update(matchRef(matchId), updates);
  });
}
