import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_cents: number;
}

/**
 * REQUIREMENT: Multi-Item Shopping
 * Benutzer können mehrere verschiedene Produkte und/oder mehrere Menge desselben Produkts kaufen
 */
export const ShoppingCart: React.FC = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  // Beispiel: Diese würden normalerweise aus einer Produktliste oder von der API kommen
  const availableProducts = [
    { id: 'prod-1', name: 'Office Pro - Jahreslizenzen', price_cents: 9999 },
    { id: 'prod-2', name: 'Adobe Creative Suite - 1 Monat', price_cents: 5499 },
    { id: 'prod-3', name: 'Antivirus Suite - 1 Jahr', price_cents: 1999 }
  ];

  const addToCart = (productId: string, quantity: number) => {
    const product = availableProducts.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = cart.find((item) => item.product_id === productId);

    let updatedCart;
    if (existingItem) {
      updatedCart = cart.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      updatedCart = [
        ...cart,
        {
          product_id: productId,
          product_name: product.name,
          quantity,
          unit_price_cents: product.price_cents
        }
      ];
    }

    setCart(updatedCart);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(
        cart.map((item) =>
          item.product_id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const getTotalCents = () => {
    return cart.reduce((total, item) => total + item.unit_price_cents * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;

    setIsSubmitting(true);

    try {
      const response = await axios.post(`/api/user/${user.id}/orders`, {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        billing_email: user.email,
        company_name: user.role === 'business' ? 'Mein Unternehmen' : undefined,
        vat_id: user.role === 'business' ? 'DE123456789' : undefined
      });

      // Fetch created order details (includes allocated licence keys)
      const created = response.data;
      try {
        const details = await axios.get(`/api/user/${user.id}/orders/${created.order_id}`);
        setOrderResult(details.data);
      } catch (err) {
        // fallback to basic response if details endpoint fails
        setOrderResult(created);
      }

      setCart([]); // Clear cart after successful order
    } catch (error) {
      console.error('Checkout error', error);
      alert('Fehler beim Erstellen der Bestellung: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCents = getTotalCents();

  return (
    <div style={{ padding: '20px' }}>
      <h1>Shopping - Softwarelizenzen kaufen</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Produktliste */}
        <div>
          <h2>Verfügbare Produkte</h2>
          {availableProducts.map((product) => (
            <div
              key={product.id}
              style={{
                border: '1px solid #ddd',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '4px'
              }}
            >
              <h3>{product.name}</h3>
              <div style={{ marginBottom: '10px' }}>
                <strong>€{(product.price_cents / 100).toFixed(2)}</strong>
              </div>
              <input
                type="number"
                min="1"
                defaultValue="1"
                id={`qty-${product.id}`}
                style={{ width: '60px', padding: '5px', marginRight: '10px' }}
              />
              <button
                onClick={() => {
                  const qty = parseInt((document.getElementById(`qty-${product.id}`) as HTMLInputElement).value);
                  addToCart(product.id, qty);
                }}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderRadius: '4px'
                }}
              >
                In den Warenkorb
              </button>
            </div>
          ))}
        </div>

        {/* Warenkorbzusammenfassung */}
        <div>
          <h2>Warenkorb</h2>
          {cart.length === 0 ? (
            <p style={{ color: '#999' }}>Ihr Warenkorb ist leer</p>
          ) : (
            <div>
              {/* REQUIREMENT: Multi-Item Display */}
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  style={{
                    border: '1px solid #e0e0e0',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>
                    <strong>{item.product_name}</strong>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      €{(item.unit_price_cents / 100).toFixed(2)} pro Stück
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      style={{
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ddd',
                        width: '30px',
                        height: '30px',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value))}
                      style={{ width: '50px', textAlign: 'center', padding: '5px' }}
                    />
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      style={{
                        backgroundColor: '#f0f0f0',
                        border: '1px solid #ddd',
                        width: '30px',
                        height: '30px',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                    >
                      +
                    </button>
                    <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>
                      €{((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    style={{
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      fontSize: '0.9em'
                    }}
                  >
                    Entfernen
                  </button>
                </div>
              ))}

              <div
                style={{
                  borderTop: '2px solid #ddd',
                  paddingTop: '15px',
                  marginTop: '15px',
                  backgroundColor: '#f0f0f0',
                  padding: '15px',
                  borderRadius: '4px'
                }}
              >
                <div style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '15px' }}>
                  Gesamt: €{(totalCents / 100).toFixed(2)}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    fontSize: '1.1em',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    width: '100%',
                    opacity: isSubmitting ? '0.5' : '1'
                  }}
                >
                  {isSubmitting ? 'Wird bestellt...' : 'Bestellung abschließen'}
                </button>
              </div>
            </div>
          )}

          {orderResult && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#eef9f1', borderRadius: '6px' }}>
              <h3>Order confirmation</h3>
              <div><strong>Order:</strong> {orderResult.order_number || orderResult.order_id}</div>
              <div><strong>Status:</strong> {orderResult.status || 'pending'}</div>

              {orderResult.items ? (
                <div style={{ marginTop: '10px' }}>
                  <h4>Assigned licence keys</h4>
                  {orderResult.items.map((item: any) => (
                    <div key={item.item_id} style={{ marginBottom: '10px' }}>
                      <div style={{ fontWeight: 'bold' }}>{item.product_name} × {item.quantity}</div>
                      {item.licence_keys && item.licence_keys.length > 0 ? (
                        item.licence_keys.map((k: string, i: number) => (
                          <div key={i} style={{ fontFamily: 'monospace', backgroundColor: '#fff', padding: '6px', marginTop: '6px', borderRadius: '4px' }}>{k}</div>
                        ))
                      ) : (
                        <div style={{ color: '#666' }}>Keys not yet assigned</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {orderResult && (
            <div
              style={{
                marginTop: '15px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                padding: '15px',
                borderRadius: '4px'
              }}
            >
              <h3>✓ Bestellung erfolgreich!</h3>
              <p><strong>Bestellnummer:</strong> {orderResult.order_number}</p>
              <p><strong>Artikel:</strong> {orderResult.item_count}</p>
              <p><strong>Betrag:</strong> €{(orderResult.total_amount_cents / 100).toFixed(2)}</p>
              <p style={{ fontSize: '0.9em', color: '#666' }}>
                Ihre Lizenzen werden in Kürze per E-Mail zugesendet.
              </p>
            </div>
          )}

          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '4px', fontSize: '0.9em' }}>
            <strong>Hinweis:</strong> Sie können mehrere verschiedene Produkte und Mengen in einer Bestellung kaufen. Jede Lizenz wird eindeutig zugewiesen.
          </div>
        </div>
      </div>
    </div>
  );
};
