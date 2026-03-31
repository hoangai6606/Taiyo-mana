import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { profiles } from '../../drizzle/schema.js';
import { hashPassword, verifyPassword, generateToken } from './utils.js';
import { authenticateToken } from './middleware.js';

const router = Router();

// Helper to convert Buffer/byte array to UUID string
function bufferToUUID(value: unknown): string {
  if (Buffer.isBuffer(value)) {
    const hex = value.toString('hex');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  if (Array.isArray(value) && value.length === 16) {
    const hex = value.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  // Handle string format like "163,63,144,11,83,210,67,20,148,147,79,111,232,83,194,128"
  if (typeof value === 'string' && value.includes(',')) {
    const bytes = value.split(',').map(b => parseInt(b.trim(), 10));
    if (bytes.length === 16 && bytes.every(b => !isNaN(b))) {
      const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    }
  }
  return String(value);
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const [user] = await db.select().from(profiles).where(eq(profiles.email, email));
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Convert UUID Buffer to proper string
    const userId = bufferToUUID(user.id);
    const workspaceId = user.workspaceId ? bufferToUUID(user.workspaceId) : undefined;
    const token = generateToken({ userId, role: user.role, workspaceId });
    const { passwordHash: _, ...profile } = user;
    // Also convert workspaceId if present
    const profileWithStringIds = {
      ...profile,
      id: bufferToUUID(profile.id),
      workspaceId: profile.workspaceId ? bufferToUUID(profile.workspaceId) : null,
    };
    res.json({ token, profile: profileWithStringIds });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, nameVn, nameJp, role, factoryId } = req.body;
    if (!email || !password || !nameVn) {
      res.status(400).json({ error: 'Email, password, and nameVn required' });
      return;
    }

    const [existing] = await db.select().from(profiles).where(eq(profiles.email, email));
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(profiles).values({
      email,
      passwordHash,
      nameVn,
      nameJp: nameJp || '',
      role: role || 'staff',
      factoryId: factoryId || null,
    }).returning();

    const token = generateToken({
      userId: bufferToUUID(user.id),
      role: user.role,
      workspaceId: user.workspaceId ? bufferToUUID(user.workspaceId) : undefined,
    });
    const { passwordHash: _, ...profile } = user;
    const profileWithStringIds = {
      ...profile,
      id: bufferToUUID(profile.id),
      workspaceId: profile.workspaceId ? bufferToUUID(profile.workspaceId) : null,
    };
    res.status(201).json({ token, profile: profileWithStringIds });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [user] = await db.select().from(profiles).where(eq(profiles.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { passwordHash: _, ...profile } = user;
    // Convert Buffer UUIDs to strings
    const profileWithStringIds = {
      ...profile,
      id: bufferToUUID(profile.id),
      workspaceId: profile.workspaceId ? bufferToUUID(profile.workspaceId) : null,
    };
    res.json(profileWithStringIds);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
