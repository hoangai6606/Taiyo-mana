import { ArrowLeft, Download } from 'lucide-react';
import { useState, useMemo } from 'react';
import type { InspectionRecord, InspectionItem } from '../../lib/database.types';
import ReportPreviewModal from './ReportPreviewModal';

interface Props {
  record: InspectionRecord;
  onBack: () => void;
}

// Extended item type with local defect details (client-side only)
interface InspectionItemWithDefects extends InspectionItem {
  defectDetails?: Record<string, string>;
}

export default function InspectionDetail({ record, onBack }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [items] = useState<InspectionItemWithDefects[]>(
    (record.items || []) as InspectionItemWithDefects[]
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const productivity = record.productivity || [];

  // Group productivity by recordDate
  const groupedProductivity = useMemo(() => {
    const groups: Record<string, typeof productivity> = {};
    for (const entry of productivity) {
      const dateKey = entry.recordDate;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [productivity]);

  // Sort items by productCode, then color, then size order
  const sortedItems = useMemo(() => {
    const sizeOrder = ['SS', 'S', 'M', 'L', 'LL', 'EL', '3L', '4L', '5L', '6L', '7L', '8L'];
    return [...items].sort((a, b) => {
      const codeCompare = a.productCode.localeCompare(b.productCode);
      if (codeCompare !== 0) return codeCompare;
      const colorCompare = a.color.localeCompare(b.color);
      if (colorCompare !== 0) return colorCompare;
      const aIdx = sizeOrder.indexOf(a.size);
      const bIdx = sizeOrder.indexOf(b.size);
      if (aIdx === -1 && bIdx === -1) return a.size.localeCompare(b.size);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [items]);

  const totals = useMemo(() => ({
    passedQuantity: sortedItems.reduce((s, i) => s + (i.passedQuantity || 0), 0),
    reinspectQuantity: sortedItems.reduce((s, i) => s + (i.reinspectQuantity || 0), 0),
    metalCheck: sortedItems.reduce((s, i) => s + (i.metalCheck || 0), 0),
  }), [sortedItems]);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chi Tiết Phiếu Kiểm Hàng</h1>
            <p className="text-slate-500 text-sm mt-1">Mã phiếu: {record.code}</p>
          </div>
          <button
            onClick={() => setShowPreview(true)}
            disabled={!items.length}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      <div className="flex items-center mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </button>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Thông tin chung</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-500">Khách hàng</p>
            <p className="font-medium text-slate-900">{record.customerName || record.customerId}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Nhà máy</p>
            <p className="font-medium text-slate-900">{record.factoryNames || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Ngày kiểm hàng</p>
            <p className="font-medium text-slate-900">{formatDate(record.inspectionDate)}</p>
          </div>
        </div>
      </div>

      {/* Group A - Chi Tiết Hàng Hóa */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">A - Chi Tiết Hàng Hóa</h3>
        {items.length === 0 ? (
          <p className="text-slate-500">Không có dữ liệu</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700" rowSpan={2}>Ngày KT</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700" rowSpan={2}>Mã hàng</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700" rowSpan={2}>Màu</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700" rowSpan={2}>Size</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-700 bg-blue-50" colSpan={13}>KIỂM HÀNG</th>
                  <th className="px-3 py-2 text-center font-semibold text-orange-700 bg-orange-50" colSpan={6}>TÁI KIỂM</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-700 bg-green-50" rowSpan={2}>Kiểm Kim</th>
                </tr>
                <tr>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">SL kiểm lần 1</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Hàng A1</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Hàng B1</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Thông số</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Phụ liệu</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Ngoại quan</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Vải</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Dơ</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Lỗi may</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Khác</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Lỗi in</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Lỗi sole</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-blue-50">Lỗi trầy</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-orange-50">Tổng Tái</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-orange-50">Hàng A2</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-orange-50">Hàng B2</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-orange-50">Thông số</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-orange-50">Phụ liệu</th>
                  <th className="px-3 py-1 text-right font-semibold text-slate-700 bg-orange-50">Ngoại quan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2 text-slate-600">{item.inspectionDate ? formatDate(item.inspectionDate) : '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{item.productCode}</td>
                    <td className="px-3 py-2 text-slate-600">{item.color}</td>
                    <td className="px-3 py-2 text-slate-600 font-medium">{item.size}</td>
                    {/* KIỂM HÀNG */}
                    <td className="px-3 py-2 text-slate-600 text-right">{item.inspectedQuantity}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.passedQuantity}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.defectiveQuantity}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.specifications}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.accessories}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.appearance}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.fabric}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.dirty}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.seamDefect}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.other}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.printDefect || 0}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.soleDefect || 0}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.scratchDefect || 0}</td>
                    {/* TÁI KIỂM */}
                    <td className="px-3 py-2 text-slate-600 text-right">{item.reinspectQuantity || 0}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.reinspectPassed || 0}</td>
                    <td className="px-3 py-2 text-slate-600 text-right">{item.reinspectFailed || 0}</td>
                    <td className="px-3 py-2 text-slate-600">{item.reinspectSpecifications || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{item.reinspectAccessories || '-'}</td>
                    <td className="px-3 py-2 text-slate-600">{item.reinspectAppearance || '-'}</td>
                    {/* Kiểm Kim */}
                    <td className="px-3 py-2 text-slate-600 text-right">{item.metalCheck || 0}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#D9D9D9] font-bold">
                  <td className="px-3 py-2" colSpan={4}>Tổng</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right">{totals.passedQuantity}</td>
                  <td className="px-3 py-2" colSpan={11}></td>
                  <td className="px-3 py-2 text-right">{totals.reinspectQuantity}</td>
                  <td className="px-3 py-2" colSpan={5}></td>
                  <td className="px-3 py-2 text-right">{totals.metalCheck}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Group C - Theo Dõi Năng Suất */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">C - Theo Dõi Năng Suất</h3>
        {groupedProductivity.length === 0 ? (
          <p className="text-slate-500">Không có dữ liệu</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Ngày</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">SL QC</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">OT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedProductivity.map(([date, entries]) => (
                  entries.map((entry, idx) => (
                    <tr key={`${date}-${idx}`} className="hover:bg-slate-50/50">
                      {idx === 0 && (
                        <td className="px-3 py-2 text-slate-600" rowSpan={entries.length}>{formatDate(date)}</td>
                      )}
                      <td className="px-3 py-2 text-slate-600 text-right">{entry.qcQuantity}</td>
                      <td className="px-3 py-2 text-slate-600 text-right">{entry.ot}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPreview && (
        <ReportPreviewModal record={record} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
