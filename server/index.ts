import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './auth/routes.js';
import customersRouter from './routes/customers.js';
import factoriesRouter from './routes/factories.js';
import productTypesRouter from './routes/product-types.js';
import productStylesRouter from './routes/product-styles.js';
import profilesRouter from './routes/profiles.js';
import dashboardRouter from './routes/dashboard.js';
import inspectionRecordsRouter from './routes/inspection-records.js';
import debitNotesRouter from './routes/debit-notes.js';
import factoryPricesRouter from './routes/factory-prices.js';
import workspacesRouter from './routes/workspaces.js';
import adminUsersRouter from './routes/admin-users.js';
import impersonateRouter from './routes/impersonate.js';
import chatRouter from './routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
const uploadsDir = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsDir));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customersRouter);
app.use('/api/factories', factoriesRouter);
app.use('/api/product-types', productTypesRouter);
app.use('/api/product-styles', productStylesRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/inspection-records', inspectionRecordsRouter);
app.use('/api/debit-notes', debitNotesRouter);
app.use('/api/factory-prices', factoryPricesRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/impersonate', impersonateRouter);
app.use('/api/chat', chatRouter);

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', 'client');
app.use(express.static(clientDist));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
