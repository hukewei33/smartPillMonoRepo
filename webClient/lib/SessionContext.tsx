'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { hello } from '@/lib/api';
import { clearToken, getToken, setToken as persistToken } from '@/lib/session';

type SessionContextValue = {
  isLoggedIn: boolean | null;
  setToken: (token: string) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const validate = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoggedIn(false);
      return;
    }
    try {
      await hello(token);
      setIsLoggedIn(true);
    } catch {
      clearToken();
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    validate();
  }, [validate]);

  const setToken = useCallback((token: string) => {
    persistToken(token);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsLoggedIn(false);
  }, []);

  return (
    <SessionContext.Provider value={{ isLoggedIn, setToken, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
