import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { workspaces, profiles } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, requireRole } from '../auth/middleware.js';
import { hashPassword } from '../auth/utils.js';

// Helper to convert Buffer/byte array to UUID string
function bufferToUUID(value: unknown): string {
  if (Buffer.isBuffer(value)) {
    const hex = value.toString('hex');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }
  return String(value);
}

const router = Router();

// All routes require authentication and super_admin role
router.use(authenticateToken);
router.use(requireRole('super_admin'));

// GET /api/workspaces - List all workspaces
router.get('/', async (_req: Request, res: Response) => {
  try {
    const allWorkspaces = await db.select().from(workspaces).orderBy(workspaces.createdAt);

    // Get manager emails for each workspace
    // Fetch all profiles and filter in JavaScript to avoid Neon driver inArray bug
    const allProfiles = await db.select({ id: profiles.id, email: profiles.email }).from(profiles);
    const profileMap = Object.fromEntries(allProfiles.map(p => [bufferToUUID(p.id), p.email]));

    const result = allWorkspaces.map(w => ({
      id: bufferToUUID(w.id),
      name: w.name,
      managerId: w.managerId ? bufferToUUID(w.managerId) : null,
      managerEmail: w.managerId ? profileMap[bufferToUUID(w.managerId)] || null : null,
      created_at: w.createdAt,
      updated_at: w.updatedAt,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// POST /api/workspaces - Create workspace + manager account
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, managerEmail, managerPassword, managerNameVn, managerNameJp } = req.body;

    if (!name || !managerEmail || !managerPassword) {
      res.status(400).json({ error: 'Name, manager email, and password are required' });
      return;
    }

    // Check if email already exists
    let existing;
    try {
      existing = await db.select().from(profiles).where(eq(profiles.email, managerEmail)).limit(1);
    } catch (err: any) {
      // Neon driver bug: crashes when query returns 0 rows
      // If error is "Cannot read properties of null", treat as no existing user
      if (err?.cause?.message?.includes('Cannot read properties of null')) {
        existing = [];
      } else {
        throw err;
      }
    }
    if (existing.length > 0) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    // Create workspace
    const workspaceId = crypto.randomUUID();
    const managerId = crypto.randomUUID();
    const passwordHash = await hashPassword(managerPassword);

    // Create workspace first
    await db.insert(workspaces).values({
      id: workspaceId,
      name,
      managerId,
    });

    // Create manager profile (workspace must exist first for FK constraint)
    await db.insert(profiles).values({
      id: managerId,
      email: managerEmail,
      passwordHash,
      nameVn: managerNameVn || managerEmail.split('@')[0],
      nameJp: managerNameJp || '',
      role: 'manager',
      workspaceId,
      active: true,
    });

    const workspace = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);

    res.status(201).json({
      id: bufferToUUID(workspace[0].id),
      name: workspace[0].name,
      managerId: workspace[0].managerId ? bufferToUUID(workspace[0].managerId) : null,
      managerEmail,
      created_at: workspace[0].createdAt,
      updated_at: workspace[0].updatedAt,
    });
  } catch (err) {
    console.error('Create workspace error:', err);
    res.status(500).json({ error: 'Failed to create workspace', details: String(err) });
  }
});

// PUT /api/workspaces/:id - Update workspace
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updateResult = await db.update(workspaces)
      .set({ name, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning();

    if (updateResult.length === 0) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    res.json(updateResult[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
});

// DELETE /api/workspaces/:id - Delete workspace + all data
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting default workspace
    if (id === '00000000-0000-0000-0000-000000000000') {
      res.status(400).json({ error: 'Cannot delete default workspace' });
      return;
    }

    // Check if workspace exists
    const existing = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
    if (existing.length === 0) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Delete all data in this workspace
    // Note: This uses CASCADE delete if foreign keys are set up correctly
    // For manual cleanup, we would need to delete related records first

    // Delete workspace
    await db.delete(workspaces).where(eq(workspaces.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
});

export default router;
