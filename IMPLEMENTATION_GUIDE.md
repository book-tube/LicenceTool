# Licence Supply Platform - Praktische Umsetzung

Diese Implementierung zeigt, wie die definierten Anforderungen praktisch umgesetzt werden.

## Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│  - ShoppingCart: Multi-Item Einkauf                             │
│  - UserDashboard: Benutzer sehen nur eigene Daten               │
│  - AdminDashboard: Admin-Features (nur für Admins)              │
│  - ProtectedRoute: Rolle-basierter Zugriff                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/HTTPS
                             │ JWT Token
┌────────────────────────────▼────────────────────────────────────┐
│                  Backend (Node.js/Express)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Middleware                                               │   │
│  │ - authenticate: JWT Verifizierung                        │   │
│  │ - authorize: Rolle-basierter Zugriff                     │   │
│  │ - checkResourceOwnership: Nur eigene Daten               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Services                                                 │   │
│  │ - LicenceService: Unique Keys allocieren & verwalten     │   │
│  │ - AuditService: Compliance Logging                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Routes                                                   │   │
│  │ - /api/user/:userId/orders - Bestellungen              │   │
│  │ - /api/admin/orders - Admin Verwaltung                  │   │
│  │ - /api/user/:userId/licences - Lizenzen Anzeige         │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ SQL
┌────────────────────────────▼────────────────────────────────────┐
│                  PostgreSQL Datenbank                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tabellen                                                 │   │
│  │ - users: Benutzer + Rollen                              │   │
│  │ - licence_keys: Eindeutige Lizenzen (UNIQUE + INDEX)    │   │
│  │ - products: Softwareprodukte                             │   │
│  │ - orders: Bestellungen                                   │   │
│  │ - order_items: Multi-Item Support                        │   │
│  │ - audit_logs: Compliance & Tracking                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Anforderungen und deren Umsetzung

### 1. Unique Licence Keys

**Anforderung:**
> Die Lizenzen sollten eindeutig (Unique) sein

**Umsetzung:**
```sql
-- database/schema.sql
CREATE TABLE licence_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_value VARCHAR(255) UNIQUE NOT NULL,  -- ← UNIQUE CONSTRAINT
  product_id UUID NOT NULL REFERENCES products(id),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_licence_keys_product_id ON licence_keys(product_id);
```

**Code-Beispiel (Backend):**
```typescript
// backend/src/services/licenceService.ts
async allocateLicencesForOrderItem(...) {
  // Finde verfügbare Keys (mit Locking zur Race-Condition-Vermeidung)
  const keysQuery = `
    SELECT id, key_value FROM licence_keys
    WHERE product_id = $1 AND status = 'available'
    LIMIT $2
    FOR UPDATE  -- ← Verhindert doppelte Zuordnung
  `;
  // Keys werden auf 'assigned' gesetzt
  // Nicht-eindeutige Keys können nicht eingefügt werden (UNIQUE constraint)
}
```

---

### 2. Multi-Item Purchase

**Anforderung:**
> Der Benutzer ist fähig mehr als 1 Artikel zu kaufen

**Umsetzung:**
```sql
-- database/schema.sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,  -- ← Mehrere Menge pro Produkt
  assigned_key_ids TEXT[],    -- ← Array von Schlüsseln
  ...
);
```

**Code-Beispiel (Frontend):**
```typescript
// frontend/src/components/ShoppingCart.tsx
const cart: CartItem[] = [
  { product_id: 'prod-1', quantity: 2 },  // 2x Produkt 1
  { product_id: 'prod-2', quantity: 1 },  // 1x Produkt 2
  { product_id: 'prod-3', quantity: 5 }   // 5x Produkt 3
];

const handleCheckout = async () => {
  const response = await axios.post(`/api/user/${user.id}/orders`, {
    items: cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity  // ← Mehrere Menge
    }))
  });
};
```

**Code-Beispiel (Backend):**
```typescript
// backend/src/routes/orders.ts
router.post('/user/:userId/orders', ..., async (req, res) => {
  const { items } = req.body;  // items = [{ product_id, quantity }, ...]

  for (const item of items) {
    // Für jedes Item in der Bestellung:
    const orderItemId = await createOrderItem(orderId, item);
    
    // Allociere quantity-viele eindeutige Keys
    await licenceService.allocateLicencesForOrderItem(
      orderId,
      orderItemId,
      item.product_id,
      item.quantity,  // ← Für jede Menge ein eindeutiger Key
      userId
    );
  }
});
```

---

### 3. Role-Based Access Control (RBAC)

**Anforderung:**
> Verschiedene Benutzertypen haben unterschiedliche Rechte (Admin kann Content verwalten, Private/Business User können nur shoppen)

**Umsetzung:**

#### Datenbank-Setup:
```sql
-- database/schema.sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES ('admin'), ('private'), ('business');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  ...
);
```

#### Backend-Middleware:
```typescript
// backend/src/middleware/auth.ts

// Nur Benutzer mit bestimmten Rollen erlauben
export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Zugriff verweigert' });
    }
    next();
  };
};

// Nur eigene Ressourcen zugreifen (außer Admin)
export const checkResourceOwnership = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'admin') {
      next();
      return;
    }
    if (req.user?.id !== req.params[paramName]) {
      return res.status(403).json({ error: '403 Forbidden' });
    }
    next();
  };
};
```

#### API-Routes mit RBAC:
```typescript
// backend/src/routes/orders.ts

// ✓ Nur Admin kann auf alle Bestellungen zugreifen
router.get(
  '/admin/orders',
  authenticate,
  authorize(['admin']),  // ← Nur Admin
  async (req, res) => { ... }
);

// ✓ Nur Admin kann Refunds verarbeiten
router.post(
  '/admin/orders/:orderId/refund',
  authenticate,
  authorize(['admin']),  // ← Nur Admin
  async (req, res) => { ... }
);

// ✓ Benutzer sehen nur ihre eigenen Bestellungen
router.get(
  '/user/:userId/orders',
  authenticate,
  checkResourceOwnership('userId'),  // ← Nur sich selbst
  async (req, res) => { ... }
);
```

#### Frontend-Komponenten:
```typescript
// frontend/src/components/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles
}) => {
  const { user } = useAuth();

  if (!requiredRoles.includes(user?.role)) {
    return <div>Zugriff verweigert</div>;
  }

  return <>{children}</>;
};

// Verwendung in der App:
<ProtectedRoute requiredRoles={['admin']}>
  <AdminDashboard />
</ProtectedRoute>

<ProtectedRoute requiredRoles={['private', 'business']}>
  <UserDashboard />
</ProtectedRoute>
```

---

## Umsetzungs-Flows

### Flow 1: Benutzer kauft mehrere Produkte

```
1. Frontend (ShoppingCart)
   - Benutzer wählt Produkt 1 (Quantity: 2)
   - Benutzer wählt Produkt 2 (Quantity: 1)
   - Benutzer wählt Produkt 3 (Quantity: 3)

2. Benutzer klickt "Bestellung abschließen"
   POST /api/user/{userId}/orders
   {
     "items": [
       { "product_id": "prod-1", "quantity": 2 },
       { "product_id": "prod-2", "quantity": 1 },
       { "product_id": "prod-3", "quantity": 3 }
     ]
   }

3. Backend (routes/orders.ts)
   - Authentifizierung verifizieren (JWT)
   - Ressourcen-Ownership prüfen (userId im URL = aktueller User)
   - Bestellung erstellen (1 Order-Record)
   - Für jedes Item eine order_item erstellen
   - Für jedes Item die erforderliche Anzahl an eindeutigen Keys allocieren

4. Backend (services/licenceService.ts)
   allocateLicencesForOrderItem(orderId, orderItemId, 'prod-1', 2)
   - SELECT 2 verfügbare Keys mit FOR UPDATE (Locking)
   - UPDATE Keys auf status='assigned'
   - UPDATE order_item mit assigned_key_ids
   - Log: KEY_ASSIGNED (Audit Trail)

   (Wiederholt für prod-2 und prod-3)

5. Database
   ORDER: { id: ord-123, user_id: user-456, status: 'pending' }
   ORDER_ITEMS: [
     { id: oi-1, product_id: prod-1, quantity: 2, assigned_key_ids: [key-1, key-2] },
     { id: oi-2, product_id: prod-2, quantity: 1, assigned_key_ids: [key-3] },
     { id: oi-3, product_id: prod-3, quantity: 3, assigned_key_ids: [key-4, key-5, key-6] }
   ]

6. Frontend
   - Benutzer sieht "Bestellung erfolgreich"
   - Navigation zu /user/{userId}/orders
```

### Flow 2: Admin verarbeitet Refund

```
1. Frontend (AdminDashboard)
   - Admin sieht alle Bestellungen (GET /api/admin/orders)
   - Admin klickt auf "Stornieren" für Bestellung ord-123

2. Frontend
   POST /api/admin/orders/{orderId}/refund
   Authorization: Bearer {JWT_admin_token}

3. Middleware
   - authenticate: JWT verifizieren
   - authorize(['admin']): Nur als Admin erlaubt!
   - Falls Rolle nicht 'admin': 403 Forbidden zurückgeben

4. Backend (routes/orders.ts)
   - licenceService.revokeLicencesForOrder(orderId)
     - Finde alle assigned_key_ids für dieses Order
     - UPDATE licence_keys SET status='revoked' WHERE id IN (...)
     - Log: ORDER_REFUNDED
   - UPDATE orders SET status='refunded'
   - Audit Log: {action: 'REFUNDED_ORDER', actor_id: admin-id, ...}

5. Database
   - licence_keys mit status='revoked' können nicht mehr verkauft werden
   - order mit status='refunded'
   - audit_logs enthält Hinweis wer wann refunded hat

6. Frontend
   - AdminDashboard aktualisiert Bestellung zeigt status='refunded'
```

### Flow 3: Benutzer sieht nur seine eigenen Daten

```
1. Frontend (UserDashboard)
   - Benutzer ist eingeloggt (user.id = user-456)
   - Benutzer klickt "Meine Bestellungen"

2. Frontend
   GET /api/user/{user-456}/orders
   Authorization: Bearer {JWT_user456_token}

3. Middleware
   - authenticate: JWT verifizieren → req.user.id = 'user-456'
   - checkResourceOwnership('userId'):
     - req.params.userId = 'user-456' (aus URL)
     - req.user.id = 'user-456' (aus Token)
     - Falls unterschiedlich: 403 Forbidden
     - Falls Admin: Weiterleiten (Admins sehen alle)

4. Backend (routes/orders.ts)
   SELECT ... FROM orders WHERE user_id = 'user-456'
   - Benutzer sieht nur seine eigenen Bestellungen
   - Nicht die von anderen Benutzern

5. Frontend
   - Zeige Bestellungen nur für user-456
   - Benutzer kann Details sehen inkl. zugewiesene Keys
```

---

## Security & Compliance

### RBAC Matrix

| Operation | Anonymous | Private User | Business User | Admin |
|-----------|-----------|--------------|---------------|-------|
| Bestellung erstellen | ✗ | ✓ (eigene) | ✓ (eigene) | ✓ (alle) |
| Eigene Bestellung sehen | ✗ | ✓ | ✓ | ✓ |
| Andere Bestellung sehen | ✗ | ✗ | ✗ | ✓ |
| Refund/Storno | ✗ | ✗ | ✗ | ✓ |
| Lizenzschlüssel verwalten | ✗ | ✗ | ✗ | ✓ |
| Content/Katalog verwalten | ✗ | ✗ | ✗ | ✓ |

### Audit Logging

Alle wichtigen Operationen werden geloggt:

```typescript
// backend/src/services/auditService.ts
await auditService.logKeyAssignment(actorId, orderId, keyIds);
await auditService.logOrderCreated(actorId, orderId, amount);
await auditService.logOrderRefunded(actorId, orderId, keyIds);
await auditService.logAdminAction(actorId, action, resourceType, resourceId);
```

Beispiel Audit Log:
```json
{
  "id": "audit-123",
  "actor_id": "admin-1",
  "action": "ORDER_REFUNDED",
  "resource_type": "order",
  "resource_id": "ord-456",
  "details": { "revoked_keys": 3 },
  "created_at": "2024-06-14T10:30:00Z"
}
```

---

## Data Model, Documentation, and QA (Point 4)

### Goal
Verify that the implemented data model and documentation fully support:
- Unique licence assignment and lifecycle state tracking
- Multi-item order creation with quantity support
- Role-based access control for admin/private/business users
- Audit logging for assignment, creation, and refunds

### Focus areas
- `docs/schema.sql`
- `requirements.md`
- `IMPLEMENTATION_GUIDE.md`
- `backend/src/services/licenceService.ts`
- `backend/src/services/auditService.ts`
- `backend/src/middleware/auth.ts`

### Review checklist
1. Schema validation
   - `licence_keys.key_value` has a UNIQUE constraint
   - `order_items` supports `quantity` and `assigned_key_ids`
   - `audit_logs` stores `action`, `resource_type`, `resource_id`, and `details`
   - `roles` table and `users.role_id` support RBAC
2. Documentation alignment
   - Requirements map clearly to implementation artifacts
   - Point-4 responsibilities are documented for the team
   - Acceptance criteria are easy to test and verify
3. QA validation
   - Multi-item checkout with multiple products and quantities
   - Unique key allocation and status updates
   - User can only access their own data
   - Admin-only endpoints are protected
   - Audit log entries are created for key assignment and refunds

### Result
This section closes the loop between requirements, implementation, and verification for the architecture.

---

## Setup & Ausführung

### 1. Datenbank erstellen
```bash
createdb licence_tool
psql licence_tool < docs/schema.sql
```

### 2. Backend starten
```bash
cd backend
npm install
npm run dev
```

### 3. Frontend starten
```bash
cd frontend
npm install
npm start
```

Server läuft auf:
- Backend: http://localhost:3000
- Frontend: http://localhost:3000 (über Create React App)

---

## Zusammenfassung

Diese praktische Umsetzung zeigt:

✓ **Unique Licence Keys**: UNIQUE Constraint auf `licence_keys.key_value`, mit FOR UPDATE Locking bei Zuordnung
✓ **Multi-Item Purchase**: Separate `order_items` Tabelle mit `quantity` und `assigned_key_ids` Array
✓ **Role-Based Access Control**: 
  - Middleware-Layer mit `authorize()` und `checkResourceOwnership()`
  - Rollen: admin, private, business
  - Datenbank: roles und user-role Zuordnung
  - API: Alle Endpoints mit Role-Checks
  - Frontend: ProtectedRoute Komponenten
✓ **Audit Trail**: AuditService für Compliance und Tracking

Die Implementierung ist produktionsreif und skaliert von MVP bis zu großen Volumes.
