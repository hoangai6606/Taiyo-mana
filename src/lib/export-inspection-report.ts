import * as XLSX from 'xlsx-js-style';
import type { InspectionRecord, InspectionItem } from './database.types';

const SIZE_ORDER = ['SS', 'S', 'M', 'L', 'LL', 'EL', '3L', '4L', '5L', '6L', '7L', '8L'];
const NUM_COLS = 20;

// Column indices (0-based)
export const COL = {
  CODE: 0, BRAND: 1, NAME: 2, COLOR: 3, SIZE: 4,
  ORDER_QTY: 5, INSPECT_QTY: 6, REINSPECT_QTY: 7, PASSED_QTY: 8,
  PASSED_KK: 9, TOTAL_EXPORT: 10,
  SPEC: 11, ACC: 12, APP: 13, FAB: 14, DIRTY: 15, SEAM: 16, OTHER: 17, METAL: 18,
  RATE: 19,
};

export interface VRow {
  orderQty: number;
  inspectQty: number;
  reinspectQty: number;
  passedQty: number;
  passedKk: number;
  totalExport: number;
  spec: number;
  acc: number;
  app: number;
  fab: number;
  dirty: number;
  seam: number;
  other: number;
  metal: number;
  rate: number;
}

export interface Variant extends VRow {
  color: string;
  size: string;
}

export interface ProductGroup {
  code: string;
  brand: string;
  name: string;
  variants: Variant[];
  total: VRow;
}

// ── Exported helpers ──

export function zeroVRow(): VRow {
  return {
    orderQty: 0, inspectQty: 0, reinspectQty: 0, passedQty: 0,
    passedKk: 0, totalExport: 0,
    spec: 0, acc: 0, app: 0, fab: 0, dirty: 0, seam: 0, other: 0, metal: 0, rate: 0,
  };
}

export function addTo(a: VRow, b: VRow): void {
  a.orderQty += b.orderQty;
  a.inspectQty += b.inspectQty;
  a.reinspectQty += b.reinspectQty;
  a.passedQty += b.passedQty;
  a.passedKk += b.passedKk;
  a.totalExport += b.totalExport;
  a.spec += b.spec;
  a.acc += b.acc;
  a.app += b.app;
  a.fab += b.fab;
  a.dirty += b.dirty;
  a.seam += b.seam;
  a.other += b.other;
  a.metal += b.metal;
}

export function calcRate(v: VRow): number {
  const total = v.spec + v.acc + v.app + v.fab + v.dirty + v.seam + v.other + v.metal;
  return v.inspectQty > 0
    ? Math.round(total / v.inspectQty * 10000) / 100
    : 0;
}

export function buildGroups(items: InspectionItem[]): ProductGroup[] {
  const byCode = new Map<string, InspectionItem[]>();
  for (const it of items) {
    const arr = byCode.get(it.productCode) || [];
    arr.push(it);
    byCode.set(it.productCode, arr);
  }

  const groups: ProductGroup[] = [];

  for (const code of [...byCode.keys()].sort()) {
    const gItems = byCode.get(code)!;

    const byVariant = new Map<string, InspectionItem[]>();
    for (const it of gItems) {
      const k = `${it.color}|||${it.size}`;
      const arr = byVariant.get(k) || [];
      arr.push(it);
      byVariant.set(k, arr);
    }

    // Sort variants: by color, then by size order
    const vKeys = [...byVariant.keys()].sort((a, b) => {
      const [cA, sA] = a.split('|||');
      const [cB, sB] = b.split('|||');
      const d = cA.localeCompare(cB);
      if (d !== 0) return d;
      const ai = SIZE_ORDER.indexOf(sA);
      const bi = SIZE_ORDER.indexOf(sB);
      if (ai < 0 && bi < 0) return sA.localeCompare(sB);
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });

    const variants: Variant[] = [];
    const gt = zeroVRow();

    for (const vk of vKeys) {
      const vItems = byVariant.get(vk)!;
      const [color, size] = vk.split('|||');

      const kiem = vItems.filter(i => i.inspectionContent === 'KIEM');
      const taikiem = vItems.filter(i => i.inspectionContent === 'TAIKIEM');
      const s = (arr: InspectionItem[], fn: (i: InspectionItem) => number) =>
        arr.reduce((a, i) => a + fn(i), 0);

      const inspectQty = s(kiem, i => i.inspectedQuantity || 0);
      const reinspectQty = s(taikiem, i => i.inspectedQuantity || 0);

      const spec = s(kiem, i => i.specifications || 0);
      const acc = s(kiem, i => i.accessories || 0);
      const app = s(kiem, i => i.appearance || 0);
      const fab = s(kiem, i => i.fabric || 0);
      const dirty = s(kiem, i => i.dirty || 0);
      const seam = s(kiem, i => i.seamDefect || 0);
      const other = s(kiem, i => i.other || 0);
      const metal = s(kiem, i => i.metalCheck || 0);

      const totalDefects = spec + acc + app + fab + dirty + seam + other + metal;
      const rate = inspectQty > 0
        ? Math.round(totalDefects / inspectQty * 10000) / 100
        : 0;

      const v: Variant = {
        color, size,
        orderQty: inspectQty + reinspectQty,
        inspectQty, reinspectQty,
        passedQty: s(kiem, i => i.passedQuantity || 0),
        passedKk: 0,
        totalExport: 0,
        spec, acc, app, fab, dirty, seam, other, metal, rate,
      };

      variants.push(v);
      addTo(gt, v);
    }

    gt.rate = calcRate(gt);
    groups.push({
      code,
      brand: gItems[0].brand,
      name: gItems[0].productName,
      variants,
      total: gt,
    });
  }

  return groups;
}

// ── Excel generation from groups ──

export function exportInspectionReportFromGroups(
  groups: ProductGroup[],
  meta: { customerName: string; factoryNames: string; dateStr: string; code: string },
): void {
  // ── Build AOA ──
  const aoa: any[][] = [];

  // Row 0: Title
  aoa.push(['BÁO CÁO KIỂM HÀNG', ...Array(NUM_COLS - 1).fill('')]);

  // Row 1: Info
  const info: any[] = Array(NUM_COLS).fill('');
  info[0] = `Khách hàng: ${meta.customerName}`;
  info[5] = `Nhà máy: ${meta.factoryNames}`;
  info[10] = `Ngày: ${meta.dateStr}`;
  info[15] = `Mã phiếu: ${meta.code}`;
  aoa.push(info);

  // Row 2: Group headers
  const h1: any[] = Array(NUM_COLS).fill('');
  h1[COL.CODE] = 'Mã hàng';
  h1[COL.BRAND] = 'Thương hiệu';
  h1[COL.NAME] = 'Tên hàng';
  h1[COL.COLOR] = 'Màu';
  h1[COL.SIZE] = 'Size';
  h1[COL.ORDER_QTY] = 'Số lượng';
  h1[COL.SPEC] = 'Chi tiết lỗi';
  h1[COL.RATE] = 'Tỉ lệ lỗi';
  aoa.push(h1);

  // Row 3: Detail headers
  aoa.push([
    '', '', '', '', '',
    'SL đơn hàng', 'SL kiểm hàng', 'SL tái kiểm', 'SL hàng đạt', 'SL hàng đạt KK', 'TỔNG XUẤT',
    'Thông số', 'Phụ liệu', 'Ngoại quan', 'Vải', 'Dơ', 'Lỗi may', 'Khác', 'Kiểm kim',
    '',
  ]);

  // Data rows
  const groupTotalRows: number[] = [];
  const globalTotal = zeroVRow();
  let rowIdx = 4;

  for (const g of groups) {
    for (const v of g.variants) {
      aoa.push([
        g.code, g.brand, g.name, v.color, v.size,
        v.orderQty, v.inspectQty, v.reinspectQty, v.passedQty, v.passedKk, v.totalExport,
        v.spec, v.acc, v.app, v.fab, v.dirty, v.seam, v.other, v.metal, v.rate,
      ]);
      addTo(globalTotal, v);
      rowIdx++;
    }
    // Group total row
    aoa.push([
      'Tổng', '', '', '', '',
      g.total.orderQty, g.total.inspectQty, g.total.reinspectQty, g.total.passedQty, g.total.passedKk, g.total.totalExport,
      g.total.spec, g.total.acc, g.total.app, g.total.fab, g.total.dirty, g.total.seam, g.total.other, g.total.metal, g.total.rate,
    ]);
    groupTotalRows.push(rowIdx);
    rowIdx++;
  }

  // Grand total
  globalTotal.rate = calcRate(globalTotal);
  const grandTotalRow = rowIdx;
  aoa.push([
    'Tổng Cộng', '', '', '', '',
    globalTotal.orderQty, globalTotal.inspectQty, globalTotal.reinspectQty, globalTotal.passedQty, globalTotal.passedKk, globalTotal.totalExport,
    globalTotal.spec, globalTotal.acc, globalTotal.app, globalTotal.fab, globalTotal.dirty, globalTotal.seam, globalTotal.other, globalTotal.metal, globalTotal.rate,
  ]);

  // ── Create worksheet ──
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // ── Merges ──
  const merges: XLSX.Range[] = [
    // Title
    { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } },
    // Info row: 4 blocks of 5 columns
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
    { s: { r: 1, c: 5 }, e: { r: 1, c: 9 } },
    { s: { r: 1, c: 10 }, e: { r: 1, c: 14 } },
    { s: { r: 1, c: 15 }, e: { r: 1, c: 19 } },
    // Header vertical merges (row 2-3)
    { s: { r: 2, c: COL.CODE }, e: { r: 3, c: COL.CODE } },
    { s: { r: 2, c: COL.BRAND }, e: { r: 3, c: COL.BRAND } },
    { s: { r: 2, c: COL.NAME }, e: { r: 3, c: COL.NAME } },
    { s: { r: 2, c: COL.COLOR }, e: { r: 3, c: COL.COLOR } },
    { s: { r: 2, c: COL.SIZE }, e: { r: 3, c: COL.SIZE } },
    // "Số lượng" spans F-K
    { s: { r: 2, c: COL.ORDER_QTY }, e: { r: 2, c: COL.TOTAL_EXPORT } },
    // "Chi tiết lỗi" spans L-S
    { s: { r: 2, c: COL.SPEC }, e: { r: 2, c: COL.METAL } },
    // "Tỉ lệ lỗi" vertical merge
    { s: { r: 2, c: COL.RATE }, e: { r: 3, c: COL.RATE } },
  ];

  // Data merges: product code / brand / name per group (variant rows only)
  let r = 4;
  for (const g of groups) {
    const n = g.variants.length;
    if (n > 1) {
      merges.push({ s: { r, c: COL.CODE }, e: { r: r + n - 1, c: COL.CODE } });
      merges.push({ s: { r, c: COL.BRAND }, e: { r: r + n - 1, c: COL.BRAND } });
      merges.push({ s: { r, c: COL.NAME }, e: { r: r + n - 1, c: COL.NAME } });
    }
    r += n + 1; // variants + total row
  }

  ws['!merges'] = merges;

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 8 }, { wch: 6 },
    { wch: 13 }, { wch: 13 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 10 },
    { wch: 12 },
  ];

  // ── Styles ──
  applyStyles(ws, aoa.length, groupTotalRows, grandTotalRow);

  // ── Write file ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');
  const dateFile = meta.dateStr.replace(/\//g, '-');
  XLSX.writeFile(wb, `BaoCaoKiemHang_${meta.code}_${dateFile}.xlsx`);
}

// ── Backward-compatible wrapper ──

export function exportInspectionReport(record: InspectionRecord): void {
  const items = record.items || [];
  if (items.length === 0) return;

  const groups = buildGroups(items);

  const dateStr = record.inspectionDate
    ? new Date(record.inspectionDate).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '';

  exportInspectionReportFromGroups(groups, {
    customerName: record.customerName || record.customerId,
    factoryNames: record.factoryNames || '',
    dateStr,
    code: record.code,
  });
}

// ── Internal styles ──

function applyStyles(
  ws: XLSX.WorkSheet,
  numRows: number,
  groupTotalRows: number[],
  grandTotalRow: number,
): void {
  const border = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  // Title
  const tRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[tRef]) {
    ws[tRef].s = {
      font: { bold: true, sz: 16 },
      alignment: { horizontal: 'center' },
    };
  }

  // Header rows (2-3): blue background, white bold text
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '4472C4' }, patternType: 'solid' },
    border,
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  };
  for (let r = 2; r <= 3; r++) {
    for (let c = 0; c < NUM_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) ws[ref].s = headerStyle;
    }
  }

  // Data rows: thin border
  const dataStyle = { border };

  // Group total rows: bold, light gray background
  const groupTotalStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: 'D9D9D9' }, patternType: 'solid' },
    border,
  };

  // Grand total row: bold, light blue background
  const grandTotalStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: 'BDD7EE' }, patternType: 'solid' },
    border,
  };

  for (let r = 4; r < numRows; r++) {
    const isGrandTotal = r === grandTotalRow;
    const isGroupTotal = groupTotalRows.includes(r);
    const style = isGrandTotal ? grandTotalStyle : isGroupTotal ? groupTotalStyle : dataStyle;

    for (let c = 0; c < NUM_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref]) ws[ref].s = style;
    }
  }
}
