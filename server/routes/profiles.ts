import { Router } from 'express';
import { db } from '../db.js';
import { profiles } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../auth/middleware.js';

const router = Router();

// List all profiles (without password hashes)
router.get('/', authenticateToken, async (_req, res) => {
  try {
    const rows = await db.select({
      id: profiles.id,
      email: profiles.email,
      nameVn: profiles.nameVn,
      nameJp: profiles.nameJp,
      role: profiles.role,
      factoryId: profiles.factoryId,
      active: profiles.active,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    }).from(profiles);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

export default router;
