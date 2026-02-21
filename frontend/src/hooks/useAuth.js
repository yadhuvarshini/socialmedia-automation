import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const API = '/api';

/** Normalize user to a common shape for the app */
function normalizeUser(source) {
  if (!source) return null;
  const base = {
    id: source.id || source.uid || source._id,
    email: source.email,
    name: source.name,
    timezone: source.timezone ?? 'UTC',
    profileCompletion: source.profileCompletion ?? 0,
    onboardingStep: source.onboardingStep ?? 1,
    profile: {
      firstName: source.profile?.firstName || source.displayName?.split(' ')[0] || '',
      lastName: source.profile?.lastName || source.displayName?.split(' ').slice(1).join(' ') || '',
      profilePicture: source.profile?.profilePicture || source.photoURL || source.picture,
    },
  };
  if (source.profile) {
    base.profile.firstName = source.profile.firstName || base.profile.firstName;
    base.profile.lastName = source.profile.lastName || base.profile.lastName;
    base.profile.profilePicture = source.profile.profilePicture || base.profile.profilePicture;
  }
  return base;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState(null); // 'firebase' | 'session'

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const res = await fetch(`${API}/me`, { credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setUser(normalizeUser(data));
          setAuthMode('session');
          return true;
        }
      } catch (_) {}
      return false;
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;
      if (firebaseUser) {
        setUser(normalizeUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }));
        setAuthMode('firebase');
      } else {
        const hasSession = await checkSession();
        if (!hasSession) setUser(null);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (authMode === 'firebase') {
      await signOut(auth);
    }
    try {
      localStorage.removeItem('blazly_token');
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (_) {}
    setUser(null);
    setAuthMode(null);
  };

  return { user, loading, logout };
}

export async function api(path, options = {}) {
  let token = null;
  const jwtToken = typeof localStorage !== 'undefined' ? localStorage.getItem('blazly_token') : null;
  if (jwtToken) {
    token = jwtToken;
  } else if (auth.currentUser) {
    token = await auth.currentUser.getIdToken().catch(() => null);
  }

  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });
}
