// ─────────────────────────────────────────────
//  AuthContext.tsx — Global Authentication state
// ─────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AppState } from 'react-native';
import { ensureUserProfile, updateUserLastSeen } from '../services/userService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const updatePresence = () => {
      updateUserLastSeen(user.uid).catch(err => console.warn('[Presence]', err));
    };

    const provider = user.providerData[0]?.providerId || 'password';
    ensureUserProfile(user.uid, user.email, user.displayName, user.photoURL, provider)
      .then(() => {
        if (!cancelled) updatePresence();
      })
      .catch(err => console.warn('[Profile]', err));

    // Periodic heartbeat every 10 seconds while active
    const intervalId = setInterval(() => {
      if (AppState.currentState === 'active') {
        updatePresence();
      }
    }, 10000);

    // Update immediately on app state changes (e.g., backgrounding)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' || nextAppState === 'background') {
        updatePresence();
      }
    });

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
