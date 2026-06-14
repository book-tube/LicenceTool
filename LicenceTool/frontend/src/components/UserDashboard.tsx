import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface OrderItem {
  item_id: string;
  product_name: string;
  quantity: number;
  licence_keys: string[];
  status: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount_cents: number;
  currency: string;
  item_count: number;
  created_at: string;
  items?: OrderItem[];
}

/**
 * REQUIREMENT: User Dashboard
 * Benutzer können nur ihre eigenen Bestellungen und zugewiesenen Lizenzen sehen
 * REQUIREMENT: Multi-Item Orders
 * Zeigt mehrere Artikel pro Bestellung
 */
export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const response = await axios.get(`/api/user/${user.id}/orders`);
        setOrders(response.data);
      } catch (err) {
        setError('Fehler beim Abrufen der Bestellungen');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleSelectOrder = async (order: Order) => {
    try {
      const response = await axios.get(`/api/user/${user?.id}/orders/${order.id}`);
      setSelectedOrder(response.data);
    } catch (err) {
      alert('Fehler beim Abrufen der Bestellungsdetails');
    }
  };

  if (!user) return <div>Keine Authentifizierung</div>;
  if (isLoading) return <div>Lädt...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Mein Konto - Bestellungen &amp; Lizenzen</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>Meine Bestellungen ({orders.length})</h2>
        {orders.length === 0 ? (
          <p>Sie haben noch keine Bestellungen.</p>
        ) : (
          <div>
            {orders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSelectOrder(order)}
                style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  backgroundColor: selectedOrder?.id === order.id ? '#f0f0f0' : 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{order.order_number}</strong>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      {new Date(order.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>
                      €{(order.total_amount_cents / 100).toFixed(2)}
                    </div>
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: order.status === 'fulfilled' ? '#d4edda' : '#fff3cd',
                      fontSize: '0.9em'
                    }}>
                      {order.status === 'fulfilled' ? 'Erfüllt' : order.status}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                  {order.item_count} Artikel
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
          <h2>Bestellungsdetails: {selectedOrder.order_number}</h2>

          <h3>Gekaufte Artikel (Multi-Item Order):</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Produkt</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Menge</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Lizenzschlüssel</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items?.map((item) => (
                <tr key={item.item_id}>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.product_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                    {item.licence_keys?.length > 0 ? (
                      <div>
                        {item.licence_keys.map((key, idx) => (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#e8f5e9',
                              padding: '8px',
                              marginBottom: '5px',
                              fontFamily: 'monospace',
                              fontSize: '0.9em',
                              borderRadius: '4px',
                              wordBreak: 'break-all'
                            }}
                          >
                            {key}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#999' }}>Noch nicht zugewiesen</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px' }}>
            <strong>Informationen:</strong> Sie sehen hier nur Ihre eigenen Bestellungen und Lizenzen. Jede gekaufte Lizenz ist eindeutig und nicht übertragbar.
          </div>
        </div>
      )}
    </div>
  );
};
