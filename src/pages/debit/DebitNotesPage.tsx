import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { DebitNote, InspectionReport, Factory, CustomTable } from '../../lib/database.types';
import { Plus, X, Eye, Download } from 'lucide-react';
import DebitNoteDetail from './DebitNoteDetail';
import { exportDebitNote } from '../../lib/export-debit-note';
import NumberInput from '../../components/ui/NumberInput';

interface CreateItem {
  productCode: string;
  size: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  itemType: 'goods' | 'qc' | 'ot';
  inspectionDate?: string;
  factoryName?: string;
  hours?: number;
  inspectionContent?: string;
}

interface GoodsGroupedItem {
  productCode: string;
  quantity: number;
  inspectionContent: string;
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
    const travelHours = (Number(note.travelHoursQty) || 0) * (Number(note.travelHoursTime) || 0) * (Number(note.travelHoursUnitPrice) || 0);
    const customTotal = calculateCustomTotalFromData(note.customData);
    return (note.items || []).reduce((sum, i) => sum + Number(i.lineTotal), 0) + Number(note.travelAllowance || 0) + travelHours + customTotal;
  };

  const calculateCustomTotalFromData = (customData?: string | null): number => {
    if (!customData) return 0;
    try {
      const tables: CustomTable[] = JSON.parse(customData);
      return tables.reduce((total, table) => {
        return total + table.rows.reduce((tableSum, row) => tableSum + row.reduce((product, val) => product * (val || 0), 1), 0);
      }, 0);
    } catch {
      return 0;
    }
  };

  const handleExport = async (id: string) => {
    setExporting(id);
    try {
      const note = await api.debitNotes.getById(id);
      await exportDebitNote(note);
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
  const [inspectionReports, setInspectionReports] = useState<InspectionReport[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('');
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [displayedFactoryName, setDisplayedFactoryName] = useState<string>('');
  const [goodsPriceMap, setGoodsPriceMap] = useState<Map<string, number>>(new Map());
  const [qcPriceMap, setQcPriceMap] = useState<Map<string, number>>(new Map());
  const [otPriceMap, setOtPriceMap] = useState<Map<string, number>>(new Map());
  const [notes, setNotes] = useState<string>('');
  const [travelDays, setTravelDays] = useState<number>(0);
  const [travelUnitPrice, setTravelUnitPrice] = useState<number>(0);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const travelAllowance = travelDays * travelUnitPrice * vehicleCount;
  const [travelHoursQty, setTravelHoursQty] = useState<number>(0);
  const [travelHoursTime, setTravelHoursTime] = useState<number>(0);
  const [travelHoursUnitPrice, setTravelHoursUnitPrice] = useState<number>(0);
  const travelHoursTotal = travelHoursQty * travelHoursTime * travelHoursUnitPrice;
  const [customTables, setCustomTables] = useState<CustomTable[]>([]);
  const [saving, setSaving] = useState(false);
  const [hoursMap, setHoursMap] = useState<Map<string, { qcHours: number; otHours: number }>>(new Map());
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadInspectionReports();
    loadFactories();
  }, []);

  const loadInspectionReports = async () => {
    try {
      const data = await api.inspectionReports.list();
      setInspectionReports(data);
    } catch (error) {
      console.error('Failed to load inspection reports:', error);
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

  const handleReportSelect = async (id: string) => {
    setSelectedReportId(id);
    setError('');
    setHoursMap(new Map());
    setGoodsPriceMap(new Map());
    setQcPriceMap(new Map());
    setOtPriceMap(new Map());
    if (!id) {
      setSelectedReport(null);
      setSelectedFactoryId('');
      setDisplayedFactoryName('');
      setSelectedFactory(null);
      setTravelDays(0);
      setTravelUnitPrice(0);
      setVehicleCount(0);
      return;
    }
    try {
      const report = await api.inspectionReports.getById(id);
      setSelectedReport(report);

      // Auto-count distinct inspection dates from report items
      const distinctDates = new Set<string>();
      for (const item of (report.items || [])) {
        if (item.inspectionDate) {
          distinctDates.add(new Date(item.inspectionDate).toISOString().split('T')[0]);
        }
      }
      setTravelDays(distinctDates.size);

      // Parse factoryNames (comma-separated text) instead of JSON array
      const factoryNames = (report.factoryNames || '').split(',').map(s => s.trim()).filter(Boolean);
      if (factoryNames.length >= 1) {
        const firstName = factoryNames[0];
        setSelectedFactoryId(firstName);
        setDisplayedFactoryName(firstName);

        // Thử tìm factory trong list factories để fetch price
        const matchedFactory = factories.find(f => f.name === firstName || f.code === firstName);
        if (matchedFactory) {
          setSelectedFactory(matchedFactory);
          // Fetch price for matched factory
          const inspectionDate = report.inspectionDate ? new Date(report.inspectionDate).toISOString().split('T')[0] : '';
          if (inspectionDate) {
            const priceData = await api.factoryPrices.getByFactory(matchedFactory.id, inspectionDate);
            const defaultPrice = priceData ? Number(priceData.unitPrice) : 0;
            // Set default price for all goods items
            const reportGoodsItems = (report.items || []).filter(i => i.inspectedQuantity && i.inspectedQuantity > 0);
            const newMap = new Map<string, number>();
            const seen = new Set<string>();
            for (const i of reportGoodsItems) {
              const code = i.productCode || '';
              if (i.inspectedQuantity && i.inspectedQuantity > 0) {
                const key = `${code}_Kiểm hàng`;
                if (!seen.has(key)) {
                  seen.add(key);
                  newMap.set(key, defaultPrice);
                }
              }
              if (i.defectiveQuantity && i.defectiveQuantity > 0) {
                const key = `${code}_Tái kiểm`;
                if (!seen.has(key)) {
                  seen.add(key);
                  newMap.set(key, defaultPrice);
                }
              }
            }
            setGoodsPriceMap(newMap);
          }
        } else {
          setSelectedFactory(null);
        }
      } else {
        setSelectedFactoryId('');
        setDisplayedFactoryName('');
        setSelectedFactory(null);
      }
    } catch (error) {
      console.error('Failed to load inspection report:', error);
      setSelectedReport(null);
      setSelectedReportId('');
      setSelectedFactoryId('');
      setDisplayedFactoryName('');
      setSelectedFactory(null);
      setError(error instanceof Error ? error.message : 'Không thể tải chi tiết phiếu báo cáo');
    }
  };

  const handleFactorySelect = async (factoryId: string) => {
    setSelectedFactoryId(factoryId);
    if (!factoryId || !selectedReport) {
      setSelectedFactory(null);
      setGoodsPriceMap(new Map());
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
        const inspectionDate = selectedReport.inspectionDate ? new Date(selectedReport.inspectionDate).toISOString().split('T')[0] : '';
        if (inspectionDate) {
          const priceData = await api.factoryPrices.getByFactory(factory.id, inspectionDate);
          const defaultPrice = priceData ? Number(priceData.unitPrice) : 0;
          // Set default price for all goods items
          const reportGoodsItems = (selectedReport.items || []).filter(i => i.inspectedQuantity && i.inspectedQuantity > 0);
          const newMap = new Map<string, number>();
          const seen = new Set<string>();
          for (const i of reportGoodsItems) {
            const code = i.productCode || '';
            if (i.inspectedQuantity && i.inspectedQuantity > 0) {
              const key = `${code}_Kiểm hàng`;
              if (!seen.has(key)) {
                seen.add(key);
                newMap.set(key, defaultPrice);
              }
            }
            if (i.defectiveQuantity && i.defectiveQuantity > 0) {
              const key = `${code}_Tái kiểm`;
              if (!seen.has(key)) {
                seen.add(key);
                newMap.set(key, defaultPrice);
              }
            }
          }
          setGoodsPriceMap(newMap);
        }
      } else {
        setGoodsPriceMap(new Map());
      }
    } catch (error) {
      console.error('Failed to load factory price:', error);
      setGoodsPriceMap(new Map());
    }
  };

  // Group goods items by productCode + inspectionContent (Kiểm hàng / Tái kiểm)
  const goodsItems = selectedReport?.items?.filter(i => i.inspectedQuantity && i.inspectedQuantity > 0) || [];
  const goodsByKey = new Map<string, GoodsGroupedItem>();
  for (const item of goodsItems) {
    // Split into "Kiểm hàng" (passed) and "Tái kiểm" (defective)
    if (item.inspectedQuantity && item.inspectedQuantity > 0) {
      const content = 'Kiểm hàng';
      const key = `${item.productCode || ''}_${content}`;
      const existing = goodsByKey.get(key);
      if (existing) {
        existing.quantity += item.inspectedQuantity;
      } else {
        goodsByKey.set(key, {
          productCode: item.productCode || '',
          quantity: item.inspectedQuantity,
          inspectionContent: content,
        });
      }
    }
    if (item.defectiveQuantity && item.defectiveQuantity > 0) {
      const content = 'Tái kiểm';
      const key = `${item.productCode || ''}_${content}`;
      const existing = goodsByKey.get(key);
      if (existing) {
        existing.quantity += item.defectiveQuantity;
      } else {
        goodsByKey.set(key, {
          productCode: item.productCode || '',
          quantity: item.defectiveQuantity,
          inspectionContent: content,
        });
      }
    }
  }

  const getGoodsKey = (productCode: string, inspectionContent: string) => `${productCode}_${inspectionContent}`;

  const calculateGoodsTotal = () => {
    return Array.from(goodsByKey.values()).reduce((sum, item) => sum + item.quantity * (goodsPriceMap.get(getGoodsKey(item.productCode, item.inspectionContent)) || 0), 0);
  };

  const eff = (val: number | null | undefined): number => (!val ? 1 : val);

  const getHoursKey = (p: any) => p.id || (p.recordDate + '_' + p.factoryName);

  const calculateQcTotal = () => {
    if (!selectedReport?.productivity) return 0;
    return selectedReport.productivity.reduce((sum, p) => {
      const key = getHoursKey(p);
      return sum + (p.qcQuantity || 0) * (qcPriceMap.get(key) || 0) * eff(hoursMap.get(key)?.qcHours);
    }, 0);
  };

  const calculateOtTotal = () => {
    if (!selectedReport?.productivity) return 0;
    return selectedReport.productivity.reduce((sum, p) => {
      const key = getHoursKey(p);
      return sum + (p.ot || 0) * (otPriceMap.get(key) || 0) * eff(hoursMap.get(key)?.otHours);
    }, 0);
  };

  const calculateCustomTotal = () => {
    return customTables.reduce((total, table) => {
      return total + table.rows.reduce((tableSum, row) => tableSum + row.reduce((product, val) => product * (val || 0), 1), 0);
    }, 0);
  };

  const addCustomTable = () => {
    setCustomTables(prev => [...prev, {
      name: `Bảng tính ${prev.length + 1}`,
      columnNames: ['Số lượng', 'Đơn giá'],
      rows: [[0, 0]],
    }]);
  };

  const removeCustomTable = (index: number) => {
    setCustomTables(prev => prev.filter((_, i) => i !== index));
  };

  const updateCustomTableName = (tableIndex: number, name: string) => {
    setCustomTables(prev => prev.map((t, i) => i === tableIndex ? { ...t, name } : t));
  };

  const updateCustomTableColumnCount = (tableIndex: number, count: number) => {
    setCustomTables(prev => prev.map((t, i) => {
      if (i !== tableIndex) return t;
      const newCols = Array.from({ length: count }, (_, ci) => t.columnNames[ci] || `Cột ${ci + 1}`);
      const newRows = t.rows.map(row => {
        const newRow = Array.from({ length: count }, (_, ci) => row[ci] ?? 0);
        return newRow;
      });
      return { ...t, columnNames: newCols, rows: newRows };
    }));
  };

  const updateCustomTableRowCount = (tableIndex: number, count: number) => {
    setCustomTables(prev => prev.map((t, i) => {
      if (i !== tableIndex) return t;
      const colCount = t.columnNames.length;
      const newRows = Array.from({ length: count }, (_, ri) =>
        t.rows[ri] ? [...t.rows[ri]] : Array(colCount).fill(0)
      );
      return { ...t, rows: newRows };
    }));
  };

  const updateCustomTableColumnName = (tableIndex: number, colIndex: number, name: string) => {
    setCustomTables(prev => prev.map((t, i) => {
      if (i !== tableIndex) return t;
      const newNames = [...t.columnNames];
      newNames[colIndex] = name;
      return { ...t, columnNames: newNames };
    }));
  };

  const updateCustomTableCell = (tableIndex: number, rowIndex: number, colIndex: number, value: number) => {
    setCustomTables(prev => prev.map((t, i) => {
      if (i !== tableIndex) return t;
      const newRows = t.rows.map(r => [...r]);
      newRows[rowIndex][colIndex] = value;
      return { ...t, rows: newRows };
    }));
  };

  const calculateGrandTotal = () => {
    return calculateGoodsTotal() + calculateQcTotal() + calculateOtTotal() + travelAllowance + travelHoursTotal + calculateCustomTotal();
  };

  const handleSave = async () => {
    setError('');

    if (!selectedReport) {
      setError('Vui lòng chọn phiếu báo cáo');
      return;
    }
    if (!selectedFactoryId) {
      setError('Vui lòng chọn factory');
      return;
    }

    setSaving(true);
    try {
      const items: CreateItem[] = [];

      // Goods items (grouped by productCode + inspectionContent)
      for (const item of goodsByKey.values()) {
        const price = goodsPriceMap.get(getGoodsKey(item.productCode, item.inspectionContent)) || 0;
        items.push({
          productCode: item.productCode,
          size: '',
          quantity: item.quantity,
          unitPrice: price,
          lineTotal: item.quantity * price,
          itemType: 'goods',
          inspectionContent: item.inspectionContent,
        });
      }

      // QC items (from productivity tracking)
      if (selectedReport.productivity) {
        for (const p of selectedReport.productivity) {
          if (p.qcQuantity && p.qcQuantity > 0) {
            const key = getHoursKey(p);
            const h = eff(hoursMap.get(key)?.qcHours);
            const price = qcPriceMap.get(key) || 0;
            items.push({
              productCode: p.recordDate || '',
              size: '',
              quantity: p.qcQuantity,
              unitPrice: price,
              lineTotal: p.qcQuantity * price * h,
              itemType: 'qc',
              inspectionDate: p.recordDate,
              factoryName: p.factoryName || '',
              hours: h,
            });
          }
        }
      }

      // OT items (from productivity tracking)
      if (selectedReport.productivity) {
        for (const p of selectedReport.productivity) {
          if (p.ot && p.ot > 0) {
            const key = getHoursKey(p);
            const h = eff(hoursMap.get(key)?.otHours);
            const price = otPriceMap.get(key) || 0;
            items.push({
              productCode: p.recordDate || '',
              size: '',
              quantity: p.ot,
              unitPrice: price,
              lineTotal: p.ot * price * h,
              itemType: 'ot',
              inspectionDate: p.recordDate,
              factoryName: p.factoryName || '',
              hours: h,
            });
          }
        }
      }

      await api.debitNotes.create({
        customerId: null,
        customerName: selectedReport.customerName,
        inspectionReportId: selectedReport.id,
        unitPriceGoods: 0,
        unitPriceQc: 0,
        unitPriceOt: 0,
        notes,
        travelAllowance,
        travelDays,
        travelUnitPrice,
        vehicleCount,
        travelHoursQty,
        travelHoursTime,
        travelHoursUnitPrice,
        customData: customTables.length > 0 ? JSON.stringify(customTables) : null,
        items,
      });

      onCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create debit note:', error);
      const msg = error instanceof Error ? error.message : 'Lưu thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Tạo Debit Note</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Select inspection report */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chọn phiếu báo cáo</label>
              <select
                value={selectedReportId}
                onChange={(e) => handleReportSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn phiếu báo cáo --</option>
                {inspectionReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.code} - {report.customerName}
                  </option>
                ))}
              </select>
            </div>

            {selectedReport && (
              <>
                {/* Report info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Khách hàng</label>
                    <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{selectedReport.customerName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã phiếu</label>
                    <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">{selectedReport.code}</p>
                  </div>
                </div>

                {/* Factory display */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nhà máy</label>
                  <p className="px-3 py-2 bg-slate-50 rounded-lg text-slate-900">
                    {displayedFactoryName || selectedFactory ? (selectedFactory ? `${selectedFactory.code} - ${selectedFactory.name}` : displayedFactoryName) : '-'}
                  </p>
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
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Số ngày đi</label>
                      <input
                        type="number"
                        value={travelDays}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Đơn giá</label>
                      <NumberInput
                        value={travelUnitPrice}
                        onChange={setTravelUnitPrice}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Lượng xe</label>
                      <NumberInput
                        value={vehicleCount}
                        onChange={setVehicleCount}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Thành tiền</label>
                      <input
                        type="text"
                        value={travelAllowance.toLocaleString('vi-VN')}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 font-medium"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {travelDays} ngày x {travelUnitPrice.toLocaleString('vi-VN')} đ x {vehicleCount} xe = {travelAllowance.toLocaleString('vi-VN')}
                  </p>
                </div>

                {/* Giờ đi đường */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Giờ đi đường</label>
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">SL QC</label>
                      <NumberInput
                        value={travelHoursQty}
                        onChange={setTravelHoursQty}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Thời gian</label>
                      <NumberInput
                        value={travelHoursTime}
                        onChange={setTravelHoursTime}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Đơn giá</label>
                      <NumberInput
                        value={travelHoursUnitPrice}
                        onChange={setTravelHoursUnitPrice}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Thành tiền</label>
                      <input
                        type="text"
                        value={travelHoursTotal.toLocaleString('vi-VN')}
                        readOnly
                        className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-700 font-medium"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {travelHoursQty} SL x {travelHoursTime.toLocaleString('vi-VN')} thời gian x {travelHoursUnitPrice.toLocaleString('vi-VN')} đ = {travelHoursTotal.toLocaleString('vi-VN')}
                  </p>
                </div>

                {/* Theo hàng hóa */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Theo hàng hóa</h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Mã hàng</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Nội dung</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">Số lượng</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">Đơn giá</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(goodsByKey.values()).map((item, idx) => {
                          const price = goodsPriceMap.get(getGoodsKey(item.productCode, item.inspectionContent)) || 0;
                          return (
                            <tr key={idx} className="border-t border-slate-100">
                              <td className="px-4 py-2">{item.productCode}</td>
                              <td className="px-4 py-2">{item.inspectionContent}</td>
                              <td className="px-4 py-2 text-right">{item.quantity.toLocaleString('vi-VN')}</td>
                              <td className="px-4 py-2 text-right">
                                <NumberInput
                                  value={price}
                                  onChange={(val) => {
                                    setGoodsPriceMap(prev => {
                                      const next = new Map(prev);
                                      next.set(getGoodsKey(item.productCode, item.inspectionContent), val);
                                      return next;
                                    });
                                  }}
                                  className="w-24 px-2 py-1 border border-slate-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  min={0}
                                />
                              </td>
                              <td className="px-4 py-2 text-right">{(item.quantity * price).toLocaleString('vi-VN')}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td colSpan={4} className="px-4 py-2 text-right font-medium">Tổng:</td>
                          <td className="px-4 py-2 text-right font-medium">{calculateGoodsTotal().toLocaleString('vi-VN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Theo QC */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Theo QC + OT</h3>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm" style={{ minWidth: '900px' }}>
                      <thead className="bg-slate-50">
                        <tr>
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
                        {selectedReport.productivity?.map((p, idx) => {
                          const hasQc = p.qcQuantity && p.qcQuantity > 0;
                          const hasOt = p.ot && p.ot > 0;
                          if (!hasQc && !hasOt) return null;
                          const key = getHoursKey(p);
                          const qcH = hoursMap.get(key)?.qcHours || '';
                          const otH = hoursMap.get(key)?.otHours || '';
                          const qcPrice = qcPriceMap.get(key) || 0;
                          const otPrice = otPriceMap.get(key) || 0;
                          return (
                            <tr key={idx} className="border-t border-slate-100">
                              <td className="px-3 py-2">{p.recordDate ? new Date(p.recordDate).toLocaleDateString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2">
                                {hasQc ? (
                                  <NumberInput
                                    value={qcH}
                                    onChange={(val) => {
                                      setHoursMap(prev => {
                                        const next = new Map(prev);
                                        const entry = next.get(key) || { qcHours: 0, otHours: 0 };
                                        next.set(key, { ...entry, qcHours: val });
                                        return next;
                                      });
                                    }}
                                    className="w-16 px-1 py-0.5 border border-slate-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="1"
                                    min={0}
                                    step={0.5}
                                  />
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right">{hasQc ? p.qcQuantity?.toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">
                                {hasQc ? (
                                  <NumberInput
                                    value={qcPrice}
                                    onChange={(val) => {
                                      setQcPriceMap(prev => {
                                        const next = new Map(prev);
                                        next.set(key, val);
                                        return next;
                                      });
                                    }}
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    min={0}
                                  />
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right">{hasQc ? ((p.qcQuantity || 0) * qcPrice * eff(hoursMap.get(key)?.qcHours)).toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2">
                                {hasOt ? (
                                  <NumberInput
                                    value={otH}
                                    onChange={(val) => {
                                      setHoursMap(prev => {
                                        const next = new Map(prev);
                                        const entry = next.get(key) || { qcHours: 0, otHours: 0 };
                                        next.set(key, { ...entry, otHours: val });
                                        return next;
                                      });
                                    }}
                                    className="w-16 px-1 py-0.5 border border-slate-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="1"
                                    min={0}
                                    step={0.5}
                                  />
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right">{hasOt ? p.ot?.toLocaleString('vi-VN') : '-'}</td>
                              <td className="px-3 py-2 text-right">
                                {hasOt ? (
                                  <NumberInput
                                    value={otPrice}
                                    onChange={(val) => {
                                      setOtPriceMap(prev => {
                                        const next = new Map(prev);
                                        next.set(key, val);
                                        return next;
                                      });
                                    }}
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    min={0}
                                  />
                                ) : '-'}
                              </td>
                              <td className="px-3 py-2 text-right">{hasOt ? ((p.ot || 0) * otPrice * eff(hoursMap.get(key)?.otHours)).toLocaleString('vi-VN') : '-'}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-slate-200 bg-slate-50">
                          <td colSpan={4} className="px-3 py-2 text-right font-medium">Tổng QC:</td>
                          <td className="px-3 py-2 text-right font-medium">{calculateQcTotal().toLocaleString('vi-VN')}</td>
                          <td colSpan={3} className="px-3 py-2 text-right font-medium">Tổng OT:</td>
                          <td className="px-3 py-2 text-right font-medium">{calculateOtTotal().toLocaleString('vi-VN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Custom Calculation Tables */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-700">Tính tùy chỉnh</h3>
                    <button
                      type="button"
                      onClick={addCustomTable}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm bảng tính
                    </button>
                  </div>

                  {customTables.map((table, tIdx) => {
                    const rowTotals = table.rows.map(row => row.reduce((p, v) => p * (v || 0), 1));
                    const tableTotal = rowTotals.reduce((s, t) => s + t, 0);
                    return (
                      <div key={tIdx} className="mb-4 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <input
                            type="text"
                            value={table.name}
                            onChange={(e) => updateCustomTableName(tIdx, e.target.value)}
                            className="text-sm font-semibold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomTable(tIdx)}
                            className="text-red-400 hover:text-red-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500">Số cột:</label>
                            <NumberInput
                              value={table.columnNames.length}
                              onChange={(val) => updateCustomTableColumnCount(tIdx, Math.max(2, val))}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                              min={2}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-slate-500">Số hàng:</label>
                            <NumberInput
                              value={table.rows.length}
                              onChange={(val) => updateCustomTableRowCount(tIdx, Math.max(1, val))}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center"
                              min={1}
                            />
                          </div>
                        </div>
                        {/* Column names */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm" style={{ minWidth: `${(table.columnNames.length + 1) * 120}px` }}>
                            <thead className="bg-slate-50">
                              <tr>
                                {table.columnNames.map((colName, cIdx) => (
                                  <th key={cIdx} className="px-2 py-1">
                                    <input
                                      type="text"
                                      value={colName}
                                      onChange={(e) => updateCustomTableColumnName(tIdx, cIdx, e.target.value)}
                                      className="w-full text-center text-xs font-medium text-slate-600 bg-transparent border-b border-slate-300 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                                    />
                                  </th>
                                ))}
                                <th className="px-2 py-1 text-xs font-medium text-slate-600 text-right">Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row, rIdx) => (
                                <tr key={rIdx} className="border-t border-slate-100">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-2 py-1">
                                      <NumberInput
                                        value={cell}
                                        onChange={(val) => updateCustomTableCell(tIdx, rIdx, cIdx, val)}
                                        className="w-full px-2 py-1 border border-slate-300 rounded text-right text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        min={0}
                                      />
                                    </td>
                                  ))}
                                  <td className="px-2 py-1 text-right font-medium">{rowTotals[rIdx].toLocaleString('vi-VN')}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-slate-200 bg-slate-50">
                                <td colSpan={table.columnNames.length} className="px-2 py-1 text-right font-medium text-sm">Tổng:</td>
                                <td className="px-2 py-1 text-right font-bold text-sm">{tableTotal.toLocaleString('vi-VN')}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
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
