import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: { username: string; password: string }) => Promise<User>;
  logout: () => void;
  switchRoleForDemo: (role: UserRole) => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('khatinoo_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await api.getMe();
        setUser(data.user);
      } catch (err) {
        console.warn('Session expired or invalid token');
        localStorage.removeItem('khatinoo_auth_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (credentials: { username: string; password: string }): Promise<User> => {
    const data = await api.login(credentials);
    localStorage.setItem('khatinoo_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('khatinoo_auth_token');
    setToken(null);
    setUser(null);
  };

  const switchRoleForDemo = async (role: UserRole) => {
    const roleCredentials: Record<UserRole, { u: string; p: string }> = {
      admin: { u: 'admin', p: 'admin123456' },
      site_manager: { u: 'sitemanager', p: 'site123456' },
      seller: { u: 'cashier', p: 'seller123' },
      accountant: { u: 'accountant', p: 'acc123456' },
      chief_accountant: { u: 'chiefacc', p: 'chief123456' },
    };

    const target = roleCredentials[role];
    if (target) {
      await login({ username: target.u, password: target.p });
    }
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has full access to everything
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        switchRoleForDemo,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
