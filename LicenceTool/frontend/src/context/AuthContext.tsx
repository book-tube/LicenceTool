import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export type UserRole = 'admin' | 'user' | null;

interface User {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  canAccess: (requiredRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const inferRoleFromEmail = (email: string): Exclude<UserRole, null> => {
    const normalized = email.toLowerCase();
    if (normalized.includes('admin')) return 'admin';
    return 'user';
  };

  // Verify token on mount
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser) as User;
          if (parsed?.id && parsed?.email && parsed?.role) {
            setUser(parsed);
          }
        } catch {
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      // Demo fallback until real login API is connected.
      const role = inferRoleFromEmail(email);
      const userData: User = {
        id: 'user-123',
        email,
        role
      };
      setUser(userData);
      setToken('mock-token');
      localStorage.setItem('token', 'mock-token');
      localStorage.setItem('user', JSON.stringify(userData));
      axios.defaults.headers.common['Authorization'] = 'Bearer mock-token';
    } catch (error) {
      throw new Error('Login fehlgeschlagen');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const canAccess = (requiredRoles: UserRole[]) => {
    if (!user || !user.role) return false;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth muss innerhalb von AuthProvider verwendet werden');
  }
  return context;
};
