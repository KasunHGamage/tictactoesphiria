// ─────────────────────────────────────────────
//  useInvites.ts — React hook for pending invites
// ─────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { InviteDocument } from '../multiplayer/multiplayerTypes';
import {
  listenToInvites,
  acceptInvite as serviceAccept,
  declineInvite as serviceDecline,
} from '../multiplayer/inviteService';

interface UseInvitesReturn {
  invites: InviteDocument[];
  loading: boolean;
  error: string | null;
  accept: (invite: InviteDocument, uid: string, displayName: string) => Promise<string>;
  decline: (inviteId: string) => Promise<void>;
}

export function useInvites(uid: string | null): UseInvitesReturn {
  const [invites, setInvites] = useState<InviteDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = listenToInvites(
      uid,
      (updated) => {
        setInvites(updated);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [uid]);

  const accept = useCallback(
    async (invite: InviteDocument, joiningUid: string, displayName: string): Promise<string> => {
      await serviceAccept(invite.id, invite, joiningUid, displayName);
      return invite.matchId;
    },
    [],
  );

  const decline = useCallback(async (inviteId: string): Promise<void> => {
    await serviceDecline(inviteId);
  }, []);

  return { invites, loading, error, accept, decline };
}
