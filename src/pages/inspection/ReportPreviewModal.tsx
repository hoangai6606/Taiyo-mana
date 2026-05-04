import { useState, useMemo, useCallback } from 'react';
import { X, Download } from 'lucide-react';
import type { InspectionRecord } from '../../lib/database.types';
import NumberInput from '../../components/ui/NumberInput';
import {
  buildGroups,
  exportInspectionReportFromGroups,
  zeroVRow,
  addTo,
  calcRate,
  type ProductGroup,
  type Variant,
  type VRow,
} from '../../lib/export-inspection-report';

// Editable numeric fields
type EditableField = 'inspectQty' | 'reinspectQty' | 'passedQty' | 'passedKk' | 'totalExport' | 'defectiveQty'
  | 'spec' | 'acc' | 'app' | 'fab' | 'dirty' | 'seam' | 'other' | 'print' | 'sole' | 'scratch' | 'metal'
  | 'tkPassed' | 'tkFailed' | 'tkPrint' | 'tkSole' | 'tkScratch';

// Text fields for reinspection
type TextField = 'tkSpec' | 'tkAcc' | 'tkApp';

interface Props {
  record: InspectionRecord;
  onClose: () => void;
}

export default function ReportPreviewModal({ record, onClose }: Props) {
  const [groups, setGroups] = useState<ProductGroup[]>(() =>
    buildGroups(record.items || []),
  );

  const dateStr = record.inspectionDate
    ? new Date(record.inspectionDate).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '';

  // Grand total — recomputed from current group totals
  const grandTotal = useMemo<VRow>(() => {
    const gt = zeroVRow();
    for (const g of groups) {
      addTo(gt, g.total);
    }
    gt.rate = calcRate(gt);
    return gt;
  }, [groups]);

  const recalcGroup = useCallback((draft: ProductGroup[], gi: number): ProductGroup[] => {
    return draft.map((g, idx) => {
      if (idx !== gi) return g;
      const gt = zeroVRow();
      for (const v of g.variants) {
        addTo(gt, v);
      }
      gt.rate = calcRate(gt);
      return { ...g, total: gt };
    });
  }, []);

  const handleChange = useCallback(
    (gi: number, vi: number, field: EditableField, raw: string) => {
      const val = parseInt(raw, 10) || 0;
      setGroups(prev => {
        const draft = prev.map((g, idx) => {
          if (idx !== gi) return g;
          const variants = g.variants.map((v, vidx) => {
            if (vidx !== vi) return v;
            const u: Variant = { ...v, [field]: val };
            u.orderQty = u.inspectQty + u.reinspectQty;
            u.rate = calcRate(u);
            return u;
          });
          return { ...g, variants };
        });
        return recalcGroup(draft, gi);
      });
    },
    [recalcGroup],
  );

  const handleTextChange = useCallback(
    (gi: number, vi: number, field: TextField, value: string) => {
      setGroups(prev => {
        const draft = prev.map((g, idx) => {
          if (idx !== gi) return g;
          const variants = g.variants.map((v, vidx) => {
            if (vidx !== vi) return v;
            return { ...v, [field]: value };
          });
          return { ...g, variants };
        });
        return recalcGroup(draft, gi);
      });
    },
    [recalcGroup],
  );

  const handleDownload = async () => {
    await exportInspectionReportFromGroups(groups, {
      customerName: record.customerName || record.customerId,
      factoryNames: record.factoryNames || '',
      dateStr,
      code: record.code,
    });
  };

  // Numeric fields for So luong group (2 cols)
  const qtyFields: { key: EditableField; label: string }[] = [
    { key: 'passedKk', label: 'SLHĐ KK' },
    { key: 'totalExport', label: 'TỔNG XUẤT' },
  ];

  // Numeric fields for Kiem Hang group (14 cols)
  const inspectFields: { key: EditableField; label: string }[] = [
    { key: 'inspectQty', label: 'SL kiểm lần 1' },
    { key: 'passedQty', label: 'Hàng A1' },
    { key: 'defectiveQty', label: 'Hàng B1' },
    { key: 'spec', label: 'Thông số' },
    { key: 'acc', label: 'Phụ liệu' },
    { key: 'app', label: 'Ngoại quan' },
    { key: 'fab', label: 'Vải' },
    { key: 'dirty', label: 'Dơ' },
    { key: 'seam', label: 'Lỗi may' },
    { key: 'print', label: 'Lỗi in' },
    { key: 'sole', label: 'Lỗi sole' },
    { key: 'scratch', label: 'Lỗi trầy' },
    { key: 'other', label: 'Khác' },
    { key: 'metal', label: 'Kiểm kim' },
  ];

  // Numeric fields for Tai kiem group (3 cols)
  const reinspectNumFields: { key: EditableField; label: string }[] = [
    { key: 'reinspectQty', label: 'Tổng Tái' },
    { key: 'tkPassed', label: 'Hàng A2' },
    { key: 'tkFailed', label: 'Hàng B2' },
  ];

  const reinspectTextFields: { key: TextField; label: string }[] = [
    { key: 'tkSpec', label: 'Thông số' },
    { key: 'tkAcc', label: 'Phụ liệu' },
    { key: 'tkApp', label: 'Ngoại quan' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-4 pb-4">
      <div className="bg-white rounded-xl shadow-2xl w-[98vw] max-w-[1800px] flex flex-col" style={{ maxHeight: 'calc(100vh - 2rem)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Xem trước Báo Cáo</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              KH: {record.customerName || record.customerId} | NM: {record.factoryNames || ''} | Ngày: {dateStr} | Mã phiếu: {record.code}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải Excel
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              {/* Group header row */}
              <tr className="bg-[#4472C4] text-white">
                <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Mã hàng</th>
                <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Thương hiệu</th>
                <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Tên hàng</th>
                <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Màu</th>
                <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Size</th>
                <th className="border border-slate-400 px-2 py-1 text-center font-bold" rowSpan={2}>SLĐH</th>
                <th className="border border-slate-400 px-2 py-1 text-center font-bold" colSpan={2}>Số lượng</th>
                <th className="border border-slate-400 px-2 py-1 text-center font-bold" colSpan={14}>KIỂM HÀNG</th>
                <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Tỉ lệ lỗi</th>
                <th className="border border-[#E97451] px-2 py-1 text-center font-bold" colSpan={6}>TÁI KIỂM</th>
              </tr>
              {/* Detail header row */}
              <tr className="bg-[#4472C4] text-white">
                {qtyFields.map(f => (
                  <th key={f.key} className="border border-slate-400 px-2 py-1 text-center font-bold">{f.label}</th>
                ))}
                {inspectFields.map(f => (
                  <th key={f.key} className="border border-slate-400 px-2 py-1 text-center font-bold">{f.label}</th>
                ))}
                {reinspectNumFields.map(f => (
                  <th key={f.key} className="border border-[#E97451] px-2 py-1 text-center font-bold">{f.label}</th>
                ))}
                {reinspectTextFields.map(f => (
                  <th key={f.key} className="border border-[#E97451] px-2 py-1 text-center font-bold">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g, gi) => {
                const vc = g.variants.length;
                return (
                  <ReportGroup
                    key={g.code}
                    group={g}
                    gi={gi}
                    variantCount={vc}
                    qtyFields={qtyFields}
                    inspectFields={inspectFields}
                    reinspectNumFields={reinspectNumFields}
                    reinspectTextFields={reinspectTextFields}
                    onChange={handleChange}
                    onTextChange={handleTextChange}
                  />
                );
              })}

              {/* Grand total */}
              <tr className="bg-[#BDD7EE] font-bold">
                <td className="border border-slate-300 px-2 py-1 text-center" colSpan={5}>Tổng Cộng</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{grandTotal.orderQty}</td>
                {qtyFields.map(f => (
                  <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{grandTotal[f.key]}</td>
                ))}
                {inspectFields.map(f => (
                  <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{grandTotal[f.key]}</td>
                ))}
                <td className="border border-slate-300 px-2 py-1 text-right">{grandTotal.rate}</td>
                {reinspectNumFields.map(f => (
                  <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{grandTotal[f.key]}</td>
                ))}
                {reinspectTextFields.map(f => (
                  <td key={f.key} className="border border-slate-300 px-2 py-1">{grandTotal[f.key]}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──

function ReportGroup({
  group,
  gi,
  variantCount,
  qtyFields,
  inspectFields,
  reinspectNumFields,
  reinspectTextFields,
  onChange,
  onTextChange,
}: {
  group: ProductGroup;
  gi: number;
  variantCount: number;
  qtyFields: { key: EditableField; label: string }[];
  inspectFields: { key: EditableField; label: string }[];
  reinspectNumFields: { key: EditableField; label: string }[];
  reinspectTextFields: { key: TextField; label: string }[];
  onChange: (gi: number, vi: number, field: EditableField, val: string) => void;
  onTextChange: (gi: number, vi: number, field: TextField, val: string) => void;
}) {
  return (
    <>
      {group.variants.map((v, vi) => (
        <tr key={`${v.color}-${v.size}`} className="hover:bg-slate-50/50">
          {vi === 0 ? (
            <>
              <td className="border border-slate-300 px-2 py-1 text-center align-middle" rowSpan={variantCount}>{group.code}</td>
              <td className="border border-slate-300 px-2 py-1 text-center align-middle" rowSpan={variantCount}>{group.brand}</td>
              <td className="border border-slate-300 px-2 py-1 text-center align-middle" rowSpan={variantCount}>{group.name}</td>
            </>
          ) : null}
          <td className="border border-slate-300 px-2 py-1 text-center">{v.color}</td>
          <td className="border border-slate-300 px-2 py-1 text-center">{v.size}</td>
          {/* SLĐH — auto-computed */}
          <td className="border border-slate-300 px-2 py-1 text-right">{v.orderQty}</td>
          {/* So luong fields */}
          {qtyFields.map(f => (
            <td key={f.key} className="border border-slate-300 px-1 py-0.5">
              <NumberInput
                value={Number(v[f.key]) || 0}
                className="w-14 px-1 py-0.5 border rounded text-xs text-right"
                onChange={val => onChange(gi, vi, f.key, String(val))}
              />
            </td>
          ))}
          {/* Kiem Hang fields */}
          {inspectFields.map(f => (
            <td key={f.key} className="border border-slate-300 px-1 py-0.5">
              <NumberInput
                value={Number(v[f.key]) || 0}
                className="w-14 px-1 py-0.5 border rounded text-xs text-right"
                onChange={val => onChange(gi, vi, f.key, String(val))}
              />
            </td>
          ))}
          {/* Rate — auto-computed */}
          <td className="border border-slate-300 px-2 py-1 text-right">{v.rate}</td>
          {/* Reinspection numeric fields */}
          {reinspectNumFields.map(f => (
            <td key={f.key} className="border border-orange-200 px-1 py-0.5">
              <NumberInput
                value={Number(v[f.key]) || 0}
                className="w-14 px-1 py-0.5 border border-orange-200 rounded text-xs text-right"
                onChange={val => onChange(gi, vi, f.key, String(val))}
              />
            </td>
          ))}
          {/* Reinspection text fields */}
          {reinspectTextFields.map(f => (
            <td key={f.key} className="border border-orange-200 px-1 py-0.5">
              <input
                type="text"
                className="w-20 px-1 py-0.5 border border-orange-200 rounded text-xs"
                value={v[f.key] || ''}
                onChange={e => onTextChange(gi, vi, f.key, e.target.value)}
              />
            </td>
          ))}
        </tr>
      ))}

      {/* Group total */}
      <tr className="bg-[#D9D9D9] font-bold">
        <td className="border border-slate-300 px-2 py-1 text-center" colSpan={5}>Tổng</td>
        <td className="border border-slate-300 px-2 py-1 text-right">{group.total.orderQty}</td>
        {qtyFields.map(f => (
          <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{group.total[f.key]}</td>
        ))}
        {inspectFields.map(f => (
          <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{group.total[f.key]}</td>
        ))}
        <td className="border border-slate-300 px-2 py-1 text-right">{group.total.rate}</td>
        {reinspectNumFields.map(f => (
          <td key={f.key} className="border border-orange-200 px-2 py-1 text-right">{group.total[f.key]}</td>
        ))}
        {reinspectTextFields.map(f => (
          <td key={f.key} className="border border-orange-200 px-2 py-1">{group.total[f.key]}</td>
        ))}
      </tr>
    </>
  );
}
