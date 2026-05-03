import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { DebitNote, DebitNoteItem } from '../../lib/database.types';
import { X, Download } from 'lucide-react';
import { exportDebitNote } from '../../lib/export-debit-note';

interface Props {
  debitNoteId: string;
  onClose: () => void;
}

export default function DebitNoteDetail({ debitNoteId, onClose }: Props) {
  const [note, setNote] = useState<DebitNote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNote();
  }, [debitNoteId]);

  const loadNote = async () => {
    try {
      const data = await api.debitNotes.getById(debitNoteId);
      setNote(data);
    } catch (error) {
      console.error('Failed to load debit note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (note) await exportDebitNote(note);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-slate-500">Đang tải...</div>
      </div>
    );
  }

  if (!note) return null;

  const fmt = (n: any): string => {
    const num = typeof n === 'string' ? parseFloat(n) : (n || 0);
    return (Math.round(num * 100) / 100).toLocaleString('vi-VN');
  };

  const items = note.items || [];
  const goodsItems = items.filter(i => i.itemType === 'goods');
  const qcItems = items.filter(i => i.itemType === 'qc');
  const otItems = items.filter(i => i.itemType === 'ot');

  const goodsTotal = goodsItems.reduce((s, i) => s + Number(i.lineTotal), 0);
  const qcTotal = qcItems.reduce((s, i) => s + Number(i.lineTotal), 0);
  const otTotal = otItems.reduce((s, i) => s + Number(i.lineTotal), 0);
  const travel = Number(note.travelAllowance) || 0;
  const travelDays = Number(note.travelDays) || 0;
  const travelUnitPrice = Number(note.travelUnitPrice) || 0;
  const vehicleCount = Number(note.vehicleCount) || 0;
  const travelHoursQty = Number(note.travelHoursQty) || 0;
  const travelHoursTime = Number(note.travelHoursTime) || 0;
  const travelHoursUnitPrice = Number(note.travelHoursUnitPrice) || 0;
  const travelHoursTotal = travelHoursQty * travelHoursTime * travelHoursUnitPrice;
  const grandTotal = goodsTotal + qcTotal + otTotal + travel + travelHoursTotal;

  // Merge QC and OT items by date (productCode holds date for QC/OT)
  const dateMap = new Map<string, { qc?: DebitNoteItem; ot?: DebitNoteItem }>();
  for (const qi of qcItems) {
    const key = qi.productCode || '';
    const entry = dateMap.get(key) || {};
    entry.qc = qi;
    dateMap.set(key, entry);
  }
  for (const oi of otItems) {
    const key = oi.productCode || '';
    const entry = dateMap.get(key) || {};
    entry.ot = oi;
    dateMap.set(key, entry);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chi tiết Debit Note</h2>
            <p className="text-sm text-slate-500 mt-0.5">{note.debitNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {/* Info header */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-slate-500">Khách hàng</span>
                <p className="font-medium text-slate-900">{note.customerName || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Mã DN</span>
                <p className="font-medium text-slate-900">{note.debitNo}</p>
              </div>
              <div>
                <span className="text-sm text-slate-500">Ngày tạo</span>
                <p className="font-medium text-slate-900">{new Date(note.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>

            {note.notes && (
              <div>
                <span className="text-sm text-slate-500">Ghi chú</span>
                <p className="text-slate-900">{note.notes}</p>
              </div>
            )}

            {/* Goods table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Theo hàng hóa</h3>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-slate-600 w-10">STT</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Mã hàng</th>
                      <th className="px-4 py-2 text-left font-medium text-slate-600">Nội dung hàng kiểm</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">Số lượng</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">Đơn giá</th>
                      <th className="px-4 py-2 text-right font-medium text-slate-600">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goodsItems.map((item, idx) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-2">{idx + 1}</td>
                        <td className="px-4 py-2">{item.productCode || '-'}</td>
                        <td className="px-4 py-2">{item.inspectionContent || '-'}</td>
                        <td className="px-4 py-2 text-right">{fmt(item.quantity)}</td>
                        <td className="px-4 py-2 text-right">{fmt(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right">{fmt(item.lineTotal)}</td>
                      </tr>
                    ))}
                    {goodsItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-slate-400">Không có dữ liệu</td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td colSpan={5} className="px-4 py-2 text-right font-medium">Tổng hàng hóa:</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(goodsTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* QC + OT table */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Theo QC + OT</h3>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 w-10">STT</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Ngày</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Số giờ QC</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">SL QC</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Đơn giá QC</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Thành tiền</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Số giờ OT</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">SL OT</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Đơn giá OT</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">Thành tiền OT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(dateMap.entries()).map(([date, entry], idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{date || '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.qc?.hours ? fmt(entry.qc.hours) : '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.qc ? fmt(entry.qc.quantity) : '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.qc ? fmt(entry.qc.unitPrice) : '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.qc ? fmt(entry.qc.lineTotal) : '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.ot?.hours ? fmt(entry.ot.hours) : '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.ot ? fmt(entry.ot.quantity) : '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.ot ? fmt(entry.ot.unitPrice) : '-'}</td>
                        <td className="px-3 py-2 text-right">{entry.ot ? fmt(entry.ot.lineTotal) : '-'}</td>
                      </tr>
                    ))}
                    {dateMap.size === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-4 text-center text-slate-400">Không có dữ liệu</td>
                      </tr>
                    )}
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td colSpan={5} className="px-3 py-2 text-right font-medium">Tổng QC:</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(qcTotal)}</td>
                      <td colSpan={3} className="px-3 py-2 text-right font-medium">Tổng OT:</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(otTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Travel allowance */}
            {travel > 0 && (
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700">Tiền đi đường:</span>
                  <span className="font-semibold text-slate-900">{fmt(travel)}</span>
                </div>
                {travelDays > 0 && travelUnitPrice > 0 && vehicleCount > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {travelDays} ngày x {fmt(travelUnitPrice)} đ x {fmt(vehicleCount)} xe
                  </p>
                )}
              </div>
            )}

            {/* Travel hours */}
            {travelHoursTotal > 0 && (
              <div className="px-4 py-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-700">Giờ đi đường:</span>
                  <span className="font-semibold text-slate-900">{fmt(travelHoursTotal)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {fmt(travelHoursQty)} SL x {fmt(travelHoursTime)} thời gian x {fmt(travelHoursUnitPrice)} đ
                </p>
              </div>
            )}

            {/* Grand total */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-blue-900">Tổng cộng:</span>
                <span className="text-2xl font-bold text-blue-900">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
