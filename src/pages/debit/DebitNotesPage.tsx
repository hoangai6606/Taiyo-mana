import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { DebitNote, InspectionRecord, Factory } from '../../lib/database.types';
import { Plus, X, Eye, Download } from 'lucide-react';
import DebitNoteDetail from './DebitNoteDetail';
import { exportDebitNote } from '../../lib/export-debit-note';

interface CreateItem {
  productCode: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemType: 'goods' | 'qc' | 'ot';
  inspectionDate?: string;
  factoryName?: string;
}

interface GoodsGroupedItem {
  productCode: string;
  quantity: number;
}

export default function DebitNotesPage() {
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadDebitNotes();
  }, []);

  const loadDebitNotes = async () => {
    try {
      const data = await api.debitNotes.list();
      setDebitNotes(data);
    } catch (error) {
      console.error('Failed to load debit notes:', error);
    }
  };

  const calcTotal = (note: DebitNote): number => {
    return (note.items || []).reduce((sum, i) => sum + Number(i.lineTotal), 0) + Number(note.travelAllowance || 0);
  };

  const handleExport = async (id: string) => {
    setExporting(id);
    try {
      const note = await api.debitNotes.getById(id);
      exportDebitNote(note);
    } catch (error) {
      console.error('Failed to export debit note:', error);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Debit Note</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo Debit Note
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Mã DN</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Khách hàng</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Ngày tạo</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Thành tiền</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {debitNotes.map((note) => (
              <tr key={note.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium">{note.debitNo}</td>
                <td className="px-4 py-3 text-sm">{note.customerName}</td>
                <td className="px-4 py-3 text-sm">{new Date(note.createdAt).toLocaleDateString('vi-VN')}</td>
                <td className="px-4 py-3 text-sm text-right font-medium">{calcTotal(note).toLocaleString('vi-VN')}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSelectedNoteId(note.id)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleExport(note.id)}
                      disabled={exporting === note.id}
                      className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Xuất Excel"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {debitNotes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Chưa có debit note nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={loadDebitNotes} />}
      {selectedNoteId && (
        <DebitNoteDetail
          debitNoteId={selectedNoteId}
          onClose={() => setSelectedNoteId(null)}
        />
      )}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [inspectionRecords, setInspectionRecords] = useState<InspectionRecord[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('');
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [displayedFactoryName, setDisplayedFactoryName] = useState<string>('');
  const [unitPriceGoods, setUnitPriceGoods] = useState<number>(0);
  const [unitPriceQc, setUnitPriceQc] = useState<number>(0);
  const [unitPriceOt, setUnitPriceOt] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [travelAllowance, setTravelAllowance] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadInspectionRecords();
    loadFactories();
  }, []);

  const loadInspectionRecords = async () => {
    try {
      const data = await api.inspectionRecords.list();
      setInspectionRecords(data);
    } catch (error) {
      console.error('Failed to load inspection records:', error);
    }
  };

  const loadFactories = async () => {
    try {
      const data = await api.factories.list();
      setFactories(data);
    } catch (error) {
      console.error('Failed to load factories:', error);
    }
  };

  const handleRecordSelect = async (id: string) => {
    setSelectedRecordId(id);
    if (!id) {
      setSelectedRecord(null);
      setSelectedFactoryId('');
      setDisplayedFactoryName('');
      setSelectedFactory(null);
      setUnitPriceGoods(0);
      return;
    }
    try {
      const record = await api.inspectionRecords.getById(id);
      setSelectedRecord(record);

      // Auto-select first factory if any exists
      const factoryIds = JSON.parse(record.factoryIds || '[]') as string[];
      if (factoryIds.length >= 1) {
        const factoryName = factoryIds[0];
        setSelectedFactoryId(factoryName);
        setDisplayedFactoryName(factoryName);

        // Thử tìm factory trong list factories để fetch price
        const matchedFactory = factories.find(f => f.id === factoryName || f.name === factoryName || f.code === factoryName);
        if (matchedFactory) {
          setSelectedFactory(matchedFactory);
          // Fetch price for matched factory
          const inspectionDate = new Date(record.inspectionDate).toISOString().split('T')[0];
          const priceData = await api.factoryPrices.getByFactory(matchedFactory.id, inspectionDate);
          setUnitPriceGoods(priceData ? Number(priceData.unitPrice) : 0);
        } else {
          setSelectedFactory(null);
          // Giữ nguyên unitPriceGoods - không set về 0
        }
      } else {
        setSelectedFactoryId('');
        setDisplayedFactoryName('');
        setSelectedFactory(null);
        // Giữ nguyên unitPriceGoods
      }
    } catch (error) {
      console.error('Failed to load inspection record:', error);
    }
  };

  const handleFactorySelect = async (factoryId: string) => {
    setSelectedFactoryId(factoryId);
    if (!factoryId || !selectedRecord) {
      setSelectedFactory(null);
      setUnitPriceGoods(0);
      return;
    }
    try {
      // Thử tìm theo UUID trước
      let factory = factories.find(f => f.id === factoryId);
      // Nếu không tìm thấy, thử tìm theo tên (vì factoryId có thể là tên string từ text input)
      if (!factory) {
        factory = factories.find(f => f.name === factoryId || f.code === factoryId);
      }
      setSelectedFactory(factory || null);

      // Auto-fetch unit price from factory_prices
      if (factory) {
        const inspectionDate = new Date(selectedRecord.inspectionDate).toISOString().split('T')[0];
        const priceData = await api.factoryPrices.getByFactory(factory.id, inspectionDate);
        if (priceData) {
          setUnitPriceGoods(Number(priceData.unitPrice));
        } else {
          setUnitPriceGoods(0);
        }
      } else {
        setUnitPriceGoods(0);
      }
    } catch (error) {
      console.error('Failed to load factory price:', error);
      setUnitPriceGoods(0);
    }
  };

  // Group goods items by productCode only (not by size)
  const goodsItems = selectedRecord?.items?.filter(i => i.inspectedQuantity && i.inspectedQuantity > 0) || [];
  const goodsByKey = new Map<string, GoodsGroupedItem>();
  for (const item of goodsItems) {
    const key = item.productCode || '';
    const existing = goodsByKey.get(key);
    if (existing) {
      existing.quantity += item.inspectedQuantity || 0;
    } else {
      goodsByKey.set(key, {
        productCode: key,
        quantity: item.inspectedQuantity || 0,
      });
    }
  }

  const calculateGoodsTotal = () => {
    return Array.from(goodsByKey.values()).reduce((sum, item) => sum + item.quantity * unitPriceGoods, 0);
  };

  const calculateQcTotal = () => {
    if (!selectedRecord?.productivity) return 0;
    return selectedRecord.productivity.reduce((sum, p) => sum + (p.qcQuantity || 0) * unitPriceQc, 0);
  };

  const calculateOtTotal = () => {
    if (!selectedRecord?.productivity) return 0;
    return selectedRecord.productivity.reduce((sum, p) => sum + (p.ot || 0) * unitPriceOt, 0);
  };

  const calculateGrandTotal = () => {
    return calculateGoodsTotal() + calculateQcTotal() + calculateOtTotal() + travelAllowance;
  };

  const handleSave = async () => {
    setError('');

    if (!selectedRecord) {
      setError('Vui lòng chọn inspection record');
      return;
    }
    if (!selectedFactoryId) {
      setError('Vui lòng chọn factory');
      return;
    }

    setSaving(true);
    try {
      const items: CreateItem[] = [];

      // Goods items (grouped by productCode only - size is not stored)
      for (const item of goodsByKey.values()) {
        items.push({
          productCode: item.productCode,
          size: '', // No longer storing size since we group by productCode only
          quantity: item.quantity,
          unitPrice: unitPriceGoods,
          lineTotal: item.quantity * unitPriceGoods,
          itemType: 'goods',
        });
      }

      // QC items (from productivity tracking)
      if (selectedRecord.productivity) {
        for (const p of selectedRecord.productivity) {
          if (p.qcQuantity && p.qcQuantity > 0) {
            items.push({
              productCode: p.recordDate || '',
              size: '',
              quantity: p.qcQuantity,
              unitPrice: unitPriceQc,
              lineTotal: p.qcQuantity * unitPriceQc,
              itemType: 'qc',
              inspectionDate: p.recordDate,
              factoryName: p.factoryId || '',
            });
          }
        }
      }

      // OT items (from productivity tracking)
      if (selectedRecord.productivity) {
        for (const p of selectedRecord.productivity) {
          if (p.ot && p.ot > 0) {
            items.push({
              productCode: p.recordDate || '',
              size: '',
              quantity: p.ot,
              unitPrice: unitPriceOt,
              lineTotal: p.ot * unitPriceOt,
              itemType: 'ot',
              inspectionDate: p.recordDate,
              factoryName: p.factoryId || '',
            });
          }
        }
      }

      await api.debitNotes.create({
        customerId: selectedRecord.customerId,
        customerName: selectedRecord.customerName,
        inspectionRecordId: selectedRecord.id,
        unitPriceGoods,
        unitPriceQc,
        unitPriceOt,
        notes,
        travelAllowance,
        items,
      });

      onCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create debit note:', error);
      setError('Lưu thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Tạo Debit Note</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Select inspection record */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chọn phiếu kiểm định</label>
              <select
                value={selectedRecordId}
                onChange={(e) => handleRecordSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn phiếu kiểm định --</option>
                {inspectionRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.code} - {record.customerName}
                  </option>
                ))}
              </select>
            </div>

            {selectedRecord && (
              <>
                {/* Record info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Khách hàng</label>
                    <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{selectedRecord.customerName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã phiếu</label>
                    <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{selectedRecord.code}</p>
                  </div>
                </div>

                {/* Factory display */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nhà máy</label>
                  <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">
                    {displayedFactoryName || selectedFactory ? (selectedFactory ? `${selectedFactory.code} - ${selectedFactory.name}` : displayedFactoryName) : '-'}
                  </p>
                </div>

                {/* Unit prices */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đơn giá hàng hóa</label>
                    <input
                      type="number"
                      value={unitPriceGoods}
                      onChange={(e) => setUnitPriceGoods(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đơn giá QC</label>
                    <input
                      type="number"
                      value={unitPriceQc}
                      onChange={(e) => setUnitPriceQc(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Đơn giá OT</label>
                    <input
                      type="number"
                      value={unitPriceOt}
                      onChange={(e) => setUnitPriceOt(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tiền đi đường */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tiền đi đường</label>
                  <input
                    type="number"
                    value={travelAllowance}
                    onChange={(e) => setTravelAllowance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Theo hàng hóa */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Theo hàng hóa</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Mã hàng</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">Số lượng</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">Đơn giá</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(goodsByKey.values()).map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-100">
                            <td className="px-4 py-2">{item.productCode}</td>
                            <td className="px-4 py-2 text-right">{item.quantity.toLocaleString('vi-VN')}</td>
                            <td className="px-4 py-2 text-right">{unitPriceGoods.toLocaleString('vi-VN')}</td>
                            <td className="px-4 py-2 text-right">{(item.quantity * unitPriceGoods).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td colSpan={3} className="px-4 py-2 text-right font-medium">Tổng:</td>
                          <td className="px-4 py-2 text-right font-medium">{calculateGoodsTotal().toLocaleString('vi-VN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Theo QC */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Theo QC</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-600">Ngày</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">SL QC</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">Đơn giá QC</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">Thành tiền</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">SL OT</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">Đơn giá OT</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-600">Thành tiền OT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRecord.productivity?.map((p, idx) => {
                          const hasQc = p.qcQuantity && p.qcQuantity > 0;
                          const hasOt = p.ot && p.ot > 0;
                          if (!hasQc && !hasOt) return null;
                          return (
                            <tr key={idx} className="border-t border-slate-100">
                              <td className="px-3 py-2">{p.recordDate ? new Date(p.recordDate).toLocaleDateString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">{hasQc ? p.qcQuantity?.toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">{hasQc ? unitPriceQc.toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">{hasQc ? ((p.qcQuantity || 0) * unitPriceQc).toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">{hasOt ? p.ot?.toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">{hasOt ? unitPriceOt.toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">{hasOt ? ((p.ot || 0) * unitPriceOt).toLocaleString('vi-VN') : '-'}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td colSpan={3} className="px-3 py-2 text-right font-medium">Tổng QC + OT:</td>
                          <td className="px-3 py-2 text-right font-medium">{calculateQcTotal().toLocaleString('vi-VN')}</td>
                          <td colSpan={2}></td>
                          <td className="px-3 py-2 text-right font-medium">{calculateOtTotal().toLocaleString('vi-VN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tổng tiền */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-blue-900">Tổng tiền:</span>
                    <span className="text-2xl font-bold text-blue-900">
                      {calculateGrandTotal().toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          {error && (
            <span className="text-red-600 text-sm mr-auto">{error}</span>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium"
            disabled={saving}
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
