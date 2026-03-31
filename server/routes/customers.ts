import { Router } from 'express';
import { db } from '../db.js';
import { customers } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { createCrudRouter } from './crud-factory.js';

const router = Router();
router.use('/', createCrudRouter(customers, 'customer'));
export default router;
