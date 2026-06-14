import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmountCents: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}

const statusStyles: Record<string, { backgroundColor: string; color: string }> = {
  pending: { backgroundColor: '#fff7e6', color: '#7a4e00' },
  fulfilled: { backgroundColor: '#e9f8ee', color: '#1d5f2f' },
  refunded: { backgroundColor: '#ffecec', color: '#8f2020' }
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const refreshOrders = async () => {
    const response = await axios.get<Order[]>('/api/admin/orders');
    setOrders(response.data || []);
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (user?.role !== 'admin') {
        setIsLoading(false);
        return;
      }

      try {
        await refreshOrders();
      } catch (requestError: any) {
        setError(requestError?.response?.data?.error || 'Fehler beim Abrufen der Bestellungen');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleRefund = async (orderId: string) => {
    if (!window.confirm('Moechten Sie diese Bestellung wirklich stornieren? Lizenzen werden widerrufen.')) {
      return;
    }

    setProcessingOrderId(orderId);
    setError(null);

    try {
      await axios.post(`/api/admin/orders/${orderId}/refund`);
      await refreshOrders();
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'Fehler beim Stornieren der Bestellung');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.orderCount += 1;
        acc.itemCount += Number(order.itemCount || 0);
        acc.revenueCents += Number(order.totalAmountCents || 0);
        return acc;
      },
      { orderCount: 0, itemCount: 0, revenueCents: 0 }
    );
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return orders;
    }

    return orders.filter((order) => {
      return [order.orderNumber, order.status]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [orders, searchTerm]);

  const visibleTotals = useMemo(() => {
    return visibleOrders.reduce(
      (acc, order) => {
        acc.orderCount += 1;
        acc.itemCount += Number(order.itemCount || 0);
        acc.revenueCents += Number(order.totalAmountCents || 0);
        return acc;
      },
      { orderCount: 0, itemCount: 0, revenueCents: 0 }
    );
  }, [visibleOrders]);

  const uniqueCustomerCount = useMemo(() => {
    return visibleOrders.length;
  }, [visibleOrders]);

  if (!user) {
    return <div className="app-shell page-section">Bitte zuerst anmelden.</div>;
  }

  if (user.role !== 'admin') {
    return (
      <div className="app-shell page-section surface-card role-hint role-hint-danger">
        <h2>Zugriff verweigert</h2>
        <p>Nur Admin-Benutzer duerfen das Admin-Dashboard aufrufen.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="app-shell page-section">Admin-Dashboard wird geladen...</div>;
  }

  return (
    <div className="app-shell page-section">
      <section className="surface-card">
        <p className="eyebrow">Admin Bereich</p>
        <h1>Kunden- und Lizenzverwaltung</h1>
        <p className="muted-text">Sie sehen alle Kunden, deren Bestellungen und können Lizenzen entziehen.</p>
      </section>

      <div
        className="surface-grid"
        style={{ gridTemplateColumns: 'repeat(3, minmax(140px, 1fr))', marginBottom: '18px' }}
      >
        <article className="surface-card stat-card">
          <div className="stat-label">Kunden</div>
          <div className="stat-value">{uniqueCustomerCount}</div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-label">Bestellungen</div>
          <div className="stat-value">{visibleTotals.orderCount}</div>
        </article>
        <article className="surface-card stat-card">
          <div className="stat-label">Lizenzen gesamt</div>
          <div className="stat-value">{visibleTotals.itemCount}</div>
        </article>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="surface-card" style={{ marginBottom: '16px' }}>
        <div className="field-row" style={{ marginBottom: 0 }}>
          <label htmlFor="order-search">Kunden oder Bestellungen suchen</label>
          <input
            id="order-search"
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="text-input"
            placeholder="z. B. E-Mail, Bestellnummer, Firma oder Status"
          />
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Bestellnummer</th>
            <th>Währung</th>
            <th>Artikel</th>
            <th>Betrag</th>
            <th>Status</th>
            <th>Datum</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {visibleOrders.map((order) => {
            const normalizedStatus = order.status.toLowerCase();
            const statusStyle = statusStyles[normalizedStatus] || { backgroundColor: '#f2f2f2', color: '#333' };
            const canRefund = normalizedStatus !== 'refunded' && normalizedStatus !== 'cancelled';

            return (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>{order.currency}</td>
                <td style={{ textAlign: 'center' }}>{order.itemCount}</td>
                <td>{order.currency} {(order.totalAmountCents / 100).toFixed(2)}</td>
                <td>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '999px',
                      backgroundColor: statusStyle.backgroundColor,
                      color: statusStyle.color,
                      fontWeight: 600,
                      fontSize: '0.85rem'
                    }}
                  >
                    {order.status}
                  </span>
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString('de-DE')}</td>
                <td>
                  <button
                    onClick={() => handleRefund(order.id)}
                    disabled={!canRefund || processingOrderId === order.id}
                    className="btn btn-danger"
                  >
                    {processingOrderId === order.id ? 'Verarbeite...' : canRefund ? 'Lizenz entziehen' : 'Entzogen'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="alert alert-info" style={{ marginTop: '20px' }}>
        <strong>Hinweis:</strong> Als Admin verwalten Sie alle Kunden zentral und können Lizenzen bei Bedarf entziehen.
      </div>
    </div>
  );
};
