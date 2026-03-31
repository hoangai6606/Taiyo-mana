import * as XLSX from 'xlsx-js-style';
import type { DebitNote, DebitNoteItem } from './database.types';

const border = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const headerStyle: XLSX.CellStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill: { fgColor: { rgb: '4472C4' }, patternType: 'solid' },
  border,
  alignment: { horizontal: 'center', vertical: 'center' },
};

const sectionHeaderStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 12 },
  border,
};

const dataStyle: XLSX.CellStyle = { border };

const totalStyle: XLSX.CellStyle = {
  font: { bold: true },
  fill: { fgColor: { rgb: 'D9D9D9' }, patternType: 'solid' },
  border,
};

const grandTotalStyle: XLSX.CellStyle = {
  font: { bold: true, sz: 13 },
  fill: { fgColor: { rgb: '4472C4' }, patternType: 'solid' },
  border,
  alignment: { horizontal: 'right' },
};

function fmt(n: number): string {
  return n.toLocaleString('vi-VN');
}

export function exportDebitNote(note: DebitNote): void {
  const items = note.items || [];
  const goodsItems = items.filter(i => i.itemType === 'goods');
  const qcItems = items.filter(i => i.itemType === 'qc');
  const otItems = items.filter(i => i.itemType === 'ot');

  const goodsTotal = goodsItems.reduce((s, i) => s + i.lineTotal, 0);
  const qcTotal = qcItems.reduce((s, i) => s + i.lineTotal, 0);
  const otTotal = otItems.reduce((s, i) => s + i.lineTotal, 0);
  const travel = note.travelAllowance || 0;
  const grandTotal = goodsTotal + qcTotal + otTotal + travel;

  const dateStr = new Date(note.createdAt).toLocaleDateString('vi-VN');
  const aoa: any[][] = [];
  let rowIdx = 0;

  // Row 0: Title
  aoa.push(['DEBIT NOTE']);
  rowIdx++;

  // Row 1: Info
  aoa.push([`Khách hàng: ${note.customerName || ''}`, `Mã DN: ${note.debitNo}`, `Ngày: ${dateStr}`]);
  rowIdx++;

  // Row 2: empty
  aoa.push([]);
  rowIdx++;

  // ─── Goods table ───
  aoa.push(['THEO HÀNG HÓA']);
  const goodsHeaderRow = rowIdx;
  rowIdx++;

  aoa.push(['STT', 'Mã hàng', 'Số lượng', 'Đơn giá', 'Thành tiền']);
  const goodsDataStart = rowIdx;
  rowIdx++;

  for (let i = 0; i < goodsItems.length; i++) {
    const it = goodsItems[i];
    aoa.push([i + 1, it.productCode || '', it.quantity, it.unitPrice, it.lineTotal]);
    rowIdx++;
  }

  const goodsTotalRow = rowIdx;
  aoa.push(['', 'Tổng hàng hóa', '', '', goodsTotal]);
  rowIdx++;

  // Row: empty
  aoa.push([]);
  rowIdx++;

  // ─── QC + OT table ───
  aoa.push(['THEO QC + OT']);
  const qcHeaderRow = rowIdx;
  rowIdx++;

  aoa.push(['STT', 'Ngày', 'SL QC', 'Đơn giá QC', 'Thành tiền QC', 'SL OT', 'Đơn giá OT', 'Thành tiền OT']);
  const qcDataStart = rowIdx;
  rowIdx++;

  // Merge QC and OT by date
  const dateMap = new Map<string, { qcItem?: DebitNoteItem; otItem?: DebitNoteItem }>();
  for (const qi of qcItems) {
    const key = qi.productCode || ''; // productCode holds date for QC/OT items
    const entry = dateMap.get(key) || {};
    entry.qcItem = qi;
    dateMap.set(key, entry);
  }
  for (const oi of otItems) {
    const key = oi.productCode || '';
    const entry = dateMap.get(key) || {};
    entry.otItem = oi;
    dateMap.set(key, entry);
  }

  let stt = 1;
  const qcOtRows: number[] = [];
  for (const [, entry] of dateMap) {
    const qc = entry.qcItem;
    const ot = entry.otItem;
    aoa.push([
      stt,
      qc?.productCode || ot?.productCode || '',
      qc?.quantity || '',
      qc?.unitPrice || '',
      qc?.lineTotal || '',
      ot?.quantity || '',
      ot?.unitPrice || '',
      ot?.lineTotal || '',
    ]);
    qcOtRows.push(rowIdx);
    rowIdx++;
    stt++;
  }

  const qcOtTotalRow = rowIdx;
  aoa.push(['', 'Tổng', '', '', qcTotal, '', '', otTotal]);
  rowIdx++;

  // Row: empty
  aoa.push([]);
  rowIdx++;

  // Travel allowance
  const travelRow = rowIdx;
  aoa.push(['Tiền đi đường:', travel]);
  rowIdx++;

  // Grand total
  const grandRow = rowIdx;
  aoa.push(['TỔNG CỘNG:', grandTotal]);

  // ── Create worksheet ──
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ── Merges ──
  const merges: XLSX.Range[] = [
    // Title: merge full row
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    // Section headers: merge full row
    { s: { r: goodsHeaderRow, c: 0 }, e: { r: goodsHeaderRow, c: 4 } },
    { s: { r: qcHeaderRow, c: 0 }, e: { r: qcHeaderRow, c: 7 } },
    // Goods total: merge first 4 cols
    { s: { r: goodsTotalRow, c: 0 }, e: { r: goodsTotalRow, c: 3 } },
    // QC+OT total: merge first 4 cols
    { s: { r: qcOtTotalRow, c: 0 }, e: { r: qcOtTotalRow, c: 3 } },
    // Travel row: no merge needed
    // Grand total: merge first col
    { s: { r: grandRow, c: 0 }, e: { r: grandRow, c: 3 } },
  ];

  ws['!merges'] = merges;

  // Column widths
  ws['!cols'] = [
    { wch: 6 },   // STT
    { wch: 16 },  // Mã hàng / Ngày
    { wch: 12 },  // SL
    { wch: 12 },  // Đơn giá
    { wch: 14 },  // Thành tiền
    { wch: 10 },  // SL OT
    { wch: 12 },  // Đơn giá OT
    { wch: 14 },  // Thành tiền OT
  ];

  // ── Apply styles ──
  const maxCol = 8;

  // Title row
  const tRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[tRef]) {
    ws[tRef].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
  }

  // Section headers
  for (const secRow of [goodsHeaderRow, qcHeaderRow]) {
    const cols = secRow === goodsHeaderRow ? 5 : 8;
    for (let c = 0; c < cols; c++) {
      const ref = XLSX.utils.encode_cell({ r: secRow, c });
      if (ws[ref]) ws[ref].s = sectionHeaderStyle;
    }
  }

  // Table header rows
  for (const hdrRow of [goodsDataStart, qcDataStart]) {
    const cols = hdrRow === goodsDataStart ? 5 : 8;
    for (let c = 0; c < cols; c++) {
      const ref = XLSX.utils.encode_cell({ r: hdrRow, c });
      if (ws[ref]) ws[ref].s = headerStyle;
    }
  }

  // Goods data rows
  for (let r = goodsDataStart + 1; r < goodsTotalRow; r++) {
    for (let c = 0; c < 5; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) {
        ws[ref].s = {
          ...dataStyle,
          alignment: c >= 2 ? { horizontal: 'right' } : undefined,
        };
      }
    }
  }

  // Goods total row
  for (let c = 0; c < 5; c++) {
    const ref = XLSX.utils.encode_cell({ r: goodsTotalRow, c });
    if (ws[ref]) ws[ref].s = { ...totalStyle, alignment: c === 4 ? { horizontal: 'right' } : undefined };
  }

  // QC+OT data rows
  for (const r of qcOtRows) {
    for (let c = 0; c < maxCol; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) {
        ws[ref].s = {
          ...dataStyle,
          alignment: c >= 2 ? { horizontal: 'right' } : undefined,
        };
      }
    }
  }

  // QC+OT total row
  for (let c = 0; c < maxCol; c++) {
    const ref = XLSX.utils.encode_cell({ r: qcOtTotalRow, c });
    if (ws[ref]) ws[ref].s = { ...totalStyle, alignment: c >= 4 ? { horizontal: 'right' } : undefined };
  }

  // Travel row
  const travelRef0 = XLSX.utils.encode_cell({ r: travelRow, c: 0 });
  const travelRef1 = XLSX.utils.encode_cell({ r: travelRow, c: 1 });
  if (ws[travelRef0]) ws[travelRef0].s = { font: { bold: true, sz: 11 } };
  if (ws[travelRef1]) ws[travelRef1].s = { font: { sz: 11 }, alignment: { horizontal: 'right' } };

  // Grand total row
  for (let c = 0; c < maxCol; c++) {
    const ref = XLSX.utils.encode_cell({ r: grandRow, c });
    if (ws[ref]) ws[ref].s = grandTotalStyle;
  }
  // Override text color to white for grand total
  const grandRef = XLSX.utils.encode_cell({ r: grandRow, c: 0 });
  if (ws[grandRef]) ws[grandRef].s = { ...grandTotalStyle, font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } } };
  const grandValRef = XLSX.utils.encode_cell({ r: grandRow, c: 4 });
  if (ws[grandValRef]) ws[grandValRef].s = { ...grandTotalStyle, font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'right' } };

  // ── Write file ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Debit Note');
  const dateFile = dateStr.replace(/\//g, '-');
  XLSX.writeFile(wb, `DebitNote_${note.debitNo}_${dateFile}.xlsx`);
}
