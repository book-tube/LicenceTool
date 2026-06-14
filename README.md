# Licence Supply Platform

A complete software license management and distribution platform with **unique license keys**, **multi-item orders**, and **role-based access control**.

## 🚀 Features

✅ **Unique License Keys** - Every sold license is globally unique with database constraints and transaction locking  
✅ **Multi-Item Orders** - Users can purchase multiple products and quantities in a single order  
✅ **Role-Based Access Control (RBAC)** - Admin, Private User, and Business User roles with separate permissions  
✅ **Admin Dashboard** - Manage all orders, process refunds, and revoke licenses  
✅ **Order Fulfillment** - Automatic unique key assignment and delivery  
✅ **Audit Trail** - Complete logging of all operations for compliance  
✅ **Privacy Controls** - Users can only access their own data  

## 📁 Project Structure

```
LicenceTool/
├── requirements.md                   # Product requirements specification
├── IMPLEMENTATION_GUIDE.md           # Detailed implementation guide
├── PROJECT_STRUCTURE.md              # File structure and feature mappings
├── demo.html                         # German demo
├── demo-en.html                      # English demo (live version)
│
├── docs/
│   └── schema.sql                    # PostgreSQL database schema
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── server.ts                 # Express server entry point
│   │   ├── middleware/
│   │   │   └── auth.ts               # RBAC middleware
│   │   ├── services/
│   │   │   ├── licenceService.ts     # Unique key management
│   │   │   └── auditService.ts       # Compliance logging
│   │   └── routes/
│   │       └── orders.ts             # API endpoints (RBAC protected)
│   └── dist/                         # Compiled output
│
└── frontend/
    ├── package.json
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.tsx        # Auth state management
    │   └── components/
    │       ├── ProtectedRoute.tsx     # Route guards
    │       ├── AdminDashboard.tsx     # Admin UI
    │       ├── UserDashboard.tsx      # User orders & licenses
    │       └── ShoppingCart.tsx       # Multi-item checkout
    └── public/
        └── index.html
```

## 🎯 Implemented Requirements

### 1. Unique Licence Keys
Every sold license is globally unique:
- Database UNIQUE constraint on `licence_keys.key_value`
- FOR UPDATE locking prevents race conditions
- Atomic transactions ensure safe allocation

See: [backend/src/services/licenceService.ts](backend/src/services/licenceService.ts)

### 2. Multi-Item Orders
Users can buy multiple products and quantities:
- `order_items` table supports variable quantities
- `assigned_key_ids` array stores multiple keys per item
- Transaction ensures consistency

See: [backend/src/routes/orders.ts](backend/src/routes/orders.ts) and [docs/schema.sql](docs/schema.sql)

### 3. Role-Based Access Control
Three roles with different permissions:
- **Admin**: Full access to orders, refunds, license management
- **Private User**: Buy licenses, view own orders
- **Business User**: Same as Private + company billing

Implemented via:
- [backend/src/middleware/auth.ts](backend/src/middleware/auth.ts) - Authorization middleware
- [frontend/src/components/ProtectedRoute.tsx](frontend/src/components/ProtectedRoute.tsx) - UI route guards

### 4. Admin Features
- View all customer orders
- Process refunds and revoke licenses
- Track operations via audit trail

### 5. Audit Trail
All important operations logged:
- Order creation
- License assignment
- Refunds and revocation
- Access control events

See: [backend/src/services/auditService.ts](backend/src/services/auditService.ts)

## 🎮 Live Demo

Open **[demo-en.html](demo-en.html)** in your browser to see the platform in action:

1. **Switch roles** using the buttons at the top
2. **Admin Dashboard** - View all orders (admin only)
3. **Shopping Cart** - Add multiple products (multi-item demo)
4. **My Orders** - View your orders and licenses
5. **Requirements** - See implementation details

The demo runs entirely in the browser with mock data.

## 🔧 Setup & Installation

### Prerequisites
- Node.js 14+ and npm
- PostgreSQL 12+
- Git

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The server will run on `http://localhost:3000`

### Database Setup

```bash
createdb licence_tool
psql licence_tool < ../docs/schema.sql
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will run on `http://localhost:3000` (via Create React App)

## 📚 Documentation

- **[requirements.md](requirements.md)** - Complete requirements specification
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Detailed implementation with code examples
- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - File structure and feature mappings
- **[docs/schema.sql](docs/schema.sql)** - Database schema with comments

## 🚀 Deploy to GitHub

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository (e.g., "licence-supply-platform")
3. **Do NOT initialize with README** (we already have one)
4. Click "Create repository"

### Step 2: Update Local Repository

```bash
# Go to your local project directory
cd /Users/sinan.sahin/Desktop/LicenceTool

# Remove the old remote
git remote remove origin

# Add your new GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/licence-supply-platform.git
git branch -M main

# Push all commits
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Step 3: Verify Push

```bash
git remote -v
# Should show your new repository URL
```

## 📖 Technology Stack

**Backend:**
- Node.js + Express.js
- TypeScript for type safety
- PostgreSQL for data storage
- JWT for authentication
- bcrypt for password hashing

**Frontend:**
- React 18
- TypeScript
- React Router for navigation
- Axios for API calls

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Resource ownership verification
- UNIQUE constraints on license keys
- Transaction-based operations
- Password hashing with bcrypt
- Audit logging of all operations

## 📊 Database Schema

Key tables:
- `users` - User accounts with roles
- `roles` - Role definitions (admin, private, business)
- `products` - Software products
- `licence_keys` - Unique license keys (UNIQUE constraint)
- `orders` - Customer orders
- `order_items` - Multiple items per order
- `invoices` - Order invoices
- `audit_logs` - Compliance logging

See [docs/schema.sql](docs/schema.sql) for full schema.

## 🤝 API Endpoints (with RBAC)

```
Admin Only:
  GET    /api/admin/orders              - View all orders
  POST   /api/admin/orders/:id/refund   - Process refund

User (Private/Business):
  GET    /api/user/:userId/orders       - View own orders
  POST   /api/user/:userId/orders       - Create order (multi-item)
  GET    /api/user/:userId/licences     - View own licenses
```

All endpoints require:
- Valid JWT token
- Appropriate role permissions
- Resource ownership (if accessing own data)

## 📝 License

MIT License - See LICENSE file

## 👤 Author

Created as a demonstration of enterprise-grade license management platform.

## 📞 Support

For questions or issues, please open an issue on GitHub.

---

**Ready to deploy?** Follow the GitHub setup steps above to push this project to your own repository!
