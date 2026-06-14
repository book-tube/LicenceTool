import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Erweiterte Express Request mit User-Info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

// ============================================
// Authentication Middleware
// ============================================
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Keine Authentifizierung' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Ungültiger Token' });
  }
};

// ============================================
// Authorization Middleware (Role-based)
// ============================================
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentifizierung erforderlich' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Zugriff verweigert. Erforderliche Rolle: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};

// ============================================
// Resource-Owner Middleware
// Stelle sicher, dass Benutzer nur ihre eigenen Daten sehen/ändern können
// ============================================
export const checkResourceOwnership = (paramName: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const targetUserId = req.params[paramName];

    if (!req.user) {
      return res.status(401).json({ error: 'Authentifizierung erforderlich' });
    }

    // Admin kann alle Ressourcen sehen
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Private/Business User können nur ihre eigenen Ressourcen sehen
    if (req.user.id !== targetUserId) {
      return res.status(403).json({ 
        error: 'Sie dürfen nur auf Ihre eigenen Ressourcen zugreifen' 
      });
    }

    next();
  };
};
