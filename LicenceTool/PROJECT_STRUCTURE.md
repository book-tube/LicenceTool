# Projektstruktur - Licence Supply Platform

```
LicenceTool/
├── requirements.md                    # ← Alle Anforderungen dokumentiert
├── IMPLEMENTATION_GUIDE.md            # ← Praktische Umsetzung erklärt
├── DRAFT_PR.md                        # ← Pull Request Vorlage
│
├── docs/
│   └── schema.sql                     # Datenbank-Schema mit UNIQUE Keys,
│                                      # order_items für Multi-Item, Audit Logs
│
├── backend/                           # Node.js/Express API
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts                  # Main Express Server
│   │   ├── middleware/
│   │   │   └── auth.ts                # Authentication & Authorization
│   │   │                              # - authenticate(): JWT Verifizierung
│   │   │                              # - authorize(): Rollen-basierter Zugriff
│   │   │                              # - checkResourceOwnership(): Nur eigene Daten
│   │   │
│   │   ├── services/
│   │   │   ├── licenceService.ts      # Licence Management
│   │   │   │                          # - allocateLicencesForOrderItem()
│   │   │   │                          # - revokeLicencesForOrder()
│   │   │   │                          # - getUserLicences()
│   │   │   │                          # - validateUniqueKey()
│   │   │   │
│   │   │   └── auditService.ts        # Audit & Compliance Logging
│   │   │                              # - logKeyAssignment()
│   │   │                              # - logOrderCreated()
│   │   │                              # - logOrderRefunded()
│   │   │
│   │   └── routes/
│   │       └── orders.ts              # API Routes mit RBAC
│   │                                  # - GET /admin/orders (nur Admin)
│   │                                  # - POST /admin/orders/:id/refund (nur Admin)
│   │                                  # - GET /user/:id/orders (nur eigene)
│   │                                  # - POST /user/:id/orders (Multi-Item)
│   │
│   └── dist/                          # Kompilierter Output
│
└── frontend/                          # React App
    ├── package.json
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.tsx         # Auth State Management
    │   │                              # - useAuth() Hook
    │   │                              # - canAccess() Role Check
    │   │
    │   └── components/
    │       ├── ProtectedRoute.tsx      # RBAC Route Guard
    │       │                          # - Prüft Rollen vor Anzeige
    │       │
    │       ├── AdminDashboard.tsx      # Admin UI
    │       │                          # - GET /api/admin/orders
    │       │                          # - POST refund (mit Key-Revocation)
    │       │
    │       ├── UserDashboard.tsx       # User UI
    │       │                          # - GET /api/user/:id/orders
    │       │                          # - Zeigt Multi-Item Orders
    │       │                          # - Zeigt Lizenzschlüssel
    │       │
    │       └── ShoppingCart.tsx        # Shopping Experience
    │                                  # - Multi-Item Warenkorb
    │                                  # - Mehrere Produkte gleichzeitig
    │                                  # - Unterschiedliche Mengen
    │
    └── public/
        └── index.html

```

## Feature-Mappings (Anforderungen → Code)

### 1️⃣ Unique Licence Keys

**Anforderung:**
> Die Lizenzen sollten eindeutig sein

| Component | Zeile | Beschreibung |
|-----------|-------|-------------|
| `docs/schema.sql` | `key_value VARCHAR(255) UNIQUE NOT NULL` | Datenbank-Constraint erzwingt Eindeutigkeit |
| `docs/schema.sql` | `FOR UPDATE` in SELECT | Race-Condition-Schutz bei Zuordnung |
| `backend/src/services/licenceService.ts` | `allocateLicencesForOrderItem()` | Atomare Transaktion für sichere Zuordnung |
| `backend/src/services/licenceService.ts` | `validateUniqueKey()` | Validierung vor Import |

### 2️⃣ Multi-Item Purchase

**Anforderung:**
> Der Benutzer ist fähig mehr als 1 Artikel zu kaufen

| Component | Zeile | Beschreibung |
|-----------|-------|-------------|
| `docs/schema.sql` | `CREATE TABLE order_items (quantity INTEGER)` | Mehrere Menge pro Produkt |
| `docs/schema.sql` | `assigned_key_ids TEXT[]` | Array für mehrer Schlüssel pro Item |
| `backend/src/routes/orders.ts` | `const { items } = req.body` | Accept multiple items |
| `backend/src/routes/orders.ts` | `for (const item of items) { ... }` | Process each item |
| `frontend/src/components/ShoppingCart.tsx` | `const cart: CartItem[]` | Multi-Item Cart State |
| `frontend/src/components/ShoppingCart.tsx` | `cart.map((item) => ...)` | Display all items |
| `frontend/src/components/UserDashboard.tsx` | `selectedOrder.items?.map()` | Show multi-item orders |

### 3️⃣ Role-Based Access Control

**Anforderung:**
> Verschiedene Benutzertypen haben unterschiedliche Rechte

| Component | Zeile | Beschreibung |
|-----------|-------|-------------|
| `docs/schema.sql` | `CREATE TABLE roles` | Rollen-Definitions |
| `docs/schema.sql` | `role_id INTEGER NOT NULL REFERENCES roles(id)` | User-Rolle Zuordnung |
| `backend/src/middleware/auth.ts` | `authorize(allowedRoles)` | Route-Level Authorization Middleware |
| `backend/src/middleware/auth.ts` | `checkResourceOwnership()` | Owner-Check für Datenschutz |
| `backend/src/routes/orders.ts` | `authorize(['admin'])` | Admin-only Routes |
| `backend/src/routes/orders.ts` | `checkResourceOwnership('userId')` | User kann nur eigene Daten sehen |
| `frontend/src/context/AuthContext.tsx` | `canAccess(roles)` | Frontend Rollen-Check |
| `frontend/src/components/ProtectedRoute.tsx` | `requiredRoles` | Route-Level UI Protection |
| `frontend/src/components/AdminDashboard.tsx` | `(nur Admin)` | Admin-exclusive Features |
| `frontend/src/components/UserDashboard.tsx` | `(nur Private/Business)` | User-exclusive Features |

### 4️⃣ Audit & Compliance

**Anforderung:**
> System muss nachvollziehbar und sicher sein

| Component | Zeile | Beschreibung |
|-----------|-------|-------------|
| `docs/schema.sql` | `CREATE TABLE audit_logs` | Compliance-Tracking |
| `backend/src/services/auditService.ts` | `logKeyAssignment()` | Log Key-Zuordnungen |
| `backend/src/services/auditService.ts` | `logOrderRefunded()` | Log Refunds + Key-Revocation |
| `backend/src/routes/orders.ts` | `auditService.log()` | Call logging bei Operationen |

---

## Technologie-Stack

### Backend
```
┌─────────────────────────────────────┐
│       Express.js (HTTP Server)      │
│   - TypeScript für Type Safety      │
│   - JWT für Authentication          │
│   - bcrypt für Password Hashing     │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Middleware Layer                  │
│   - authenticate(): JWT Verify      │
│   - authorize(): Role Check         │
│   - checkResourceOwnership()        │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Service Layer                     │
│   - LicenceService                  │
│   - AuditService                    │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   PostgreSQL Database               │
│   - ACID Transactions               │
│   - Constraints (UNIQUE, FK)        │
│   - Audit Logs                      │
└─────────────────────────────────────┘
```

### Frontend
```
┌─────────────────────────────────────┐
│         React 18 App                │
║   - TypeScript für Type Safety      │
║   - React Router voor Navigation    │
║   - Axios für API-Calls             │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   AuthContext                       │
│   - Login/Logout                    │
│   - Token Management                │
│   - Role Info                       │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   Components (Role-based)           │
│   - ProtectedRoute Guard            │
│   - AdminDashboard                  │
│   - UserDashboard                   │
│   - ShoppingCart                    │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   API Integration (Axios)           │
│   - HTTP Requests                   │
│   - JWT Authorization Header        │
│   - Error Handling                  │
└─────────────────────────────────────┘
```

---

## Security Features

✓ **Authentication**: JWT-basierte Session-Verwaltung
✓ **Authorization**: Rollen-basierter Zugriff auf alle Operationen
✓ **Unique Keys**: UNIQUE Constraint + Race-Condition Locking
✓ **Data Ownership**: Benutzer können nur ihre eigenen Daten sehen/ändern
✓ **Audit Trail**: Alle wichtigen Operationen werden geloggt
✓ **Key Revocation**: Refunded Keys können nicht wiederverkauft werden
✓ **Type Safety**: TypeScript auf Frontend + Backend
✓ **Password Hashing**: bcrypt für sichere Passwörter
