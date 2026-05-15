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

    // Single query: notes + items via LEFT JOIN (1 HTTP round-trip instead of 2)
    let rows: any[];
    if (workspaceId) {
      rows = await sql`
        SELECT
          dn.id, dn.debit_no, dn.customer_id, dn.customer_name,
          dn.inspection_record_id, dn.inspection_report_id,
          dn.unit_price_goods, dn.unit_price_qc, dn.unit_price_ot,
          dn.notes, dn.travel_allowance, dn.travel_days, dn.travel_unit_price,
          dn.vehicle_count, dn.travel_hours_qty, dn.travel_hours_time,
          dn.travel_hours_unit_price, dn.custom_data, dn.workspace_id,
          dn.created_at, dn.updated_at, dn.created_by,
          di.id as item_id, di.debit_note_id as item_debit_note_id,
          di.product_code as item_product_code, di.size as item_size,
          di.quantity as item_quantity, di.unit_price as item_unit_price,
          di.line_total as item_line_total, di.item_type as item_item_type,
          di.hours as item_hours, di.inspection_content as item_inspection_content
        FROM debit_notes dn
        LEFT JOIN debit_note_items di ON di.debit_note_id = dn.id
        WHERE dn.workspace_id = ${workspaceId}
        ORDER BY dn.created_at DESC
      `;
    } else if (workspaceId === null) {
      rows = await sql`
        SELECT
          dn.id, dn.debit_no, dn.customer_id, dn.customer_name,
          dn.inspection_record_id, dn.inspection_report_id,
          dn.unit_price_goods, dn.unit_price_qc, dn.unit_price_ot,
          dn.notes, dn.travel_allowance, dn.travel_days, dn.travel_unit_price,
          dn.vehicle_count, dn.travel_hours_qty, dn.travel_hours_time,
          dn.travel_hours_unit_price, dn.custom_data, dn.workspace_id,
          dn.created_at, dn.updated_at, dn.created_by,
          di.id as item_id, di.debit_note_id as item_debit_note_id,
          di.product_code as item_product_code, di.size as item_size,
          di.quantity as item_quantity, di.unit_price as item_unit_price,
          di.line_total as item_line_total, di.item_type as item_item_type,
          di.hours as item_hours, di.inspection_content as item_inspection_content
        FROM debit_notes dn
        LEFT JOIN debit_note_items di ON di.debit_note_id = dn.id
        ORDER BY dn.created_at DESC
      `;
    } else {
      rows = [];
    }

    // Group rows into notes with items
    const noteMap = new Map<string, any>();
    for (const row of rows) {
      if (!noteMap.has(row.id)) {
        noteMap.set(row.id, {
          id: row.id,
          debitNo: row.debit_no,
          customerId: row.customer_id,
          customerName: row.customer_name,
          inspectionRecordId: row.inspection_record_id,
          inspectionReportId: row.inspection_report_id,
          unitPriceGoods: row.unit_price_goods,
          unitPriceQc: row.unit_price_qc,
          unitPriceOt: row.unit_price_ot,
          notes: row.notes,
          travelAllowance: row.travel_allowance,
          travelDays: row.travel_days,
          travelUnitPrice: row.travel_unit_price,
          vehicleCount: row.vehicle_count,
          travelHoursQty: row.travel_hours_qty,
          travelHoursTime: row.travel_hours_time,
          travelHoursUnitPrice: row.travel_hours_unit_price,
          customData: row.custom_data,
          workspaceId: row.workspace_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
          items: [],
        });
      }
      if (row.item_id) {
        noteMap.get(row.id)!.items.push({
          id: row.item_id,
          debitNoteId: row.item_debit_note_id,
          productCode: row.item_product_code,
          size: row.item_size,
          quantity: row.item_quantity,
          unitPrice: row.item_unit_price,
          lineTotal: row.item_line_total,
          itemType: row.item_item_type,
          hours: row.item_hours,
          inspectionContent: row.item_inspection_content,
        });
      }
    }

    res.json(Array.from(noteMap.values()));
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
        customData: debitNotes.customData,
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
    const { customerId, customerName, inspectionRecordId, inspectionReportId, unitPriceGoods, unitPriceQc, unitPriceOt, notes, travelAllowance, travelDays, travelUnitPrice, vehicleCount, travelHoursQty, travelHoursTime, travelHoursUnitPrice, customData, items } = req.body;

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
        customData: customData || null,
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
      customData,
      items,
    });
  } catch (err) {
    console.error('[POST /debit-notes] Error:', err);
    res.status(500).json({ error: 'Failed to create debit note', details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
