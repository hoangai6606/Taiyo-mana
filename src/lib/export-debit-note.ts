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
  return (Math.round(n * 100) / 100).toLocaleString('vi-VN');
}

export async function exportDebitNote(note: DebitNote): Promise<void> {
  const XLSXModule = await import('xlsx-js-style');
  const XLSX = XLSXModule.default || XLSXModule;
  const items = note.items || [];
  const goodsItems = items.filter(i => i.itemType === 'goods');
  const qcItems = items.filter(i => i.itemType === 'qc');
  const otItems = items.filter(i => i.itemType === 'ot');

  const goodsTotal = goodsItems.reduce((s, i) => s + Number(i.lineTotal), 0);
  const qcTotal = qcItems.reduce((s, i) => s + Number(i.lineTotal), 0);
  const otTotal = otItems.reduce((s, i) => s + Number(i.lineTotal), 0);
  const travel = note.travelAllowance || 0;
  const travelDays = Number(note.travelDays) || 0;
  const travelUnitPrice = Number(note.travelUnitPrice) || 0;
  const vehicleCount = Number(note.vehicleCount) || 0;
  const travelHoursQty = Number(note.travelHoursQty) || 0;
  const travelHoursTime = Number(note.travelHoursTime) || 0;
  const travelHoursUnitPrice = Number(note.travelHoursUnitPrice) || 0;
  const travelHoursTotal = travelHoursQty * travelHoursTime * travelHoursUnitPrice;
  const grandTotal = goodsTotal + qcTotal + otTotal + travel + travelHoursTotal;

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

  aoa.push(['STT', 'Mã hàng', 'Nội dung', 'Số lượng', 'Đơn giá', 'Thành tiền']);
  const goodsDataStart = rowIdx;
  rowIdx++;

  for (let i = 0; i < goodsItems.length; i++) {
    const it = goodsItems[i];
    aoa.push([i + 1, it.productCode || '', it.inspectionContent || '', it.quantity, it.unitPrice, it.lineTotal]);
    rowIdx++;
  }

  const goodsTotalRow = rowIdx;
  aoa.push(['', 'Tổng hàng hóa', '', '', '', goodsTotal]);
  rowIdx++;

  // Row: empty
  aoa.push([]);
  rowIdx++;

  // ─── QC + OT table ───
  aoa.push(['THEO QC + OT']);
  const qcHeaderRow = rowIdx;
  rowIdx++;

  aoa.push(['STT', 'Ngày', 'Số giờ QC', 'SL QC', 'Đơn giá QC', 'Thành tiền QC', 'Số giờ OT', 'SL OT', 'Đơn giá OT', 'Thành tiền OT']);
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
      qc?.hours || '',
      qc?.quantity || '',
      qc?.unitPrice || '',
      qc?.lineTotal || '',
      ot?.hours || '',
      ot?.quantity || '',
      ot?.unitPrice || '',
      ot?.lineTotal || '',
    ]);
    qcOtRows.push(rowIdx);
    rowIdx++;
    stt++;
  }

  const qcOtTotalRow = rowIdx;
  aoa.push(['', 'Tổng', '', '', '', qcTotal, '', '', '', otTotal]);
  rowIdx++;

  // Row: empty
  aoa.push([]);
  rowIdx++;

  // Travel allowance
  const travelRow = rowIdx;
  const travelDesc = travelDays > 0 && travelUnitPrice > 0 && vehicleCount > 0
    ? `${travelDays} ngày x ${fmt(travelUnitPrice)} đ x ${fmt(vehicleCount)} xe`
    : '';
  aoa.push(['Tiền đi đường:', travelDesc || '', '', '', '', travel]);
  rowIdx++;

  // Travel hours
  const travelHoursRow = rowIdx;
  const travelHoursDesc = travelHoursQty > 0 && travelHoursTime > 0 && travelHoursUnitPrice > 0
    ? `${fmt(travelHoursQty)} SL x ${fmt(travelHoursTime)} tg x ${fmt(travelHoursUnitPrice)} đ`
    : '';
  aoa.push(['Giờ đi đường:', travelHoursDesc || '', '', '', '', travelHoursTotal]);
  rowIdx++;

  // Grand total
  const grandRow = rowIdx;
  aoa.push(['TỔNG CỘNG:', '', '', '', '', grandTotal]);

  // ── Create worksheet ──
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ── Merges ──
  const merges: XLSX.Range[] = [
    // Title: merge full row
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    // Section headers: merge full row
    { s: { r: goodsHeaderRow, c: 0 }, e: { r: goodsHeaderRow, c: 5 } },
    { s: { r: qcHeaderRow, c: 0 }, e: { r: qcHeaderRow, c: 9 } },
    // Goods total: merge first 5 cols
    { s: { r: goodsTotalRow, c: 0 }, e: { r: goodsTotalRow, c: 4 } },
    // QC+OT total: merge first 5 cols
    { s: { r: qcOtTotalRow, c: 0 }, e: { r: qcOtTotalRow, c: 4 } },
    // Travel row: merge description cols (c1-c4)
    { s: { r: travelRow, c: 1 }, e: { r: travelRow, c: 4 } },
    // Travel hours row: merge description cols (c1-c4)
    { s: { r: travelHoursRow, c: 1 }, e: { r: travelHoursRow, c: 4 } },
    // Grand total: merge first 5 cols
    { s: { r: grandRow, c: 0 }, e: { r: grandRow, c: 4 } },
  ];

  ws['!merges'] = merges;

  // Column widths
  ws['!cols'] = [
    { wch: 6 },   // STT
    { wch: 16 },  // Mã hàng / Ngày
    { wch: 14 },  // Nội dung
    { wch: 10 },  // Số giờ QC / Số lượng
    { wch: 12 },  // SL QC / Đơn giá
    { wch: 14 },  // Thành tiền QC
    { wch: 10 },  // Số giờ OT
    { wch: 10 },  // SL OT
    { wch: 12 },  // Đơn giá OT
    { wch: 14 },  // Thành tiền OT
  ];

  // ── Apply styles ──
  const maxCol = 10;

  // Title row
  const tRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[tRef]) {
    ws[tRef].s = { font: { bold: true, sz: 16 }, alignment: { horizontal: 'center' } };
  }

  // Section headers
  for (const secRow of [goodsHeaderRow, qcHeaderRow]) {
    const cols = secRow === goodsHeaderRow ? 6 : 10;
    for (let c = 0; c < cols; c++) {
      const ref = XLSX.utils.encode_cell({ r: secRow, c });
      if (ws[ref]) ws[ref].s = sectionHeaderStyle;
    }
  }

  // Table header rows
  for (const hdrRow of [goodsDataStart, qcDataStart]) {
    const cols = hdrRow === goodsDataStart ? 6 : 10;
    for (let c = 0; c < cols; c++) {
      const ref = XLSX.utils.encode_cell({ r: hdrRow, c });
      if (ws[ref]) ws[ref].s = headerStyle;
    }
  }

  // Goods data rows
  for (let r = goodsDataStart + 1; r < goodsTotalRow; r++) {
    for (let c = 0; c < 6; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) {
        ws[ref].s = {
          ...dataStyle,
          alignment: c >= 3 ? { horizontal: 'right' } : undefined,
        };
      }
    }
  }

  // Goods total row
  for (let c = 0; c < 6; c++) {
    const ref = XLSX.utils.encode_cell({ r: goodsTotalRow, c });
    if (ws[ref]) ws[ref].s = { ...totalStyle, alignment: c === 5 ? { horizontal: 'right' } : undefined };
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
  const travelRef5 = XLSX.utils.encode_cell({ r: travelRow, c: 5 });
  if (ws[travelRef0]) ws[travelRef0].s = { font: { bold: true, sz: 11 } };
  if (ws[travelRef1]) ws[travelRef1].s = { font: { sz: 11 } };
  if (ws[travelRef5]) ws[travelRef5].s = { font: { bold: true, sz: 11 }, alignment: { horizontal: 'right' } };

  // Travel hours row
  const thRef0 = XLSX.utils.encode_cell({ r: travelHoursRow, c: 0 });
  const thRef1 = XLSX.utils.encode_cell({ r: travelHoursRow, c: 1 });
  const thRef5 = XLSX.utils.encode_cell({ r: travelHoursRow, c: 5 });
  if (ws[thRef0]) ws[thRef0].s = { font: { bold: true, sz: 11 } };
  if (ws[thRef1]) ws[thRef1].s = { font: { sz: 11 } };
  if (ws[thRef5]) ws[thRef5].s = { font: { bold: true, sz: 11 }, alignment: { horizontal: 'right' } };

  // Grand total row
  for (let c = 0; c < maxCol; c++) {
    const ref = XLSX.utils.encode_cell({ r: grandRow, c });
    if (ws[ref]) ws[ref].s = grandTotalStyle;
  }
  // Override text color to white for grand total
  const grandRef = XLSX.utils.encode_cell({ r: grandRow, c: 0 });
  if (ws[grandRef]) ws[grandRef].s = { ...grandTotalStyle, font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } } };
  const grandValRef = XLSX.utils.encode_cell({ r: grandRow, c: 5 });
  if (ws[grandValRef]) ws[grandValRef].s = { ...grandTotalStyle, font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'right' } };

  // ── Write file ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Debit Note');
  const dateFile = dateStr.replace(/\//g, '-');
  XLSX.writeFile(wb, `DebitNote_${note.debitNo}_${dateFile}.xlsx`);
}
