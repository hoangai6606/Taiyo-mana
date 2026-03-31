import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { eq, ilike, and, SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { getWorkspaceId } from '../utils/workspace.js';

type TableWithId = PgTable & { id: { dataType: string } };

export function createCrudRouter(table: TableWithId, name: string) {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const workspaceId = getWorkspaceId(req);
      const baseQuery = db.select().from(table);

      // For tables with workspaceId column, filter by workspace
      if (workspaceId && 'workspaceId' in table) {
        const rows = await db.select().from(table).where(eq((table as any).workspaceId, workspaceId));
        res.json(rows);
      } else {
        const rows = await baseQuery;
        res.json(rows);
      }
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch ${name}` });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const workspaceId = getWorkspaceId(req);
      const [row] = await db.select().from(table).where(eq(table.id, req.params.id));

      if (!row) {
        res.status(404).json({ error: `${name} not found` });
        return;
      }

      // Check workspace access if applicable
      if (workspaceId && 'workspaceId' in row && row.workspaceId !== workspaceId) {
        res.status(403).json({ error: 'Access denied to this resource' });
        return;
      }

      res.json(row);
    } catch (err) {
      res.status(500).json({ error: `Failed to fetch ${name}` });
    }
  });

  router.post('/', async (req: Request, res: Response) => {
    try {
      const workspaceId = getWorkspaceId(req);
      const data: any = { ...req.body };
      if (req.user) {
        data.createdBy = req.user.userId;
      }
      // Auto-set workspaceId if the table has it
      if (workspaceId && 'workspaceId' in table) {
        data.workspaceId = workspaceId;
      }
      const [row] = await db.insert(table).values(data).returning();
      res.status(201).json(row);
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(409).json({ error: `${name} already exists` });
        return;
      }
      res.status(500).json({ error: `Failed to create ${name}` });
    }
  });

  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const workspaceId = getWorkspaceId(req);
      const data: any = { ...req.body };
      delete data.id;
      if (req.user && 'updatedBy' in table) {
        data.updatedBy = req.user.userId;
      }

      // Check workspace access if applicable
      if (workspaceId && 'workspaceId' in table) {
        const [existing] = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
        if (!existing) {
          res.status(404).json({ error: `${name} not found` });
          return;
        }
        if (existing.workspaceId !== workspaceId) {
          res.status(403).json({ error: 'Access denied to this resource' });
          return;
        }
      }

      const [row] = await db.update(table).set({ ...data, updatedAt: new Date() }).where(eq(table.id, req.params.id)).returning();
      if (!row) {
        res.status(404).json({ error: `${name} not found` });
        return;
      }
      res.json(row);
    } catch (err) {
      res.status(500).json({ error: `Failed to update ${name}` });
    }
  });

  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const workspaceId = getWorkspaceId(req);

      // Check workspace access if applicable
      if (workspaceId && 'workspaceId' in table) {
        const [existing] = await db.select().from(table).where(eq(table.id, req.params.id)).limit(1);
        if (!existing) {
          res.status(404).json({ error: `${name} not found` });
          return;
        }
        if (existing.workspaceId !== workspaceId) {
          res.status(403).json({ error: 'Access denied to this resource' });
          return;
        }
      }

      const [row] = await db.delete(table).where(eq(table.id, req.params.id)).returning();
      if (!row) {
        res.status(404).json({ error: `${name} not found` });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: `Failed to delete ${name}` });
    }
  });

  return router;
}
