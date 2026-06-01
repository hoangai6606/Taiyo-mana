import type { InspectionRecord, InspectionItem } from './database.types';

const SIZE_ORDER = ['SS', 'S', 'M', 'L', 'LL', 'EL', '3L', '4L', '5L', '6L', '7L', '8L'];
const NUM_COLS = 29;

// Column indices (0-based)
export const COL = {
  CODE: 0, BRAND: 1, NAME: 2, COLOR: 3, SIZE: 4,
  // Kiem Hang group (14 cols)
  INSPECT_QTY: 5, PASSED_QTY: 6, DEFECTIVE_QTY: 7,
  SPEC: 8, ACC: 9, APP: 10, FAB: 11, DIRTY: 12, SEAM: 13, PRINT_DEFECT: 14,
  SOLE_DEFECT: 15, SCRATCH_DEFECT: 16, OTHER: 17,
  METAL: 18,
  // Tai kiem group (6 cols)
  REINSPECT_QTY: 19, TK_PASSED: 20, TK_FAILED: 21,
  TK_SPEC: 22, TK_ACC: 23, TK_APP: 24,
  // So luong group (4 cols)
  TOTAL_EXPORT: 25,
  RATE: 26,
  ORDER_SL: 27,
  PARKING_LIST: 28,
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
  print: number;
  sole: number;
  scratch: number;
  metal: number;
  defectiveQty: number;
  rate: number;
  orderSl: number;
  // Reinspection fields (new format)
  tkPassed: number;
  tkFailed: number;
  tkSpec: string;
  tkAcc: string;
  tkApp: string;
  tkPrint: number;
  tkSole: number;
  tkScratch: number;
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
    spec: 0, acc: 0, app: 0, fab: 0, dirty: 0, seam: 0, other: 0, print: 0, sole: 0, scratch: 0, metal: 0, defectiveQty: 0, rate: 0,
    tkPassed: 0, tkFailed: 0, tkSpec: '', tkAcc: '', tkApp: '', tkPrint: 0, tkSole: 0, tkScratch: 0,
    orderSl: 0,
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
  a.print += b.print;
  a.sole += b.sole;
  a.scratch += b.scratch;
  a.metal += b.metal;
  a.defectiveQty += b.defectiveQty;
  a.tkPassed += b.tkPassed;
  a.tkFailed += b.tkFailed;
  a.tkPrint += b.tkPrint;
  a.tkSole += b.tkSole;
  a.tkScratch += b.tkScratch;
  a.orderSl += b.orderSl;
}

export function calcRate(v: VRow): number {
  const total = v.spec + v.acc + v.app + v.fab + v.dirty + v.seam + v.other + v.print + v.sole + v.scratch + v.metal;
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

      // Per-variant format detection: check if THIS variant has reinspection data
      const isNewFormatVariant = vItems.some(i =>
        (i.reinspectQuantity != null && i.reinspectQuantity > 0) ||
        (i.reinspectSpecifications != null && i.reinspectSpecifications !== '') ||
        (i.reinspectAccessories != null && i.reinspectAccessories !== '') ||
        (i.reinspectAppearance != null && i.reinspectAppearance !== '')
      );

      if (isNewFormatVariant) {
        // New format: each item has both inspection and reinspection data in separate columns
        const sum = (fn: (i: InspectionItem) => number) => vItems.reduce((a, i) => a + fn(i), 0);
        const concat = (fn: (i: InspectionItem) => string) =>
          vItems.map(fn).filter(s => s && s.trim()).join('; ');

        const inspectQty = sum(i => i.inspectedQuantity || 0);
        const reinspectQty = sum(i => i.reinspectQuantity || 0);

        const spec = sum(i => i.specifications || 0);
        const acc = sum(i => i.accessories || 0);
        const app = sum(i => i.appearance || 0);
        const fab = sum(i => i.fabric || 0);
        const dirty = sum(i => i.dirty || 0);
        const seam = sum(i => i.seamDefect || 0);
        const other = sum(i => i.other || 0);
        const print = sum(i => i.printDefect || 0);
        const sole = sum(i => i.soleDefect || 0);
        const scratch = sum(i => i.scratchDefect || 0);
        const metal = sum(i => i.metalCheck || 0);

        const totalDefects = spec + acc + app + fab + dirty + seam + other + print + sole + scratch + metal;
        const rate = inspectQty > 0
          ? Math.round(totalDefects / inspectQty * 10000) / 100
          : 0;

        const passedQty = sum(i => i.passedQuantity || 0);
        const tkPassed = sum(i => i.reinspectPassed || 0);
        const tkFailed = sum(i => i.reinspectFailed || 0);
        const v: Variant = {
          color, size,
          orderQty: inspectQty + reinspectQty,
          inspectQty, reinspectQty,
          passedQty,
          passedKk: passedQty + tkPassed,
          totalExport: 0,
          defectiveQty: sum(i => i.defectiveQuantity || 0),
          spec, acc, app, fab, dirty, seam, other, print, sole, scratch, metal, rate,
          tkPassed,
          tkFailed,
          orderSl: passedQty + tkPassed + tkFailed,
          tkSpec: concat(i => i.reinspectSpecifications || ''),
          tkAcc: concat(i => i.reinspectAccessories || ''),
          tkApp: concat(i => i.reinspectAppearance || ''),
          tkPrint: sum(i => i.reinspectPrintDefect || 0),
          tkSole: sum(i => i.reinspectSoleDefect || 0),
          tkScratch: sum(i => i.reinspectScratchDefect || 0),
        };

        variants.push(v);
        addTo(gt, v);
      } else {
        // Old format: split by inspectionContent (KIEM / TAIKIEM)
        const kiem = vItems.filter(i => i.inspectionContent !== 'TAIKIEM');
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

        const passedQty = s(kiem, i => i.passedQuantity || 0);
        const v: Variant = {
          color, size,
          orderQty: inspectQty + reinspectQty,
          inspectQty, reinspectQty,
          passedQty,
          passedKk: passedQty,
          totalExport: 0,
          defectiveQty: s(kiem, i => i.defectiveQuantity || 0),
          spec, acc, app, fab, dirty, seam, other, print: 0, sole: 0, scratch: 0, metal, rate,
          tkPassed: 0, tkFailed: 0, tkSpec: '', tkAcc: '', tkApp: '', tkPrint: 0, tkSole: 0, tkScratch: 0,
          orderSl: passedQty,
        };

        variants.push(v);
        addTo(gt, v);
      }
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

export interface ProductivityEntry {
  recordDate: string;
  factoryName: string;
  qcQuantity: number;
  transitQuantity: number;
  ot: number;
}

export async function exportInspectionReportFromGroups(
  groups: ProductGroup[],
  meta: { customerName: string; factoryNames: string; dateStr: string; code: string },
  productivity?: ProductivityEntry[],
): Promise<void> {
  const XLSXModule = await import('xlsx-js-style');
  const XLSX = XLSXModule.default || XLSXModule;
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
  h1[COL.INSPECT_QTY] = 'KIỂM HÀNG';
  h1[COL.REINSPECT_QTY] = 'TÁI KIỂM';
  h1[COL.TOTAL_EXPORT] = 'Số lượng';
  aoa.push(h1);

  // Row 3: Detail headers
  const detailRow: any[] = Array(NUM_COLS).fill('');
  detailRow[COL.INSPECT_QTY] = 'SL kiểm lần 1';
  detailRow[COL.PASSED_QTY] = 'Hàng A1';
  detailRow[COL.DEFECTIVE_QTY] = 'Hàng B1';
  detailRow[COL.SPEC] = 'Thông số';
  detailRow[COL.ACC] = 'Phụ liệu';
  detailRow[COL.APP] = 'Ngoại quan';
  detailRow[COL.FAB] = 'Vải';
  detailRow[COL.DIRTY] = 'Dơ';
  detailRow[COL.SEAM] = 'Lỗi may';
  detailRow[COL.OTHER] = 'Khác';
  detailRow[COL.PRINT_DEFECT] = 'Lỗi in';
  detailRow[COL.SOLE_DEFECT] = 'Lỗi sole';
  detailRow[COL.SCRATCH_DEFECT] = 'Lỗi trầy';
  detailRow[COL.METAL] = 'Kiểm kim';
  detailRow[COL.REINSPECT_QTY] = 'Tổng Tái';
  detailRow[COL.TK_PASSED] = 'Hàng A2';
  detailRow[COL.TK_FAILED] = 'Hàng B2';
  detailRow[COL.TK_SPEC] = 'Thông số';
  detailRow[COL.TK_ACC] = 'Phụ liệu';
  detailRow[COL.TK_APP] = 'Ngoại quan';
  detailRow[COL.TOTAL_EXPORT] = 'TỔNG XUẤT';
  detailRow[COL.RATE] = 'Tỉ lệ lỗi';
  detailRow[COL.ORDER_SL] = 'SL order';
  detailRow[COL.PARKING_LIST] = 'Parking list';
  aoa.push(detailRow);

  // Data rows
  const groupTotalRows: number[] = [];
  const globalTotal = zeroVRow();
  let rowIdx = 4;

  for (const g of groups) {
    for (const v of g.variants) {
      const row: any[] = Array(NUM_COLS).fill('');
      row[COL.CODE] = g.code;
      row[COL.BRAND] = g.brand;
      row[COL.NAME] = g.name;
      row[COL.COLOR] = v.color;
      row[COL.SIZE] = v.size;
      row[COL.TOTAL_EXPORT] = v.totalExport;
      row[COL.INSPECT_QTY] = v.inspectQty;
      row[COL.PASSED_QTY] = v.passedQty;
      row[COL.DEFECTIVE_QTY] = v.defectiveQty;
      row[COL.SPEC] = v.spec;
      row[COL.ACC] = v.acc;
      row[COL.APP] = v.app;
      row[COL.FAB] = v.fab;
      row[COL.DIRTY] = v.dirty;
      row[COL.SEAM] = v.seam;
      row[COL.OTHER] = v.other;
      row[COL.PRINT_DEFECT] = v.print;
      row[COL.SOLE_DEFECT] = v.sole;
      row[COL.SCRATCH_DEFECT] = v.scratch;
      row[COL.METAL] = v.metal;
      row[COL.RATE] = v.rate;
      row[COL.ORDER_SL] = v.orderSl;
      row[COL.PARKING_LIST] = v.passedKk;
      row[COL.REINSPECT_QTY] = v.reinspectQty;
      row[COL.TK_PASSED] = v.tkPassed;
      row[COL.TK_FAILED] = v.tkFailed;
      row[COL.TK_SPEC] = v.tkSpec;
      row[COL.TK_ACC] = v.tkAcc;
      row[COL.TK_APP] = v.tkApp;
      aoa.push(row);
      addTo(globalTotal, v);
      rowIdx++;
    }
    // Group total row
    const totalRow: any[] = Array(NUM_COLS).fill('');
    totalRow[COL.CODE] = 'Tổng';
    totalRow[COL.TOTAL_EXPORT] = g.total.totalExport;
    totalRow[COL.INSPECT_QTY] = g.total.inspectQty;
    totalRow[COL.PASSED_QTY] = g.total.passedQty;
    totalRow[COL.DEFECTIVE_QTY] = g.total.defectiveQty;
    totalRow[COL.SPEC] = g.total.spec;
    totalRow[COL.ACC] = g.total.acc;
    totalRow[COL.APP] = g.total.app;
    totalRow[COL.FAB] = g.total.fab;
    totalRow[COL.DIRTY] = g.total.dirty;
    totalRow[COL.SEAM] = g.total.seam;
    totalRow[COL.OTHER] = g.total.other;
    totalRow[COL.PRINT_DEFECT] = g.total.print;
    totalRow[COL.SOLE_DEFECT] = g.total.sole;
    totalRow[COL.SCRATCH_DEFECT] = g.total.scratch;
    totalRow[COL.METAL] = g.total.metal;
    totalRow[COL.RATE] = g.total.rate;
    totalRow[COL.ORDER_SL] = g.total.orderSl;
    totalRow[COL.PARKING_LIST] = g.total.passedKk;
    totalRow[COL.REINSPECT_QTY] = g.total.reinspectQty;
    totalRow[COL.TK_PASSED] = g.total.tkPassed;
    totalRow[COL.TK_FAILED] = g.total.tkFailed;
    totalRow[COL.TK_SPEC] = g.total.tkSpec;
    totalRow[COL.TK_ACC] = g.total.tkAcc;
    totalRow[COL.TK_APP] = g.total.tkApp;
    aoa.push(totalRow);
    groupTotalRows.push(rowIdx);
    rowIdx++;
  }

  // Grand total
  globalTotal.rate = calcRate(globalTotal);
  const grandTotalRow = rowIdx;
  const grandRow: any[] = Array(NUM_COLS).fill('');
  grandRow[COL.CODE] = 'Tổng Cộng';
  grandRow[COL.TOTAL_EXPORT] = globalTotal.totalExport;
  grandRow[COL.INSPECT_QTY] = globalTotal.inspectQty;
  grandRow[COL.PASSED_QTY] = globalTotal.passedQty;
  grandRow[COL.DEFECTIVE_QTY] = globalTotal.defectiveQty;
  grandRow[COL.SPEC] = globalTotal.spec;
  grandRow[COL.ACC] = globalTotal.acc;
  grandRow[COL.APP] = globalTotal.app;
  grandRow[COL.FAB] = globalTotal.fab;
  grandRow[COL.DIRTY] = globalTotal.dirty;
  grandRow[COL.SEAM] = globalTotal.seam;
  grandRow[COL.OTHER] = globalTotal.other;
  grandRow[COL.PRINT_DEFECT] = globalTotal.print;
  grandRow[COL.SOLE_DEFECT] = globalTotal.sole;
  grandRow[COL.SCRATCH_DEFECT] = globalTotal.scratch;
  grandRow[COL.METAL] = globalTotal.metal;
  grandRow[COL.RATE] = globalTotal.rate;
  grandRow[COL.ORDER_SL] = globalTotal.orderSl;
  grandRow[COL.PARKING_LIST] = globalTotal.passedKk;
  grandRow[COL.REINSPECT_QTY] = globalTotal.reinspectQty;
  grandRow[COL.TK_PASSED] = globalTotal.tkPassed;
  grandRow[COL.TK_FAILED] = globalTotal.tkFailed;
  grandRow[COL.TK_SPEC] = globalTotal.tkSpec;
  grandRow[COL.TK_ACC] = globalTotal.tkAcc;
  grandRow[COL.TK_APP] = globalTotal.tkApp;
  aoa.push(grandRow);

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
    // "KIEM HANG" spans INSPECT_QTY to METAL (14 cols)
    { s: { r: 2, c: COL.INSPECT_QTY }, e: { r: 2, c: COL.METAL } },
    // "TÁI KIỂM" spans REINSPECT_QTY to TK_APP (6 cols)
    { s: { r: 2, c: COL.REINSPECT_QTY }, e: { r: 2, c: COL.TK_APP } },
    // "So luong" spans TOTAL_EXPORT to PARKING_LIST (4 cols)
    { s: { r: 2, c: COL.TOTAL_EXPORT }, e: { r: 2, c: COL.PARKING_LIST } },
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
    { wch: 13 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
    { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 10 },
    { wch: 12 }, { wch: 10 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 14 },
  ];

  // ── Styles ──
  applyStyles(XLSX, ws, aoa.length, groupTotalRows, grandTotalRow);

  // ── Write file ──
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');

  // ── Productivity sheet (Part C) ──
  if (productivity && productivity.length > 0) {
    const pAoa: any[][] = [];

    // Total inspected across all groups
    const totalInspected = groups.reduce((s, g) => s + g.total.inspectQty + g.total.reinspectQty, 0);

    // Title
    pAoa.push(['THEO DÕI NĂNG SUẤT', '', '', '', '', '']);

    // Info row
    pAoa.push([`Mã phiếu: ${meta.code}`, '', `Ngày: ${meta.dateStr}`, '', `Nhà máy: ${meta.factoryNames}`, '']);

    // Header
    pAoa.push(['Ngày', 'Nhà máy', 'SL QC', 'SL Chuyển', 'OT', 'Năng suất QC/ngày']);

    // Data rows
    let totalQc = 0, totalTransit = 0, totalOt = 0;
    for (const p of productivity) {
      totalQc += p.qcQuantity || 0;
      totalTransit += p.transitQuantity || 0;
      totalOt += p.ot || 0;
      const qcQty = p.qcQuantity || 0;
      const ns = qcQty > 0 ? Math.round(totalInspected / qcQty * 100) / 100 : '';
      pAoa.push([p.recordDate, p.factoryName || '', p.qcQuantity || 0, p.transitQuantity || 0, p.ot || 0, ns]);
    }

    // Total row
    pAoa.push(['Tổng cộng', '', totalQc, totalTransit, totalOt, '-']);

    const pWs = XLSX.utils.aoa_to_sheet(pAoa);

    // Styles for productivity sheet
    const pCols = 6;
    const pBorder = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };

    // Title style
    const pTitleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
    if (pWs[pTitleRef]) {
      pWs[pTitleRef].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center' },
      };
    }

    // Header style (row 2)
    const pHeaderStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '4472C4' }, patternType: 'solid' },
      border: pBorder,
      alignment: { horizontal: 'center' as const },
    };
    for (let c = 0; c < pCols; c++) {
      const ref = XLSX.utils.encode_cell({ r: 2, c });
      if (pWs[ref]) pWs[ref].s = pHeaderStyle;
    }

    // Data rows style
    const pTotalRow = pAoa.length - 1;
    for (let r = 3; r < pAoa.length; r++) {
      const isTotal = r === pTotalRow;
      const style = isTotal
        ? { font: { bold: true }, fill: { fgColor: { rgb: 'D9D9D9' }, patternType: 'solid' as const }, border: pBorder }
        : { border: pBorder };
      for (let c = 0; c < pCols; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (pWs[ref]) pWs[ref].s = style;
      }
    }

    // Merges
    pWs['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: pCols - 1 } },
    ];

    pWs['!cols'] = [
      { wch: 14 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, pWs, 'Năng Suất');
  }

  const dateFile = meta.dateStr.replace(/\//g, '-');
  XLSX.writeFile(wb, `BaoCaoKiemHang_${meta.code}_${dateFile}.xlsx`);
}

// ── Backward-compatible wrapper ──

export async function exportInspectionReport(record: InspectionRecord): Promise<void> {
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
  }, undefined);
}

// ── Internal styles ──

function applyStyles(
  XLSX: any,
  ws: any,
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
