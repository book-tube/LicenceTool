import React, { FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ShoppingCart } from './components/ShoppingCart';
import { UserDashboard } from './components/UserDashboard';
import { useAuth } from './context/AuthContext';

const MainNav: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="app-shell app-header-inner">
        <Link to="/" className="brand-link">
          Licence Supply Platform
        </Link>

        <nav className="main-nav">
          <Link to="/" className="nav-link">
            Start
          </Link>

          {user?.role === 'admin' && (
            <Link to="/admin" className="nav-link">
              Admin
            </Link>
          )}

          {user?.role === 'user' && (
            <>
              <Link to="/shopping" className="nav-link">
                Shop
              </Link>
              <Link to="/me" className="nav-link">
                Mein Bereich
              </Link>
            </>
          )}

          {!user ? (
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
          ) : (
            <button type="button" onClick={logout} className="btn btn-ghost">
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const quickLogin = async (role: 'admin' | 'user') => {
    setLoading(true);
    setError(null);

    try {
      const email = role === 'admin' ? 'admin@licence.local' : 'user@licence.local';
      await login(email, 'demo');
      navigate('/');
    } catch {
      setError('Login fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await quickLogin('user');
  };

  return (
    <div className="app-shell page-section">
      <div className="surface-card auth-card">
        <p className="eyebrow">Demo-Anmeldung</p>
        <h1>Wählen Sie Ihre Rolle</h1>
        <p className="muted-text">
          Zwei klare Zugänge für die Demo: Admin verwaltet alle Kunden und Lizenzen, User kauft nur für sich selbst.
        </p>
        {error && <div className="alert alert-danger">{error}</div>}
        <div className="surface-grid" style={{ marginBottom: '14px' }}>
          <button type="button" onClick={() => quickLogin('admin')} disabled={loading} className="btn btn-primary btn-full">
            Als Admin anmelden
          </button>
          <button type="button" onClick={() => quickLogin('user')} disabled={loading} className="btn btn-ghost btn-full">
            Als User anmelden
          </button>
        </div>
        <form onSubmit={submit}>
          <button type="submit" disabled={loading} className="btn btn-link-danger">
            Standard: User-Demo starten
          </button>
        </form>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const roleLabel = useMemo(() => {
    if (!user?.role) return 'Gast';
    if (user.role === 'admin') return 'Administrator';
    return 'Benutzer';
  }, [user?.role]);

  return (
    <div className="app-shell page-section">
      <section className="hero-block">
        <p className="eyebrow">Software-Lizenzplattform</p>
        <h1>Licence Supply Platform</h1>
        {user ? (
          <p>
            Angemeldet als <strong>{user.email}</strong> ({roleLabel})
          </p>
        ) : (
          <p>Melden Sie sich an, um Shopping, Dashboard oder Admin-Bereich zu nutzen.</p>
        )}

        {!user && (
          <Link to="/login" className="btn btn-primary">
            Jetzt anmelden
          </Link>
        )}
      </section>

      {user?.role === 'admin' && (
        <section className="surface-card">
          <h2>Admin-Zentrale</h2>
          <p>
            Als Admin sehen Sie alle Kunden, deren Bestellungen und können Lizenzen verwalten.
          </p>
          <Link to="/admin" className="btn btn-primary">
            Zum Admin Dashboard
          </Link>
        </section>
      )}

      {user?.role === 'user' && (
        <section className="surface-grid">
          <article className="surface-card">
            <h2>Einkaufen</h2>
            <p>Produkte in den Warenkorb legen und nur für den eigenen Account kaufen.</p>
            <Link to="/shopping" className="btn btn-primary">
              Shop oeffnen
            </Link>
          </article>
          <article className="surface-card">
            <h2>Mein Bereich</h2>
            <p>Bestellungen, Details und Lizenzschluessel einsehen.</p>
            <Link to="/me" className="btn btn-primary">
              Dashboard anzeigen
            </Link>
          </article>
        </section>
      )}
    </div>
  );
};

export const MainApp: React.FC = () => {
  return (
    <>
      <MainNav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route
          path="/shopping"
          element={
            <ProtectedRoute requiredRoles={['user']}>
              <ShoppingCart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/me"
          element={
            <ProtectedRoute requiredRoles={['user']}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};
