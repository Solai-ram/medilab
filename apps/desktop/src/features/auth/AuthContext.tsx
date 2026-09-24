import React, { createContext, useContext, useState, useEffect } from 'react';
import { SessionUser } from '@lab/shared-types';
import { dbService } from '../../services/db';

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCashier: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isExplicitLogout = localStorage.getItem('LAB_EXPLICIT_LOGOUT') === 'true';
    const saved = localStorage.getItem('LAB_SESSION_USER');

    if (saved && !isExplicitLogout) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.warn('Session parse error:', e);
        localStorage.removeItem('LAB_SESSION_USER');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, pass: string): Promise<boolean> => {
    const session = await dbService.login(username, pass);
    if (session) {
      setUser(session);
      localStorage.setItem('LAB_SESSION_USER', JSON.stringify(session));
      localStorage.removeItem('LAB_EXPLICIT_LOGOUT');
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('LAB_SESSION_USER');
    localStorage.setItem('LAB_EXPLICIT_LOGOUT', 'true');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin: !!user,
        isCashier: false,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
