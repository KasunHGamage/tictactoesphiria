// ─────────────────────────────────────────────
//  useMatchInvitations.ts — Navigation & UI bridge
// ─────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { MatchInvite } from '../services/matchTypes';
import { 
  listenToIncomingInvites, listenToAcceptedInvites, 
  acceptMatchInvite, rejectMatchInvite, sendMatchInvite 
} from '../services/matchInviteService';

export function useMatchInvitations(onMatchStarted: (matchId: string, playerSide: 'X' | 'O') => void) {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<MatchInvite[]>([]);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming invites to show in UI
    const unsubIncoming = listenToIncomingInvites(user.uid, setIncoming);

    // Listen for accepted invites to trigger navigation
    const unsubAccepted = listenToAcceptedInvites(user.uid, (matchId, side) => {
      onMatchStarted(matchId, side);
    });

    return () => {
      unsubIncoming();
      unsubAccepted();
    };
  }, [user, onMatchStarted]);

  const inviteFriend = async (friendUid: string, matchId?: string) => {
    if (!user) return;
    return sendMatchInvite(user.uid, user.displayName || 'Player', friendUid, matchId);
  };

  const accept = async (invite: MatchInvite) => {
    if (!user || !invite.matchId) return;
    return acceptMatchInvite(invite.id, invite.matchId, user.uid, user.displayName || 'Player');
  };

  const reject = async (inviteId: string) => {
    return rejectMatchInvite(inviteId);
  };

  return { incoming, inviteFriend, accept, reject };
}
