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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  canAccess: (requiredRoles: UserRole[]) => boolean;
}

const KEYCLOAK_TOKEN_URL =
  'http://localhost:8081/realms/licence-tool/protocol/openid-connect/token';
const KEYCLOAK_CLIENT_ID = 'licence-tool-backend';
const KEYCLOAK_CLIENT_SECRET = 'change-me';

/** Decode a JWT payload without verifying the signature (verification is done by the backend). */
function parseJwtPayload(token: string): Record<string, any> {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

/** Map Keycloak realm roles to the frontend UserRole type. */
function extractRole(payload: Record<string, any>): Exclude<UserRole, null> {
  const realmRoles: string[] = payload?.realm_access?.roles ?? [];
  if (realmRoles.includes('admin')) return 'admin';
  return 'user'; // covers 'private' and 'business'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = (accessToken: string) => {
    const payload = parseJwtPayload(accessToken);
    const userData: User = {
      id: payload.sub ?? '',
      email: payload.email ?? '',
      role: extractRole(payload)
    };
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setToken(accessToken);
    setUser(userData);
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    return userData;
  };

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      const payload = parseJwtPayload(storedToken);
      const expiry: number = payload.exp ?? 0;
      if (expiry * 1000 > Date.now()) {
        applyToken(storedToken);
      } else {
        // Token expired – clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', KEYCLOAK_CLIENT_ID);
    params.append('client_secret', KEYCLOAK_CLIENT_SECRET);
    params.append('username', username);
    params.append('password', password);

    // Call Keycloak directly (not via backend proxy)
    const response = await axios.post<{ access_token: string }>(
      KEYCLOAK_TOKEN_URL,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    applyToken(response.data.access_token);
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
