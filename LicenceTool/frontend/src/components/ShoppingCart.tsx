import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: string;
  name: string;
  priceCents: number;
  licenceType: string;
  durationMonths: number | null;
  platform: string | null;
  language: string | null;
  inStock: boolean;
}

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
}

interface OrderResult {
  id: string;
  orderNumber: string;
  totalAmountCents: number;
  currency: string;
  status: string;
}

export const ShoppingCart: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [billingEmail, setBillingEmail] = useState<string>(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isShoppingRole = user?.role === 'user';

  useEffect(() => {
    if (!isShoppingRole) return;
    const fetchProducts = async () => {
      try {
        const response = await axios.get<Product[]>('/api/products');
        setProducts(response.data || []);
        const initialQty: Record<string, number> = {};
        (response.data || []).forEach((p) => { initialQty[p.id] = 1; });
        setQuantities(initialQty);
      } catch {
        setError('Produkte konnten nicht geladen werden.');
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [isShoppingRole]);

  const totalCents = useMemo(
    () => cart.reduce((total, item) => total + item.unit_price_cents * item.quantity, 0),
    [cart]
  );

  const addToCart = (productId: string) => {
    const product = availableProducts.find((entry) => entry.id === productId);
    if (!product || !product.in_stock) {
      return;
    }

    const quantityToAdd = Math.max(1, quantities[productId] || 1);
    setCart((current) => {
      const existingItem = current.find((item) => item.product_id === productId);
      if (existingItem) {
        return current.map((item) =>
          item.product_id === productId
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        );
      }

      return [
        ...current,
        {
          product_id: productId,
          product_name: product.name,
          quantity: quantityToAdd,
          unit_price_cents: product.price_cents
        }
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((current) => current.filter((item) => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (!Number.isFinite(quantity)) return;

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.max(1, Math.floor(quantity)) }
          : item
      )
    );
  };

  const handleCheckout = async () => {
    if (!user || !isShoppingRole) {
      setError('Nur Benutzer koennen Bestellungen fuer den eigenen Account ausfuehren.');
      return;
    }

    if (!billingEmail.trim()) {
      setError('Bitte geben Sie eine Rechnungs-E-Mail an.');
      return;
    }

    if (cart.length === 0) {
      setError('Der Warenkorb ist leer.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        billing_email: billingEmail.trim()
      };

      const response = await axios.post<OrderResult>(`/api/user/${user.id}/orders`, payload);

      setOrderResult(response.data);
      setCart([]);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'Fehler beim Erstellen der Bestellung');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div className="app-shell page-section">Bitte zuerst anmelden, um einzukaufen.</div>;
  }

  if (!isShoppingRole) {
    return (
      <div className="app-shell page-section surface-card role-hint role-hint-warning">
        <h2>Shopping nur fuer Benutzer</h2>
        <p>Der Admin verwaltet Kunden und Lizenzen im Admin Dashboard und kauft nicht selbst ein.</p>
      </div>
    );
  }

  return (
    <div className="app-shell page-section">
      <section className="surface-card">
        <h1>Shopping - Softwarelizenzen kaufen</h1>
        <p className="muted-text">
          Kaufen Sie mehrere Produkte in einer Bestellung. Jede Einheit wird fuer Ihren eigenen Account abgerechnet
          und bekommt einen eindeutigen Lizenzschluessel.
        </p>
      </section>

      {error && (
        <div className="alert alert-danger">{error}</div>
      )}

      <div className="surface-grid surface-grid-cart">
        <section className="surface-card">
          <h2>Produktkatalog</h2>
          {availableProducts.map((product) => (
            <article key={product.id} className="catalog-item">
              <h3>{product.name}</h3>
              <div className="item-price">EUR {(product.price_cents / 100).toFixed(2)}</div>
              <div className="muted-text meta-row">
                Typ: {product.licence_type} | Laufzeit: {product.duration} | Plattform: {product.platform}
              </div>

              <div className="inline-actions">
                <input
                  type="number"
                  min="1"
                  value={quantities[product.id] || 1}
                  onChange={(event) =>
                    setQuantities((current) => ({
                      ...current,
                      [product.id]: Math.max(1, Number(event.target.value) || 1)
                    }))
                  }
                  className="text-input qty-input"
                />
                <button
                  onClick={() => addToCart(product.id)}
                  disabled={!product.in_stock}
                  className="btn btn-primary"
                >
                  {product.in_stock ? 'In den Warenkorb' : 'Nicht verfuegbar'}
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="surface-card">
          <h2>Warenkorb & Checkout</h2>
          {cart.length === 0 ? (
            <p className="muted-text">Ihr Warenkorb ist leer.</p>
          ) : (
            <div>
              {cart.map((item) => (
                <div key={item.product_id} className="cart-row">
                  <div className="cart-title">{item.product_name}</div>
                  <div className="inline-actions">
                    <button className="btn btn-ghost" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.product_id, Number(event.target.value))}
                      className="text-input qty-input"
                    />
                    <button className="btn btn-ghost" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>
                      +
                    </button>
                    <span className="cart-sum">
                      EUR {((item.unit_price_cents * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                  <button className="btn btn-link-danger" onClick={() => removeFromCart(item.product_id)}>
                    Entfernen
                  </button>
                </div>
              ))}

              <div className="checkout-panel">
                <div className="field-row">
                  <label htmlFor="billing_email">
                    Rechnungs-E-Mail
                  </label>
                  <input
                    id="billing_email"
                    type="email"
                    value={billingEmail}
                    onChange={(event) => setBillingEmail(event.target.value)}
                    className="text-input"
                  />
                </div>

                <div className="checkout-total">
                  Gesamt: EUR {(totalCents / 100).toFixed(2)}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-full"
                >
                  {isSubmitting ? 'Bestellung wird erstellt...' : 'Bestellung abschliessen'}
                </button>
              </div>
            </div>
          )}

          {orderResult && (
            <div className="alert alert-success" style={{ marginTop: '15px' }}>
              <h3>Bestellung erfolgreich erstellt</h3>
              <p>
                <strong>Bestellnummer:</strong> {orderResult.order_number}
              </p>
              <p>
                <strong>Positionen:</strong> {orderResult.item_count}
              </p>
              <p>
                <strong>Betrag:</strong> EUR {(orderResult.total_amount_cents / 100).toFixed(2)}
              </p>
              <p className="muted-text">
                Die zugewiesenen Lizenzschluessel sehen Sie im Benutzer-Dashboard.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
