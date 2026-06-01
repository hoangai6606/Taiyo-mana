import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { neon } from '@neondatabase/serverless';
import { inspectionReports, reportItems, reportProductivity, inspectionRecords, inspectionItems } from '../../drizzle/schema.js';
import { eq, and } from 'drizzle-orm';
import { isByteArrayString, convertByteArrayToUuid } from '../utils/convertUuid.js';
import { getWorkspaceId } from '../utils/workspace.js';
import { authenticateToken } from '../auth/middleware.js';

// Separate neon instance for raw SQL (code generation, COUNT queries)
const sql = neon(process.env.DATABASE_URL || '');

const router = Router();

// GET /api/inspection-reports — list reports (workspace-scoped)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const selectFields = {
      id: inspectionReports.id,
      code: inspectionReports.code,
      sourceRecordId: inspectionReports.sourceRecordId,
      customerName: inspectionReports.customerName,
      factoryNames: inspectionReports.factoryNames,
      inspectionDate: inspectionReports.inspectionDate,
      status: inspectionReports.status,
      workspaceId: inspectionReports.workspaceId,
      createdAt: inspectionReports.createdAt,
      updatedAt: inspectionReports.updatedAt,
      createdBy: inspectionReports.createdBy,
    };

    let records: any[];
    if (workspaceId) {
      records = await db.select(selectFields).from(inspectionReports)
        .where(eq(inspectionReports.workspaceId, workspaceId));
    } else if (workspaceId === null) {
      records = await db.select(selectFields).from(inspectionReports);
    } else {
      records = [];
    }

    const result = records.map(r => {
      let wsId = r.workspaceId as string;
      if (isByteArrayString(wsId)) wsId = convertByteArrayToUuid(wsId);
      return {
        ...r,
        id: isByteArrayString(r.id) ? convertByteArrayToUuid(r.id) : r.id,
        workspaceId: wsId,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.json([]);
  }
});

// GET /api/inspection-reports/:id — get report + items
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (isByteArrayString(id)) {
      id = convertByteArrayToUuid(id);
    }
    const workspaceId = getWorkspaceId(req);

    const [report] = await db
      .select()
      .from(inspectionReports)
      .where(eq(inspectionReports.id, id));

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Normalize workspaceId for comparison (could be byte array from Neon)
    const reportWorkspaceId = isByteArrayString(report.workspaceId as string)
      ? convertByteArrayToUuid(report.workspaceId as string)
      : report.workspaceId;

    if (workspaceId && reportWorkspaceId !== workspaceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Fetch items + productivity in parallel
    const [items, productivityResult] = await Promise.all([
      db.select().from(reportItems).where(eq(reportItems.reportId, id)),
      db.select().from(reportProductivity).where(eq(reportProductivity.reportId, id)).catch((err) => {
        console.error('Failed to fetch report productivity (non-fatal):', err);
        return [] as any[];
      }),
    ]);
    const productivity = productivityResult;

    res.json({ ...report, items, productivity });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch report', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/inspection-reports — create report with snapshot items
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sourceRecordId, customerName, factoryNames, inspectionDate, items, productivity, status } = req.body;
    const workspaceId = getWorkspaceId(req);

    // Validate source record exists and belongs to workspace
    if (!sourceRecordId) {
      res.status(400).json({ error: 'sourceRecordId is required' });
      return;
    }

    const [sourceRecord] = await db
      .select({ id: inspectionRecords.id, workspaceId: inspectionRecords.workspaceId })
      .from(inspectionRecords)
      .where(eq(inspectionRecords.id, sourceRecordId));

    if (!sourceRecord) {
      res.status(404).json({ error: 'Source inspection record not found' });
      return;
    }

    const sourceWsId = isByteArrayString(sourceRecord.workspaceId as string)
      ? convertByteArrayToUuid(sourceRecord.workspaceId as string)
      : sourceRecord.workspaceId;
    if (workspaceId && sourceWsId !== workspaceId) {
      res.status(403).json({ error: 'Source record does not belong to your workspace' });
      return;
    }

    // Fetch ALL items belonging to the source record from DB (source of truth)
    const dbItems = await db
      .select()
      .from(inspectionItems)
      .where(eq(inspectionItems.recordId, sourceRecordId));

    // If client sent item IDs, validate they belong to source record
    if (items && items.length > 0) {
      const clientItemIds = items.map((item: any) => item.id).filter(Boolean);
      if (clientItemIds.length > 0) {
        const dbItemIds = new Set(dbItems.map(i => i.id));
        const invalidIds = clientItemIds.filter((id: string) => !dbItemIds.has(id));
        if (invalidIds.length > 0) {
          res.status(400).json({ error: `Items do not belong to source record: ${invalidIds.join(', ')}` });
          return;
        }
      }
    }

    // Use DB-fetched items as source of truth for the report snapshot
    const itemsToInsert = (items && items.length > 0)
      ? dbItems.filter(dbItem => items.some((ci: any) => ci.id === dbItem.id))
      : dbItems; // If no client filter, use all items

    const reportId = crypto.randomUUID();

    // Auto-generate code: BC## prefix
    const countResult = await sql`SELECT COUNT(*) as cnt FROM inspection_reports WHERE code LIKE 'BC%'`;
    const hasRecords = parseInt(String((countResult as any)[0]?.cnt || '0'), 10) > 0;

    let nextNum = 1;
    if (hasRecords) {
      const maxCodeResult = await sql`SELECT code FROM inspection_reports WHERE code LIKE 'BC%' ORDER BY code DESC LIMIT 1`;
      if (maxCodeResult && (maxCodeResult as any).length > 0) {
        const lastCode = (maxCodeResult as any)[0].code;
        const numPart = parseInt(lastCode.replace('BC', ''), 10);
        nextNum = numPart + 1;
      }
    }
    const newCode = `BC${String(nextNum).padStart(2, '0')}`;

    let reportInserted = false;
    try {
      await db.insert(inspectionReports).values({
        id: reportId,
        code: newCode,
        sourceRecordId: sourceRecordId || null,
        customerName: customerName || null,
        factoryNames: factoryNames || null,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
        status: status || 'draft',
        workspaceId,
      });
      reportInserted = true;

      if (itemsToInsert.length > 0) {
        await db.insert(reportItems).values(
          itemsToInsert.map((item: any) => ({
            id: crypto.randomUUID(),
            reportId,
            inspectionDate: item.inspectionDate ? new Date(item.inspectionDate) : null,
            inspectionContent: item.inspectionContent || '',
            productCode: item.productCode || '',
            brand: item.brand || '',
            productName: item.productName || '',
            color: item.color || '',
            size: item.size || '',
            inspectedQuantity: item.inspectedQuantity || 0,
            passedQuantity: item.passedQuantity || 0,
            defectiveQuantity: item.defectiveQuantity || 0,
            specifications: item.specifications || 0,
            accessories: item.accessories || 0,
            appearance: item.appearance || 0,
            fabric: item.fabric || 0,
            dirty: item.dirty || 0,
            seamDefect: item.seamDefect || 0,
            other: item.other || 0,
            printDefect: item.printDefect || 0,
            soleDefect: item.soleDefect || 0,
            scratchDefect: item.scratchDefect || 0,
            metalCheck: item.metalCheck || 0,
            reinspectQuantity: item.reinspectQuantity || 0,
            reinspectPassed: item.reinspectPassed || 0,
            reinspectFailed: item.reinspectFailed || 0,
            reinspectSpecifications: item.reinspectSpecifications || '',
            reinspectAccessories: item.reinspectAccessories || '',
            reinspectAppearance: item.reinspectAppearance || '',
            reinspectPrintDefect: item.reinspectPrintDefect || 0,
            reinspectSoleDefect: item.reinspectSoleDefect || 0,
            reinspectScratchDefect: item.reinspectScratchDefect || 0,
          }))
        );
      }

      if (productivity && productivity.length > 0) {
        await db.insert(reportProductivity).values(
          productivity.map((p: any) => ({
            id: crypto.randomUUID(),
            reportId,
            recordDate: p.recordDate,
            factoryId: p.factoryId || null,
            factoryName: p.factoryName || '',
            qcQuantity: p.qcQuantity || 0,
            ot: p.ot || 0,
          }))
        );
      }
    } catch (err) {
      if (reportInserted) {
        try {
          await db.delete(inspectionReports).where(eq(inspectionReports.id, reportId));
        } catch (deleteErr) {
          console.error('Failed to rollback report:', deleteErr);
        }
      }
      throw err;
    }

    res.status(201).json({ id: reportId, code: newCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create report', details: err instanceof Error ? err.message : String(err) });
  }
});

// PUT /api/inspection-reports/:id — update report items (delete + recreate)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    const workspaceId = getWorkspaceId(req);

    const [existing] = await db.select({ workspaceId: inspectionReports.workspaceId })
      .from(inspectionReports)
      .where(eq(inspectionReports.id, id))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    const existingWorkspaceId = isByteArrayString(existing.workspaceId as string)
      ? convertByteArrayToUuid(existing.workspaceId as string)
      : existing.workspaceId;
    if (workspaceId && existingWorkspaceId !== workspaceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const { customerName, factoryNames, inspectionDate, items, productivity, status } = req.body;

    await db.update(inspectionReports)
      .set({
        customerName: customerName || null,
        factoryNames: factoryNames || null,
        inspectionDate: inspectionDate ? new Date(inspectionDate) : null,
        status: status || 'draft',
        updatedAt: new Date(),
      })
      .where(eq(inspectionReports.id, id));

    // Delete and recreate items
    await db.delete(reportItems).where(eq(reportItems.reportId, id));
    if (items && items.length > 0) {
      await db.insert(reportItems).values(
        items.map((item: any) => ({
          id: crypto.randomUUID(),
          reportId: id,
          inspectionDate: item.inspectionDate ? new Date(item.inspectionDate) : null,
          inspectionContent: item.inspectionContent || '',
          productCode: item.productCode || '',
          brand: item.brand || '',
          productName: item.productName || '',
          color: item.color || '',
          size: item.size || '',
          inspectedQuantity: item.inspectedQuantity || 0,
          passedQuantity: item.passedQuantity || 0,
          defectiveQuantity: item.defectiveQuantity || 0,
          specifications: item.specifications || 0,
          accessories: item.accessories || 0,
          appearance: item.appearance || 0,
          fabric: item.fabric || 0,
          dirty: item.dirty || 0,
          seamDefect: item.seamDefect || 0,
          other: item.other || 0,
          printDefect: item.printDefect || 0,
          soleDefect: item.soleDefect || 0,
          scratchDefect: item.scratchDefect || 0,
          metalCheck: item.metalCheck || 0,
          reinspectQuantity: item.reinspectQuantity || 0,
          reinspectPassed: item.reinspectPassed || 0,
          reinspectFailed: item.reinspectFailed || 0,
          reinspectSpecifications: item.reinspectSpecifications || '',
          reinspectAccessories: item.reinspectAccessories || '',
          reinspectAppearance: item.reinspectAppearance || '',
          reinspectPrintDefect: item.reinspectPrintDefect || 0,
          reinspectSoleDefect: item.reinspectSoleDefect || 0,
          reinspectScratchDefect: item.reinspectScratchDefect || 0,
        }))
      );
    }

    // Delete and recreate productivity
    await db.delete(reportProductivity).where(eq(reportProductivity.reportId, id));
    if (productivity && productivity.length > 0) {
      await db.insert(reportProductivity).values(
        productivity.map((p: any) => ({
          id: crypto.randomUUID(),
          reportId: id,
          recordDate: p.recordDate,
          factoryId: p.factoryId || null,
          factoryName: p.factoryName || '',
          qcQuantity: p.qcQuantity || 0,
          ot: p.ot || 0,
        }))
      );
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update report', details: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/inspection-reports/:id — delete report
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    const workspaceId = getWorkspaceId(req);

    const existing = await db.select({ id: inspectionReports.id, workspaceId: inspectionReports.workspaceId })
      .from(inspectionReports)
      .where(eq(inspectionReports.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const existingWorkspaceId = isByteArrayString(existing[0].workspaceId as string)
      ? convertByteArrayToUuid(existing[0].workspaceId as string)
      : existing[0].workspaceId;
    if (workspaceId && existingWorkspaceId !== workspaceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await db.delete(reportProductivity).where(eq(reportProductivity.reportId, id));
    await db.delete(reportItems).where(eq(reportItems.reportId, id));
    await db.delete(inspectionReports).where(eq(inspectionReports.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete report', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
