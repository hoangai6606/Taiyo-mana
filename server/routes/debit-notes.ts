import { Router, type Request, Response } from 'express';
import { db } from '../db.js';
import { neon } from '@neondatabase/serverless';
import { debitNotes, debitNoteItems, inspectionReports } from '../../drizzle/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { convertByteArrayToUuid, isByteArrayString } from '../utils/convertUuid.js';
import { getWorkspaceId } from '../utils/workspace.js';
import { authenticateToken } from '../auth/middleware.js';

// Separate neon instance for raw SQL (code generation, COUNT queries)
const sql = neon(process.env.DATABASE_URL || '');

const router = Router();

// GET /api/debit-notes - List all debit notes with customer name and items
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);

    let notes: any[] = [];
    try {
      const selectFields = {
        id: debitNotes.id,
        debitNo: debitNotes.debitNo,
        customerId: debitNotes.customerId,
        customerName: debitNotes.customerName,
        inspectionRecordId: debitNotes.inspectionRecordId,
        inspectionReportId: debitNotes.inspectionReportId,
        unitPriceGoods: debitNotes.unitPriceGoods,
        unitPriceQc: debitNotes.unitPriceQc,
        unitPriceOt: debitNotes.unitPriceOt,
        notes: debitNotes.notes,
        travelAllowance: debitNotes.travelAllowance,
        travelDays: debitNotes.travelDays,
        travelUnitPrice: debitNotes.travelUnitPrice,
        vehicleCount: debitNotes.vehicleCount,
        travelHoursQty: debitNotes.travelHoursQty,
        travelHoursTime: debitNotes.travelHoursTime,
        travelHoursUnitPrice: debitNotes.travelHoursUnitPrice,
        createdAt: debitNotes.createdAt,
        updatedAt: debitNotes.updatedAt,
        createdBy: debitNotes.createdBy,
      };

      if (workspaceId) {
        notes = await db.select(selectFields).from(debitNotes)
          .where(eq(debitNotes.workspaceId, workspaceId));
      } else if (workspaceId === null) {
        notes = await db.select(selectFields).from(debitNotes);
      }
    } catch (queryErr) {
      // Neon driver bug trên bảng rỗng — trả về []
      console.error('Debit notes query error (may be empty table):', queryErr);
    }

    // Fetch all items in 1 query instead of N+1
    const normalizedNoteIds = notes.map(n => {
      const nid = isByteArrayString(n.id) ? convertByteArrayToUuid(n.id) : n.id;
      return nid;
    });

    const allItems = normalizedNoteIds.length > 0
      ? await db.select().from(debitNoteItems)
          .where(inArray(debitNoteItems.debitNoteId, normalizedNoteIds))
      : [];

    // Group items by debitNoteId
    const itemsByNoteId = new Map<string, any[]>();
    for (const item of allItems) {
      const key = isByteArrayString(item.debitNoteId) ? convertByteArrayToUuid(item.debitNoteId) : item.debitNoteId;
      if (!itemsByNoteId.has(key)) itemsByNoteId.set(key, []);
      itemsByNoteId.get(key)!.push(item);
    }

    const notesWithItems = notes.map(r => {
      const normalizedId = isByteArrayString(r.id) ? convertByteArrayToUuid(r.id) : r.id;
      const normalizedCustomerId = isByteArrayString(r.customerId) ? convertByteArrayToUuid(r.customerId) : r.customerId;
      const normalizedInspectionRecordId = r.inspectionRecordId && isByteArrayString(r.inspectionRecordId)
        ? convertByteArrayToUuid(r.inspectionRecordId)
        : r.inspectionRecordId;
      const normalizedInspectionReportId = r.inspectionReportId && isByteArrayString(r.inspectionReportId)
        ? convertByteArrayToUuid(r.inspectionReportId)
        : r.inspectionReportId;

      return {
        ...r,
        id: normalizedId,
        customerId: normalizedCustomerId,
        inspectionRecordId: normalizedInspectionRecordId,
        inspectionReportId: normalizedInspectionReportId,
        items: itemsByNoteId.get(normalizedId) || [],
      };
    });

    res.json(notesWithItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch debit notes', details: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/debit-notes/:id - Get single debit note by ID with its items
router.get('/:id', async (req: Request, res: Response) => {
  try {
    let { id } = req.params;

    // Convert byte array string to UUID if needed (Neon driver bug)
    if (isByteArrayString(id)) {
      id = convertByteArrayToUuid(id);
    }

    const [note] = await db
      .select({
        id: debitNotes.id,
        debitNo: debitNotes.debitNo,
        customerId: debitNotes.customerId,
        customerName: debitNotes.customerName,
        inspectionRecordId: debitNotes.inspectionRecordId,
        inspectionReportId: debitNotes.inspectionReportId,
        unitPriceGoods: debitNotes.unitPriceGoods,
        unitPriceQc: debitNotes.unitPriceQc,
        unitPriceOt: debitNotes.unitPriceOt,
        notes: debitNotes.notes,
        travelAllowance: debitNotes.travelAllowance,
        travelDays: debitNotes.travelDays,
        travelUnitPrice: debitNotes.travelUnitPrice,
        vehicleCount: debitNotes.vehicleCount,
        travelHoursQty: debitNotes.travelHoursQty,
        travelHoursTime: debitNotes.travelHoursTime,
        travelHoursUnitPrice: debitNotes.travelHoursUnitPrice,
        createdAt: debitNotes.createdAt,
        updatedAt: debitNotes.updatedAt,
        createdBy: debitNotes.createdBy,
        workspaceId: debitNotes.workspaceId,
      })
      .from(debitNotes)
      .where(eq(debitNotes.id, id));

    if (!note) {
      res.status(404).json({ error: 'Debit note not found' });
      return;
    }

    // Workspace filtering for multi-tenant security
    const workspaceId = getWorkspaceId(req);
    if (workspaceId !== null && note.workspaceId !== workspaceId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    // Fetch all items for this debit note
    const items = await db.select().from(debitNoteItems).where(eq(debitNoteItems.debitNoteId, id));

    // Normalize IDs from byte array to UUID (Neon driver bug)
    const normalizedId = isByteArrayString(note.id) ? convertByteArrayToUuid(note.id) : note.id;
    const normalizedCustomerId = isByteArrayString(note.customerId) ? convertByteArrayToUuid(note.customerId) : note.customerId;
    const normalizedInspectionRecordId = note.inspectionRecordId && isByteArrayString(note.inspectionRecordId)
      ? convertByteArrayToUuid(note.inspectionRecordId)
      : note.inspectionRecordId;
    const normalizedInspectionReportId = note.inspectionReportId && isByteArrayString(note.inspectionReportId)
      ? convertByteArrayToUuid(note.inspectionReportId)
      : note.inspectionReportId;

    res.json({
      ...note,
      id: normalizedId,
      customerId: normalizedCustomerId,
      inspectionRecordId: normalizedInspectionRecordId,
      inspectionReportId: normalizedInspectionReportId,
      items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch debit note', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/debit-notes - Create a new debit note with items
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { customerId, customerName, inspectionRecordId, inspectionReportId, unitPriceGoods, unitPriceQc, unitPriceOt, notes, travelAllowance, travelDays, travelUnitPrice, vehicleCount, travelHoursQty, travelHoursTime, travelHoursUnitPrice, items } = req.body;

    // Generate UUID manually to avoid Neon driver RETURNING bug
    const noteId = crypto.randomUUID();

    // Auto-generate debit number: find max DN### code and increment
    // Workaround for Neon driver bug: COUNT(*)' works on empty tables but SELECT fails
    const countResult = await sql`SELECT COUNT(*) as cnt FROM debit_notes WHERE debit_no LIKE 'DN%'`;
    const hasRecords = parseInt(String((countResult as any)[0]?.cnt || '0'), 10) > 0;

    let nextNum = 1;
    if (hasRecords) {
      const maxCodeResult = await sql`SELECT debit_no FROM debit_notes WHERE debit_no LIKE 'DN%' ORDER BY debit_no DESC LIMIT 1`;
      if (maxCodeResult && (maxCodeResult as any).length > 0) {
        const lastCode = (maxCodeResult as any)[0].debit_no;
        const numPart = parseInt(lastCode.replace('DN', ''), 10);
        nextNum = numPart + 1;
      }
    }
    const newDebitNo = `DN${String(nextNum).padStart(3, '0')}`;

    // Convert customerId if it's a byte array string (Neon driver bug)
    const convertedCustomerId = customerId && isByteArrayString(customerId)
      ? convertByteArrayToUuid(customerId)
      : customerId;

    // Convert inspectionRecordId if it's a byte array string (Neon driver bug)
    const convertedInspectionRecordId = inspectionRecordId && isByteArrayString(inspectionRecordId)
      ? convertByteArrayToUuid(inspectionRecordId)
      : inspectionRecordId;

    // Convert inspectionReportId if it's a byte array string (Neon driver bug)
    const convertedInspectionReportId = inspectionReportId && isByteArrayString(inspectionReportId)
      ? convertByteArrayToUuid(inspectionReportId)
      : inspectionReportId;

    const workspaceId = getWorkspaceId(req);

    // Validate inspectionReportId belongs to same workspace
    if (convertedInspectionReportId && workspaceId) {
      const [report] = await db
        .select({ workspaceId: inspectionReports.workspaceId })
        .from(inspectionReports)
        .where(eq(inspectionReports.id, convertedInspectionReportId));
      if (!report) {
        res.status(404).json({ error: 'Inspection report not found' });
        return;
      }
      // Normalize workspaceId from DB (Neon driver byte array bug)
      const reportWorkspaceId = isByteArrayString(report.workspaceId as string)
        ? convertByteArrayToUuid(report.workspaceId as string)
        : report.workspaceId;
      if (reportWorkspaceId !== workspaceId) {
        res.status(403).json({ error: 'Inspection report does not belong to your workspace' });
        return;
      }
    }

    let mainRecordInserted = false;

    try {
      // Create the main debit note
      await db.insert(debitNotes).values({
        id: noteId,
        debitNo: newDebitNo,
        customerId: convertedCustomerId,
        customerName: customerName || '',
        inspectionRecordId: convertedInspectionRecordId,
        inspectionReportId: convertedInspectionReportId,
        unitPriceGoods: String(unitPriceGoods ?? 0),
        unitPriceQc: String(unitPriceQc ?? 0),
        unitPriceOt: String(unitPriceOt ?? 0),
        notes: notes || '',
        travelAllowance: String(travelAllowance ?? 0),
        travelDays: String(travelDays ?? 0),
        travelUnitPrice: String(travelUnitPrice ?? 0),
        vehicleCount: String(vehicleCount ?? 0),
        travelHoursQty: String(travelHoursQty ?? 0),
        travelHoursTime: String(travelHoursTime ?? 0),
        travelHoursUnitPrice: String(travelHoursUnitPrice ?? 0),
        workspaceId,
      });
      mainRecordInserted = true;

      // Create debit note items
      if (items && items.length > 0) {
        await db.insert(debitNoteItems).values(
          items.map((item: any) => ({
            id: crypto.randomUUID(),
            debitNoteId: noteId,
            productCode: item.productCode || '',
            size: item.size || '',
            quantity: item.quantity || 0,
            unitPrice: String(item.unitPrice ?? 0),
            lineTotal: String(item.lineTotal ?? 0),
            itemType: item.itemType || 'goods',
            hours: item.hours != null ? String(item.hours) : null,
            inspectionContent: item.inspectionContent || null,
          }))
        );
      }
    } catch (err) {
      // Manual rollback: delete main record if it was inserted
      if (mainRecordInserted) {
        try {
          await db.delete(debitNotes).where(eq(debitNotes.id, noteId));
        } catch (deleteErr) {
          console.error('Failed to rollback main record:', deleteErr);
        }
      }
      throw err;
    }

    res.status(201).json({
      id: noteId,
      debitNo: newDebitNo,
      customerId: convertedCustomerId,
      customerName,
      inspectionRecordId: convertedInspectionRecordId,
      inspectionReportId: convertedInspectionReportId,
      unitPriceGoods,
      unitPriceQc,
      unitPriceOt,
      notes,
      travelAllowance,
      travelDays,
      travelUnitPrice,
      vehicleCount,
      travelHoursQty,
      travelHoursTime,
      travelHoursUnitPrice,
      items,
    });
  } catch (err) {
    console.error('[POST /debit-notes] Error:', err);
    res.status(500).json({ error: 'Failed to create debit note', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
