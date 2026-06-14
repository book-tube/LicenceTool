import express from 'express';
import { Pool } from 'pg';
import { setupOrderRoutes } from './routes/orders';
import { AuditService } from './services/auditService';
import { LicenceService } from './services/licenceService';

const app = express();
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/licence_tool'
});

// Initialize services
const auditService = new AuditService(pool);
const licenceService = new LicenceService(pool, auditService);

// Routes
app.use('/api', setupOrderRoutes(pool, auditService, licenceService));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
