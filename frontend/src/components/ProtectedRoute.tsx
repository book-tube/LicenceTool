import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * REQUIREMENT: Role-based Access Control
 * Diese Komponente stellt sicher, dass nur Benutzer mit den erforderlichen Rollen auf Seiten zugreifen können
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  fallback
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Lädt...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredRoles.includes(user.role)) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Zugriff verweigert</h2>
        <p>Sie haben keine Berechtigung, diese Seite zu besuchen.</p>
      </div>
    );
  }

  return <>{children}</>;
};
