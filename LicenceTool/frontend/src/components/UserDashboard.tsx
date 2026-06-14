import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface OrderItem {
  itemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents?: number;
  licenceKeys: string[];
  status: string;
}

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmountCents: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}

interface OrderDetails extends OrderSummary {
  items?: OrderItem[];
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'fulfilled':
      return 'Erfuellt';
    case 'pending':
      return 'In Bearbeitung';
    case 'refunded':
      return 'Erstattet';
    default:
      return status;
  }
};

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isShoppingRole = user?.role === 'user';

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user || !isShoppingRole) {
        setIsLoadingOrders(false);
        return;
      }

      try {
        const response = await axios.get<OrderSummary[]>(`/api/orders`);
        setOrders(response.data || []);
      } catch (requestError: any) {
        setError(requestError?.response?.data?.error || 'Fehler beim Abrufen der Bestellungen');
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [isShoppingRole, user]);

  const handleSelectOrder = async (orderId: string) => {
    if (!user) return;

    setIsLoadingDetails(true);
    setError(null);

    try {
      const response = await axios.get<OrderDetails>(`/api/orders/${orderId}`);
      setSelectedOrder(response.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'Fehler beim Abrufen der Bestellungsdetails');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const totalLicenceCount = useMemo(() => {
    if (!selectedOrder?.items?.length) return 0;
    return selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedOrder]);

  if (!user) {
    return <div className="app-shell page-section">Bitte zuerst anmelden.</div>;
  }

  if (!isShoppingRole) {
    return (
      <div className="app-shell page-section surface-card role-hint role-hint-warning">
        <h2>Benutzer-Dashboard nur fuer Benutzer</h2>
        <p>Der Admin verwaltet Kundendaten und Lizenzen im Admin Dashboard.</p>
      </div>
    );
  }

  if (isLoadingOrders) {
    return <div className="app-shell page-section">Bestellungen werden geladen...</div>;
  }

  return (
    <div className="app-shell page-section">
      <section className="surface-card">
        <p className="eyebrow">Mein Bereich</p>
        <h1>Meine Bestellungen und Lizenzschluessel</h1>
        <p className="muted-text">
          Sie sehen hier ausschliesslich Ihre eigenen Bestellungen inklusive zugewiesener Lizenzschluessel.
        </p>
      </section>

      {error && <div className="alert alert-danger">{error}</div>}

      <section className="surface-card" style={{ marginBottom: '24px' }}>
        <h2>Meine Bestellungen ({orders.length})</h2>

        {orders.length === 0 ? (
          <div className="surface-card" style={{ boxShadow: 'none' }}>
            <p>Sie haben noch keine Bestellungen.</p>
            <Link to="/shopping" className="btn btn-primary">
              Jetzt Lizenzen kaufen
            </Link>
          </div>
        ) : (
          <div>
            {orders.map((order) => (
              <article
                key={order.id}
                onClick={() => handleSelectOrder(order.id)}
                className={`order-card ${selectedOrder?.id === order.id ? 'order-card-active' : ''}`}
              >
                <div className="order-card-head">
                  <div>
                    <strong>{order.orderNumber}</strong>
                    <div className="muted-text">
                      {new Date(order.createdAt).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <div className="order-card-price">
                    <div>{order.currency} {(order.totalAmountCents / 100).toFixed(2)}</div>
                    <div className="muted-text">{statusLabel(order.status)}</div>
                  </div>
                </div>
                <div className="muted-text" style={{ marginTop: '8px' }}>
                  Positionen: {order.itemCount}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isLoadingDetails && <div>Bestellungsdetails werden geladen...</div>}

      {selectedOrder && !isLoadingDetails && (
        <section className="surface-card">
          <h2>Bestellungsdetails: {selectedOrder.orderNumber}</h2>

          <div className="muted-text" style={{ marginBottom: '12px' }}>
            <strong>Status:</strong> {statusLabel(selectedOrder.status)} | <strong>Gesamt:</strong> {selectedOrder.currency}{' '}
            {(selectedOrder.totalAmountCents / 100).toFixed(2)} | <strong>Lizenzen:</strong> {totalLicenceCount}
          </div>

          <table className="data-table" style={{ marginBottom: '16px' }}>
            <thead>
              <tr>
                <th>Produkt</th>
                <th style={{ textAlign: 'center' }}>Menge</th>
                <th style={{ textAlign: 'right' }}>Einzelpreis</th>
                <th>Lizenzschluessel</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items?.map((item) => (
                <tr key={item.itemId}>
                  <td>{item.productName}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>
                    {item.unitPriceCents ? `EUR ${(item.unitPriceCents / 100).toFixed(2)}` : '-'}
                  </td>
                  <td>
                    {item.licenceKeys && item.licenceKeys.filter(Boolean).length > 0 ? (
                      item.licenceKeys
                        .filter(Boolean)
                        .map((keyValue) => (
                          <div key={keyValue} className="licence-key-chip">
                            {keyValue}
                          </div>
                        ))
                    ) : (
                      <span className="muted-text">Noch nicht zugewiesen</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="alert alert-info">
            Sie sehen hier nur Daten Ihres eigenen Kontos. Bei Rueckfragen koennen Sie mit der Bestellnummer den
            Support kontaktieren.
          </div>
        </section>
      )}
    </div>
  );
};
