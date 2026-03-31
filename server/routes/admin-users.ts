import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { profiles, workspaces } from '../../drizzle/schema.js';
import { eq, or } from 'drizzle-orm';
import { authenticateToken, requireRole } from '../auth/middleware.js';
import { hashPassword } from '../auth/utils.js';

const router = Router();

// All routes require authentication and super_admin role
router.use(authenticateToken);
router.use(requireRole('super_admin'));

// GET /api/admin/users - List all users with workspaces
router.get('/', async (_req: Request, res: Response) => {
  try {
    const allProfiles = await db.select().from(profiles);

    // Get workspace names
    const workspaceIds = [...new Set(allProfiles.map(p => p.workspaceId).filter(Boolean))];
    const workspacesResult = workspaceIds.length > 0
      ? await db.select({ id: workspaces.id, name: workspaces.name }).from(workspaces)
      : [];
    const workspaceMap = Object.fromEntries(workspacesResult.map(w => [w.id, w.name]));

    const result = allProfiles.map(p => ({
      id: p.id,
      email: p.email,
      nameVn: p.nameVn,
      nameJp: p.nameJp,
      role: p.role,
      active: p.active,
      workspaceId: p.workspaceId,
      workspaceName: p.workspaceId ? workspaceMap[p.workspaceId] || 'Unknown' : null,
      createdAt: p.createdAt,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users - Create staff user in workspace
router.post('/', async (req: Request, res: Response) => {
  try {
    const { email, password, role, workspaceId, nameVn, nameJp } = req.body;

    if (!email || !password || !workspaceId) {
      res.status(400).json({ error: 'Email, password, and workspaceId are required' });
      return;
    }

    // Check if email already exists
    const existing = await db.select().from(profiles).where(eq(profiles.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    // Check if workspace exists
    const ws = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
    if (ws.length === 0) {
      res.status(400).json({ error: 'Workspace not found' });
      return;
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await db.insert(profiles).values({
      id: userId,
      email,
      passwordHash,
      nameVn: nameVn || email.split('@')[0],
      nameJp: nameJp || '',
      role: role || 'staff',
      workspaceId,
      active: true,
    });

    const newUser = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

    res.status(201).json({
      ...newUser[0],
      workspaceName: ws[0].name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:id - Update role/status
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, active, nameVn, nameJp } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (role !== undefined) updates.role = role;
    if (active !== undefined) updates.active = active;
    if (nameVn !== undefined) updates.nameVn = nameVn;
    if (nameJp !== undefined) updates.nameJp = nameJp;

    const updateResult = await db.update(profiles)
      .set(updates)
      .where(eq(profiles.id, id))
      .returning();

    if (updateResult.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get workspace name
    const user = updateResult[0];
    let workspaceName = null;
    if (user.workspaceId) {
      const ws = await db.select({ name: workspaces.name }).from(workspaces).where(eq(workspaces.id, user.workspaceId)).limit(1);
      workspaceName = ws[0]?.name || null;
    }

    res.json({
      ...user,
      workspaceName,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:id - Deactivate
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft deactivate - set active to false
    const updateResult = await db.update(profiles)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(profiles.id, id))
      .returning();

    if (updateResult.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

export default router;