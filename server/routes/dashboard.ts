import { Router } from 'express';
import { db } from '../db.js';
import { customers, factories, profiles, productTypes, productStyles } from '../../drizzle/schema.js';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/stats', async (_req, res) => {
  try {
    const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const [factoryCount] = await db.select({ count: sql<number>`count(*)` }).from(factories);
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(profiles);
    const [productTypeCount] = await db.select({ count: sql<number>`count(*)` }).from(productTypes);
    const [productStyleCount] = await db.select({ count: sql<number>`count(*)` }).from(productStyles);

    res.json({
      totalCustomers: Number(customerCount.count),
      totalFactories: Number(factoryCount.count),
      totalUsers: Number(userCount.count),
      totalProductTypes: Number(productTypeCount.count),
      totalProductStyles: Number(productStyleCount.count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
