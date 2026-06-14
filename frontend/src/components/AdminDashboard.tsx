import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount_cents: number;
  email: string;
  company_name?: string;
  item_count: number;
  created_at: string;
}

/**
 * REQUIREMENT: Admin Dashboard
 * Nur Admins können auf diese Seite zugreifen und alle Bestellungen verwalten
 */
export const AdminDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('/api/admin/orders');
        setOrders(response.data);
      } catch (err) {
        setError('Fehler beim Abrufen der Bestellungen');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleRefund = async (orderId: string) => {
    if (!window.confirm('Möchten Sie diese Bestellung wirklich stornieren?')) {
      return;
    }

    try {
      await axios.post(`/api/admin/orders/${orderId}/refund`);
      // Refresh orders
      const response = await axios.get('/api/admin/orders');
      setOrders(response.data);
      alert('Bestellung erfolgreich storniert und Lizenzen widerrufen');
    } catch (err) {
      alert('Fehler beim Stornieren der Bestellung');
    }
  };

  if (isLoading) return <div>Lädt...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard - Bestellungsverwaltung</h1>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Bestellnummer</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Kunde</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Artikel</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Betrag</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Status</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{order.order_number}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                {order.email}
                {order.company_name && <div style={{ fontSize: '0.9em', color: '#666' }}>{order.company_name}</div>}
              </td>
              <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{order.item_count}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>€{(order.total_amount_cents / 100).toFixed(2)}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{order.status}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleRefund(order.id)}
                    style={{
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      borderRadius: '4px'
                    }}
                  >
                    Stornieren
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
        <strong>Hinweis:</strong> Admins können alle Bestellungen verwalten, Stornierungen verarbeiten und damit verknüpfte Lizenzen widerrufen.
      </div>
    </div>
  );
};
