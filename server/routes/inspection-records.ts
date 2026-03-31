import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { neon } from '@neondatabase/serverless';
import { inspectionRecords, inspectionItems, dailyReports, productivityTracking, factories } from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { convertByteArrayToUuid, isByteArrayString } from '../utils/convertUuid.js';
import { getWorkspaceId } from '../utils/workspace.js';
import { authenticateToken } from '../auth/middleware.js';

const sql = neon(process.env.DATABASE_URL || '');

const router = Router();

// GET /api/inspection-records - List all records with customer/factory names
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);

    // Build base query — use customerName from inspection_records directly since
    // the form saves customer_name (text), not customer_id (UUID FK)
    const baseQuery = db
      .select({
        id: inspectionRecords.id,
        code: inspectionRecords.code,
        customerId: inspectionRecords.customerId,
        customerName: inspectionRecords.customerName,
        factoryIds: inspectionRecords.factoryIds,
        inspectionDate: inspectionRecords.inspectionDate,
        workspaceId: inspectionRecords.workspaceId,
        createdAt: inspectionRecords.createdAt,
        updatedAt: inspectionRecords.updatedAt,
        createdBy: inspectionRecords.createdBy,
      })
      .from(inspectionRecords);

    let records: any[];
    if (workspaceId) {
      records = await baseQuery.where(eq(inspectionRecords.workspaceId, workspaceId));
    } else if (workspaceId === null) {
      // Super admin with no workspace — see all records
      records = await baseQuery;
    } else {
      records = [];
    }

    // Fetch factory names for all records (convert IDs to UUID if needed due to Neon bug)
    const allFactories = await db.select({ id: factories.id, name: factories.name }).from(factories);
    const factoryMap = Object.fromEntries(
      allFactories.map(f => {
        const normalizedId = isByteArrayString(f.id) ? convertByteArrayToUuid(f.id) : f.id;
        return [normalizedId, f.name];
      })
    );

    const result = records.map(r => {
      const normalizedId = isByteArrayString(r.id) ? convertByteArrayToUuid(r.id) : r.id;
      const normalizedCustomerId = isByteArrayString(r.customerId) ? convertByteArrayToUuid(r.customerId) : r.customerId;
      return {
        ...r,
        id: normalizedId,
        customerId: normalizedCustomerId,
        factoryNames: JSON.parse(r.factoryIds || '[]')
          .map((id: string) => factoryMap[id] || id)
          .join(', '),
      };
    });

    res.json(result);
  } catch (err) {
    // Neon driver can fail on empty tables — return empty array instead of error
    console.error(err);
    res.json([]);
  }
});

// GET /api/inspection-records/:id - Get single record with all child data
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    const workspaceId = getWorkspaceId(req);

    // Convert byte array string to UUID if needed (Neon driver bug)
    if (isByteArrayString(id)) {
      id = convertByteArrayToUuid(id);
    }

    const [record] = await db
      .select({
        id: inspectionRecords.id,
        code: inspectionRecords.code,
        customerId: inspectionRecords.customerId,
        customerName: inspectionRecords.customerName,
        factoryIds: inspectionRecords.factoryIds,
        inspectionDate: inspectionRecords.inspectionDate,
        workspaceId: inspectionRecords.workspaceId,
        createdAt: inspectionRecords.createdAt,
        updatedAt: inspectionRecords.updatedAt,
        createdBy: inspectionRecords.createdBy,
      })
      .from(inspectionRecords)
      .where(eq(inspectionRecords.id, id));

    if (!record) {
      res.status(404).json({ error: 'Inspection record not found' });
      return;
    }

    // Workspace validation: non-null workspace users can only see their own records
    if (workspaceId && record.workspaceId !== workspaceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Fetch all child data
    const items = await db.select().from(inspectionItems).where(eq(inspectionItems.recordId, id));
    const reports = await db.select().from(dailyReports).where(eq(dailyReports.recordId, id));
    const productivity = await db.select().from(productivityTracking).where(eq(productivityTracking.recordId, id));

    // Get factory names (convert IDs to UUID if needed due to Neon bug)
    const allFactories = await db.select({ id: factories.id, name: factories.name }).from(factories);
    const factoryMap = Object.fromEntries(
      allFactories.map(f => {
        const normalizedId = isByteArrayString(f.id) ? convertByteArrayToUuid(f.id) : f.id;
        return [normalizedId, f.name];
      })
    );

    // Normalize IDs from byte array to UUID (Neon driver bug)
    const normalizedId = isByteArrayString(record.id) ? convertByteArrayToUuid(record.id) : record.id;
    const normalizedCustomerId = isByteArrayString(record.customerId) ? convertByteArrayToUuid(record.customerId) : record.customerId;

    res.json({
      ...record,
      id: normalizedId,
      customerId: normalizedCustomerId,
      factoryNames: JSON.parse(record.factoryIds || '[]')
        .map((fid: string) => factoryMap[fid] || fid)
        .join(', '),
      items,
      reports,
      productivity,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch inspection record', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/inspection-records - Create record + child data (transaction)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { code: providedCode, customerId, customerName, factoryIds, inspectionDate, items, reports, productivity } = req.body;

    // Derive factoryIds from productivity entries if not explicitly provided
    const derivedFactoryIds = factoryIds && factoryIds.length > 0
      ? factoryIds
      : [...new Set((productivity || []).map((p: any) => p.factoryId).filter(Boolean))];

    // Generate UUID manually to avoid Neon driver RETURNING bug
    const recordId = crypto.randomUUID();

    // Auto-generate code: find max TAIYO## code and increment
    // Workaround for Neon driver bug: COUNT(*)' works on empty tables but SELECT fails
    const countResult = await sql`SELECT COUNT(*) as cnt FROM inspection_records WHERE code LIKE 'TAIYO%'`;
    const hasRecords = parseInt(String((countResult as any)[0]?.cnt || '0'), 10) > 0;

    let nextNum = 1;
    if (hasRecords) {
      const maxCodeResult = await sql`SELECT code FROM inspection_records WHERE code LIKE 'TAIYO%' ORDER BY code DESC LIMIT 1`;
      if (maxCodeResult && (maxCodeResult as any).length > 0) {
        const lastCode = (maxCodeResult as any)[0].code;
        const numPart = parseInt(lastCode.replace('TAIYO', ''), 10);
        nextNum = numPart + 1;
      }
    }
    const newCode = providedCode?.trim() || `TAIYO${String(nextNum).padStart(2, '0')}`;

    // Convert customerId if it's a byte array string (Neon driver bug)
    const convertedCustomerId = isByteArrayString(customerId)
      ? convertByteArrayToUuid(customerId)
      : customerId;

    // Convert factoryIds if they are byte array strings
    const convertedFactoryIds = (derivedFactoryIds || []).map((fid: string) =>
      isByteArrayString(fid) ? convertByteArrayToUuid(fid) : fid
    );

    // Parse the parent inspection date once
    const parentInspectionDate = new Date(inspectionDate);
    const workspaceId = getWorkspaceId(req);

    // Note: neon-http driver doesn't support transactions, so we use sequential inserts
    // with manual rollback on failure
    let mainRecordInserted = false;

    try {
      // Create the main record first
      await db.insert(inspectionRecords).values({
        id: recordId,
        code: newCode,
        customerId: convertedCustomerId || null,
        customerName: customerName || null,
        factoryIds: JSON.stringify(convertedFactoryIds),
        inspectionDate: parentInspectionDate,
        workspaceId,
      });
      mainRecordInserted = true;

      // Create inspection items - if this fails, rollback main record
      if (items && items.length > 0) {
        await db.insert(inspectionItems).values(
          items.map((item: any) => ({
            id: crypto.randomUUID(),
            recordId,
            // Fallback to parent record's inspectionDate if not provided
            inspectionDate: item.inspectionDate ? new Date(item.inspectionDate) : parentInspectionDate,
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
            metalCheck: item.metalCheck || 0,
          }))
        );
      }

      // Create daily report
      if (reports) {
        await db.insert(dailyReports).values({
          id: crypto.randomUUID(),
          recordId,
          specifications: reports.specifications || 0,
          accessories: reports.accessories || 0,
          appearance: reports.appearance || 0,
          fabric: reports.fabric || 0,
          dirty: reports.dirty || 0,
          seamDefect: reports.seamDefect || 0,
          other: reports.other || 0,
          metalCheck: reports.metalCheck || 0,
        });
      }

      // Create productivity tracking
      if (productivity && productivity.length > 0) {
        for (const entry of productivity) {
          await db.insert(productivityTracking).values({
            id: crypto.randomUUID(),
            recordId,
            recordDate: new Date(entry.recordDate),
            factoryId: entry.factoryId || null,
            qcQuantity: parseInt(entry.qcQuantity) || 0,
            transitQuantity: parseInt(entry.transitQuantity) || 0,
            ot: parseInt(entry.ot) || 0,
          });
        }
      }
    } catch (err) {
      // Manual rollback: delete main record if it was inserted
      if (mainRecordInserted) {
        try {
          await db.delete(inspectionRecords).where(eq(inspectionRecords.id, recordId));
        } catch (deleteErr) {
          console.error('Failed to rollback main record:', deleteErr);
        }
      }
      throw err;
    }

    res.status(201).json({ id: recordId, code: newCode, customerId: convertedCustomerId, factoryIds: JSON.stringify(convertedFactoryIds), inspectionDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create inspection record', details: err instanceof Error ? err.message : String(err) });
  }
});

// PUT /api/inspection-records/:id - Update record + child data
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    const workspaceId = getWorkspaceId(req);

    // Convert byte array string to UUID if needed (Neon driver bug)
    if (isByteArrayString(id)) {
      id = convertByteArrayToUuid(id);
    }

    // Workspace validation: check record belongs to user's workspace
    if (workspaceId) {
      const [existing] = await db.select({ workspaceId: inspectionRecords.workspaceId })
        .from(inspectionRecords)
        .where(eq(inspectionRecords.id, id))
        .limit(1);
      if (!existing) {
        res.status(404).json({ error: 'Inspection record not found' });
        return;
      }
      if (existing.workspaceId !== workspaceId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const { customerId, customerName, factoryIds, inspectionDate, items, reports, productivity } = req.body;

    // Derive factoryIds from productivity entries if not explicitly provided
    const derivedFactoryIds = factoryIds && factoryIds.length > 0
      ? factoryIds
      : [...new Set((productivity || []).map((p: any) => p.factoryId).filter(Boolean))];

    // Convert customerId if it's a byte array string (Neon driver bug)
    const convertedCustomerId = isByteArrayString(customerId)
      ? convertByteArrayToUuid(customerId)
      : customerId;

    // Convert factoryIds if they are byte array strings
    const convertedFactoryIds = (derivedFactoryIds || []).map((fid: string) =>
      isByteArrayString(fid) ? convertByteArrayToUuid(fid) : fid
    );

    // Update main record
    const updateResult = await db.update(inspectionRecords)
      .set({
        customerId: convertedCustomerId || null,
        customerName: customerName || null,
        factoryIds: JSON.stringify(convertedFactoryIds),
        inspectionDate: new Date(inspectionDate),
        updatedAt: new Date(),
      })
      .where(eq(inspectionRecords.id, id))
      .returning({ id: inspectionRecords.id });

    if (!updateResult || updateResult.length === 0) {
      res.status(404).json({ error: 'Inspection record not found' });
      return;
    }

    // Delete and recreate child data
    await db.delete(inspectionItems).where(eq(inspectionItems.recordId, id));
    if (items && items.length > 0) {
      await db.insert(inspectionItems).values(
        items.map((item: any) => ({
          id: crypto.randomUUID(),
          recordId: id,
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
          metalCheck: item.metalCheck || 0,
        }))
      );
    }

    await db.delete(dailyReports).where(eq(dailyReports.recordId, id));
    if (reports) {
      await db.insert(dailyReports).values({
        id: crypto.randomUUID(),
        recordId: id,
        specifications: reports.specifications || 0,
        accessories: reports.accessories || 0,
        appearance: reports.appearance || 0,
        fabric: reports.fabric || 0,
        dirty: reports.dirty || 0,
        seamDefect: reports.seamDefect || 0,
        other: reports.other || 0,
        metalCheck: reports.metalCheck || 0,
      });
    }

    await db.delete(productivityTracking).where(eq(productivityTracking.recordId, id));
    if (productivity && productivity.length > 0) {
      for (const entry of productivity) {
        await db.insert(productivityTracking).values({
          id: crypto.randomUUID(),
          recordId: id,
          recordDate: new Date(entry.recordDate),
          factoryId: entry.factoryId || null,
          qcQuantity: parseInt(entry.qcQuantity) || 0,
          transitQuantity: parseInt(entry.transitQuantity) || 0,
          ot: parseInt(entry.ot) || 0,
        });
      }
    }

    res.json({ success: true, id: updateResult[0]?.id || id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update inspection record', details: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/inspection-records/all - Delete ALL records and cascade children
router.delete('/all', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // Delete children first (cascade should handle this, but being explicit)
    await db.delete(productivityTracking);
    await db.delete(dailyReports);
    await db.delete(inspectionItems);
    await db.delete(inspectionRecords);

    res.json({ success: true, message: 'All inspection records deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete all inspection records', details: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/inspection-records/:id - Delete record (cascade)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    const workspaceId = getWorkspaceId(req);

    // Convert byte array string to UUID if needed (Neon driver bug)
    if (isByteArrayString(id)) {
      id = convertByteArrayToUuid(id);
    }

    // Check if record exists and validate workspace
    const existing = await db.select({ id: inspectionRecords.id, workspaceId: inspectionRecords.workspaceId })
      .from(inspectionRecords)
      .where(eq(inspectionRecords.id, id))
      .limit(1);

    if (!existing || existing.length === 0) {
      res.status(404).json({ error: 'Inspection record not found' });
      return;
    }

    // Workspace validation
    if (workspaceId && existing[0].workspaceId !== workspaceId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Delete children first (cascade should handle this, but being explicit)
    await db.delete(inspectionItems).where(eq(inspectionItems.recordId, id));
    await db.delete(dailyReports).where(eq(dailyReports.recordId, id));
    await db.delete(productivityTracking).where(eq(productivityTracking.recordId, id));

    await db.delete(inspectionRecords).where(eq(inspectionRecords.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete inspection record', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;