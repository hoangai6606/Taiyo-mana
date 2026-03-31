import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { workspaces, profiles } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { authenticateToken, requireRole } from '../auth/middleware.js';
import { generateToken } from '../auth/utils.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/impersonate/exit - Exit impersonation (must be before /:workspaceId to avoid "exit" being matched as workspaceId)
router.post('/exit', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    // Generate new token without impersonatingWorkspaceId
    const newToken = generateToken({
      userId: req.user!.userId,
      role: req.user!.role,
      workspaceId: req.user!.workspaceId,
    });

    res.json({
      token: newToken,
      impersonatingWorkspaceId: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to exit impersonation' });
  }
});

// POST /api/impersonate/:workspaceId - Enter workspace (returns new JWT with impersonatingWorkspaceId)
router.post('/:workspaceId', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Verify workspace exists
    const ws = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
    if (ws.length === 0) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Get manager's email if managerId exists
    let managerEmail = null;
    if (ws[0].managerId) {
      const manager = await db.select({ email: profiles.email }).from(profiles).where(eq(profiles.id, ws[0].managerId)).limit(1);
      managerEmail = manager[0]?.email || null;
    }

    // Generate new token with impersonation
    const newToken = generateToken({
      userId: req.user!.userId,
      role: req.user!.role,
      workspaceId: req.user!.workspaceId,
      impersonatingWorkspaceId: workspaceId,
    });

    res.json({
      workspace: { id: workspaceId, name: ws[0].name, managerId: ws[0].managerId, managerEmail, created_at: ws[0].createdAt, updated_at: ws[0].updatedAt },
      token: newToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to impersonate workspace' });
  }
});

export default router;
