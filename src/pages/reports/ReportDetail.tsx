import { useState, useMemo, useCallback } from 'react';
import { api } from '../../lib/api';
import type { InspectionReport, ReportItem, ReportProductivity } from '../../lib/database.types';
import type { InspectionItem } from '../../lib/database.types';
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
import { ArrowLeft, FileDown } from 'lucide-react';
import NumberInput from '../../components/ui/NumberInput';

// Editable numeric fields
type EditableField = 'inspectQty' | 'reinspectQty' | 'passedQty' | 'totalExport' | 'defectiveQty'
  | 'spec' | 'acc' | 'app' | 'fab' | 'dirty' | 'seam' | 'other' | 'print' | 'sole' | 'scratch' | 'metal'
  | 'tkPassed' | 'tkFailed';

// Text fields for reinspection
type TextField = 'tkSpec' | 'tkAcc' | 'tkApp';

interface Props {
  report: InspectionReport;
  onBack: () => void;
}

export default function ReportDetail({ report, onBack }: Props) {
  const items = report.items || [];

  const [groups, setGroups] = useState<ProductGroup[]>(() =>
    buildGroups(items as unknown as InspectionItem[]),
  );

  const dateStr = report.inspectionDate
    ? new Date(report.inspectionDate).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : '';

  const grandTotal = useMemo<VRow>(() => {
    const gt = zeroVRow();
    for (const g of groups) addTo(gt, g.total);
    gt.rate = calcRate(gt);
    return gt;
  }, [groups]);

  const recalcGroup = useCallback((draft: ProductGroup[], gi: number): ProductGroup[] => {
    return draft.map((g, idx) => {
      if (idx !== gi) return g;
      const gt = zeroVRow();
      for (const v of g.variants) addTo(gt, v);
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
            u.passedKk = u.passedQty + u.tkPassed;
            u.orderSl = u.passedQty + u.tkPassed + u.tkFailed;
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

  const handleExport = async () => {
    if (items.length === 0) {
      alert('Báo cáo không có dữ liệu');
      return;
    }
    await exportInspectionReportFromGroups(groups, {
      customerName: report.customerName || '',
      factoryNames: report.factoryNames || '',
      dateStr,
      code: report.code,
    }, report.productivity);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  // End group fields (4 cols) — "Số lượng" at the end
  const endFields: { id: string; key: keyof VRow; label: string }[] = [
    { id: 'totalExport', key: 'totalExport', label: 'TỔNG XUẤT' },
    { id: 'rate', key: 'rate', label: 'Tỉ lệ lỗi' },
    { id: 'orderSl', key: 'orderSl', label: 'SL order' },
    { id: 'parkingList', key: 'passedKk', label: 'Parking list' },
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
    { key: 'other', label: 'Khác' },
    { key: 'print', label: 'Lỗi in' },
    { key: 'sole', label: 'Lỗi sole' },
    { key: 'scratch', label: 'Lỗi trầy' },
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{report.code}</h1>
            <p className="text-sm text-slate-500">
              {report.customerName} — {report.factoryNames} — {formatDate(report.inspectionDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            report.status === 'finalized'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {report.status === 'finalized' ? 'Hoàn thành' : 'Nháp'}
          </span>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <FileDown className="w-4 h-4" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Grouped table */}
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Báo cáo không có dữ liệu items</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse min-w-[1200px]">
              <thead className="sticky top-0 z-10">
                {/* Group header row */}
                <tr className="bg-[#4472C4] text-white">
                  <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Mã hàng</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Thương hiệu</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Tên hàng</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Màu</th>
                  <th className="border border-slate-400 px-2 py-1.5 text-center font-bold align-middle" rowSpan={2}>Size</th>
                  <th className="border border-slate-400 px-2 py-1 text-center font-bold" colSpan={14}>KIỂM HÀNG</th>
                  <th className="border border-[#E97451] px-2 py-1 text-center font-bold" colSpan={6}>TÁI KIỂM</th>
                  <th className="border border-slate-400 px-2 py-1 text-center font-bold" colSpan={4}>Số lượng</th>
                </tr>
                {/* Detail header row */}
                <tr className="bg-[#4472C4] text-white">
                  {inspectFields.map(f => (
                    <th key={f.key} className="border border-slate-400 px-2 py-1 text-center font-bold">{f.label}</th>
                  ))}
                  {reinspectNumFields.map(f => (
                    <th key={f.key} className="border border-[#E97451] px-2 py-1 text-center font-bold">{f.label}</th>
                  ))}
                  {reinspectTextFields.map(f => (
                    <th key={f.key} className="border border-[#E97451] px-2 py-1 text-center font-bold">{f.label}</th>
                  ))}
                  {endFields.map(f => (
                    <th key={f.id} className="border border-slate-400 px-2 py-1 text-center font-bold">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, gi) => (
                  <ReportGroup
                    key={g.code}
                    group={g}
                    gi={gi}
                    variantCount={g.variants.length}
                    inspectFields={inspectFields}
                    reinspectNumFields={reinspectNumFields}
                    reinspectTextFields={reinspectTextFields}
                    onChange={handleChange}
                    onTextChange={handleTextChange}
                  />
                ))}

                {/* Grand total */}
                <tr className="bg-[#BDD7EE] font-bold">
                  <td className="border border-slate-300 px-2 py-1 text-center" colSpan={5}>Tổng Cộng</td>
                  {inspectFields.map(f => (
                    <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{grandTotal[f.key]}</td>
                  ))}
                  {reinspectNumFields.map(f => (
                    <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{grandTotal[f.key]}</td>
                  ))}
                  {reinspectTextFields.map(f => (
                    <td key={f.key} className="border border-slate-300 px-2 py-1">{grandTotal[f.key]}</td>
                  ))}
                  <td className="border border-slate-300 px-2 py-1 text-right">{grandTotal.totalExport}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{grandTotal.rate}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{grandTotal.orderSl}</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{grandTotal.passedKk}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Part C - Productivity tracking */}
      {report.productivity && report.productivity.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
          <h2 className="font-semibold text-slate-700 mb-3">
            C - Theo dõi năng suất ({report.productivity.length} ngày)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Ngày</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">Nhà máy</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">SL QC</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">OT</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">Năng suất QC/ngày</th>
                </tr>
              </thead>
              <tbody>
                {report.productivity.map(p => {
                  const inspectTotal = grandTotal.inspectQty + grandTotal.reinspectQty;
                  const qcQty = p.qcQuantity || 0;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">{formatDate(p.recordDate)}</td>
                      <td className="px-3 py-2">{p.factoryName || '-'}</td>
                      <td className="px-3 py-2 text-right">{p.qcQuantity}</td>
                      <td className="px-3 py-2 text-right">{p.ot}</td>
                      <td className="px-3 py-2 text-right">{qcQty > 0 ? Math.round(inspectTotal / qcQty * 100) / 100 : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-medium">
                  <td className="px-3 py-2" colSpan={2}>Tổng cộng</td>
                  <td className="px-3 py-2 text-right">{report.productivity.reduce((s, p) => s + (p.qcQuantity || 0), 0)}</td>
                  <td className="px-3 py-2 text-right">{report.productivity.reduce((s, p) => s + (p.ot || 0), 0)}</td>
                  <td className="px-3 py-2 text-right">-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function ReportGroup({
  group,
  gi,
  variantCount,
  inspectFields,
  reinspectNumFields,
  reinspectTextFields,
  onChange,
  onTextChange,
}: {
  group: ProductGroup;
  gi: number;
  variantCount: number;
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
          {/* So luong group — end columns */}
          <td className="border border-slate-300 px-1 py-0.5">
            <NumberInput
              value={Number(v.totalExport) || 0}
              className="w-14 px-1 py-0.5 border rounded text-xs text-right"
              onChange={val => onChange(gi, vi, 'totalExport', String(val))}
            />
          </td>
          <td className="border border-slate-300 px-2 py-1 text-right">{v.rate}</td>
          <td className="border border-slate-300 px-2 py-1 text-right">{v.orderSl}</td>
          <td className="border border-slate-300 px-2 py-1 text-right">{v.passedKk}</td>
        </tr>
      ))}

      {/* Group total */}
      <tr className="bg-[#D9D9D9] font-bold">
        <td className="border border-slate-300 px-2 py-1 text-center" colSpan={5}>Tổng</td>
        {inspectFields.map(f => (
          <td key={f.key} className="border border-slate-300 px-2 py-1 text-right">{group.total[f.key]}</td>
        ))}
        {reinspectNumFields.map(f => (
          <td key={f.key} className="border border-orange-200 px-2 py-1 text-right">{group.total[f.key]}</td>
        ))}
        {reinspectTextFields.map(f => (
          <td key={f.key} className="border border-orange-200 px-2 py-1">{group.total[f.key]}</td>
        ))}
        <td className="border border-slate-300 px-2 py-1 text-right">{group.total.totalExport}</td>
        <td className="border border-slate-300 px-2 py-1 text-right">{group.total.rate}</td>
        <td className="border border-slate-300 px-2 py-1 text-right">{group.total.orderSl}</td>
        <td className="border border-slate-300 px-2 py-1 text-right">{group.total.passedKk}</td>
      </tr>
    </>
  );
}
