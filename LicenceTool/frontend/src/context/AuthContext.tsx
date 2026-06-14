import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export type UserRole = 'admin' | 'private' | 'business' | null;

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

  // Verify token on mount
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // In real app: verify token with backend
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      // In real app: call login API
      const userData: User = {
        id: 'user-123',
        email,
        role: 'private'
      };
      setUser(userData);
      setToken('mock-token');
      localStorage.setItem('token', 'mock-token');
    } catch (error) {
      throw new Error('Login fehlgeschlagen');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const canAccess = (requiredRoles: UserRole[]) => {
    if (!user) return false;
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
