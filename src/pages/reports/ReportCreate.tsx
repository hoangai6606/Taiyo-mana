import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import type { InspectionRecord, InspectionItem, ProductivityTracking } from '../../lib/database.types';
import { ArrowLeft, Plus, X, Save } from 'lucide-react';

const SIZE_ORDER = ['SS', 'S', 'M', 'L', 'LL', 'EL', '3L', '4L', '5L', '6L', '7L', '8L'];

interface Props {
  onBack: () => void;
  onSaved: () => void;
}

export default function ReportCreate({ onBack, onSaved }: Props) {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [availableItems, setAvailableItems] = useState<InspectionItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterMode, setFilterMode] = useState<'code' | 'date' | ''>('');
  const [checkedCodes, setCheckedCodes] = useState<Set<string>>(new Set());
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  const [filterCode, setFilterCode] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [sourceProductivity, setSourceProductivity] = useState<ProductivityTracking[]>([]);

  useEffect(() => { loadRecords(); }, []);

  // Clear checkedCodes when checkedDates changes to avoid stale codes
  useEffect(() => { setCheckedCodes(new Set()); }, [checkedDates]);

  const loadRecords = async () => {
    try {
      const data = await api.inspectionRecords.list();
      setRecords(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRecord = async (recordId: string) => {
    setSelectedRecordId(recordId);
    setSelectedItems([]);
    setFilterMode('');
    setCheckedCodes(new Set());
    setCheckedDates(new Set());
    setFilterCode('');
    setFilterColor('');
    setFilterSize('');
    if (!recordId) {
      setAvailableItems([]);
      setSourceProductivity([]);
      return;
    }
    setLoading(true);
    try {
      const fullRecord = await api.inspectionRecords.getById(recordId);
      setAvailableItems(fullRecord.items || []);
      setSourceProductivity(fullRecord.productivity || []);
    } catch (err) {
      console.error(err);
      alert('Không thể tải dữ liệu phiếu kiểm');
      setAvailableItems([]);
    } finally {
      setLoading(false);
    }
  };

  const sourceRecord = records.find(r => r.id === selectedRecordId);
  const uniqueCodes = useMemo(() => [...new Set(availableItems.map(i => i.productCode).filter(Boolean))].sort(), [availableItems]);
  const uniqueDates = useMemo(() => {
    const dates = [...new Set(availableItems.map(i => i.inspectionDate).filter(Boolean))];
    return dates.sort().reverse();
  }, [availableItems]);
  const codesForSelectedDates = useMemo(() => {
    if (filterMode !== 'date' || checkedDates.size === 0) return [];
    return [...new Set(
      availableItems
        .filter(i => i.inspectionDate != null && checkedDates.has(i.inspectionDate))
        .map(i => i.productCode)
        .filter(Boolean)
    )].sort();
  }, [availableItems, filterMode, checkedDates]);

  const colorsForCode = useMemo(() => {
    if (!filterCode) return [];
    return [...new Set(availableItems.filter(i => i.productCode === filterCode).map(i => i.color).filter(Boolean))].sort();
  }, [availableItems, filterCode]);
  const sizesForCodeColor = useMemo(() => {
    if (!filterCode || !filterColor) return [];
    const sizes = [...new Set(availableItems.filter(i => i.productCode === filterCode && i.color === filterColor).map(i => i.size).filter(Boolean))];
    return sizes.sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a);
      const bi = SIZE_ORDER.indexOf(b);
      if (ai < 0 && bi < 0) return a.localeCompare(b);
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });
  }, [availableItems, filterCode, filterColor]);

  const selectedIds = useMemo(() => new Set(selectedItems.map(i => i.id)), [selectedItems]);

  const filteredProductivity = useMemo(() => {
    const normalize = (d: string | Date | null | undefined): string =>
      !d ? '' : (typeof d === 'string' ? d : new Date(d).toISOString()).slice(0, 10);

    const dates = new Set(
      selectedItems
        .map(i => normalize(i.inspectionDate))
        .filter(Boolean)
    );

    // Fallback: dùng record's inspectionDate nếu items không có date
    if (dates.size === 0 && sourceRecord?.inspectionDate) {
      const fallback = normalize(sourceRecord.inspectionDate);
      if (fallback) dates.add(fallback);
    }

    if (dates.size === 0) return [];
    return sourceProductivity.filter(p => dates.has(normalize(p.recordDate)));
  }, [sourceProductivity, selectedItems, sourceRecord?.inspectionDate]);

  const handleAddCheckedCodes = () => {
    if (checkedCodes.size === 0) return;
    const toAdd = availableItems.filter(i => checkedCodes.has(i.productCode) && !selectedIds.has(i.id));
    if (toAdd.length === 0) { setCheckedCodes(new Set()); return; }
    setSelectedItems(prev => sortItems([...prev, ...toAdd]));
    setCheckedCodes(new Set());
  };

  const handleAddCheckedDates = () => {
    if (checkedDates.size === 0) return;
    const toAdd = availableItems.filter(i => i.inspectionDate != null && checkedDates.has(i.inspectionDate) && !selectedIds.has(i.id));
    if (toAdd.length === 0) { setCheckedDates(new Set()); return; }
    setSelectedItems(prev => sortItems([...prev, ...toAdd]));
    setCheckedDates(new Set());
  };

  const handleAddDateFilteredCodes = () => {
    if (checkedDates.size === 0 || checkedCodes.size === 0) return;
    const toAdd = availableItems.filter(
      i => i.inspectionDate != null
        && checkedDates.has(i.inspectionDate)
        && checkedCodes.has(i.productCode)
        && !selectedIds.has(i.id)
    );
    if (toAdd.length === 0) { setCheckedCodes(new Set()); return; }
    setSelectedItems(prev => sortItems([...prev, ...toAdd]));
    setCheckedCodes(new Set());
  };

  const handleAddVariant = () => {
    if (!filterCode || !filterColor || !filterSize) return;
    const item = availableItems.find(
      i => i.productCode === filterCode && i.color === filterColor && i.size === filterSize && !selectedIds.has(i.id)
    );
    if (!item) return;
    setSelectedItems(prev => sortItems([...prev, item]));
    setFilterSize('');
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== itemId));
  };

  const sortItems = (items: InspectionItem[]): InspectionItem[] => {
    return items.sort((a, b) => {
      const codeDiff = a.productCode.localeCompare(b.productCode);
      if (codeDiff !== 0) return codeDiff;
      const colorDiff = a.color.localeCompare(b.color);
      if (colorDiff !== 0) return colorDiff;
      const ai = SIZE_ORDER.indexOf(a.size);
      const bi = SIZE_ORDER.indexOf(b.size);
      if (ai < 0 && bi < 0) return a.size.localeCompare(b.size);
      if (ai < 0) return 1;
      if (bi < 0) return -1;
      return ai - bi;
    });
  };

  const doSave = async (status: 'draft' | 'finalized') => {
    if (!selectedRecordId) {
      alert('Vui lòng chọn phiếu kiểm nguồn');
      return;
    }
    if (selectedItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 item');
      return;
    }

    setSaving(true);
    try {
      await api.inspectionReports.create({
        sourceRecordId: selectedRecordId,
        customerName: sourceRecord?.customerName,
        factoryNames: sourceRecord?.factoryNames,
        inspectionDate: sourceRecord?.inspectionDate,
        status,
        items: selectedItems,
        productivity: filteredProductivity,
      } as any);
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Lưu báo cáo thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedRecordId || selectedItems.length === 0) {
      alert('Vui lòng chọn phiếu kiểm và ít nhất 1 item');
      return;
    }
    setSaving(true);
    try {
      await api.inspectionReports.create({
        sourceRecordId: selectedRecordId,
        customerName: sourceRecord?.customerName,
        factoryNames: sourceRecord?.factoryNames,
        inspectionDate: sourceRecord?.inspectionDate,
        status: 'finalized',
        items: selectedItems,
        productivity: filteredProductivity,
      } as any);
      onSaved();
    } catch (err) {
      console.error(err);
      alert('Lưu báo cáo thất bại');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Tạo báo cáo</h1>
      </div>

      {/* Step 1: Select source record */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <h2 className="font-semibold text-slate-700 mb-3">1. Chọn phiếu kiểm nguồn</h2>
        <select
          value={selectedRecordId}
          onChange={e => handleSelectRecord(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Chọn phiếu kiểm --</option>
          {records.map(r => (
            <option key={r.id} value={r.id}>
              {r.code} — {r.customerName || 'N/A'} — {formatDate(r.inspectionDate)}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2: Filter controls */}
      {selectedRecordId && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 mb-3">2. Chọn items</h2>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Mode selector */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">Chọn phương thức lọc</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFilterMode('code'); setCheckedDates(new Set()); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      filterMode === 'code'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    Theo mã hàng
                  </button>
                  <button
                    onClick={() => { setFilterMode('date'); setCheckedCodes(new Set()); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      filterMode === 'date'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    Theo ngày kiểm
                  </button>
                </div>
              </div>

              {/* Multi-select by product code */}
              {filterMode === 'code' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-500">Theo mã hàng</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCheckedCodes(new Set(uniqueCodes))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        onClick={() => setCheckedCodes(new Set())}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                    {uniqueCodes.map(code => (
                      <label
                        key={code}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                          checkedCodes.has(code)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checkedCodes.has(code)}
                          onChange={() => {
                            const next = new Set(checkedCodes);
                            if (next.has(code)) next.delete(code); else next.add(code);
                            setCheckedCodes(next);
                          }}
                          className="sr-only"
                        />
                        {code}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleAddCheckedCodes}
                    disabled={checkedCodes.size === 0}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Thêm đã chọn ({checkedCodes.size} mục)
                  </button>
                </div>
              )}

              {/* Multi-select by date */}
              {filterMode === 'date' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-500">Theo ngày kiểm</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCheckedDates(new Set(uniqueDates))}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Chọn tất cả
                      </button>
                      <button
                        onClick={() => setCheckedDates(new Set())}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                    {uniqueDates.map(date => (
                      <label
                        key={date}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                          checkedDates.has(date)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 border border-slate-300 hover:border-blue-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checkedDates.has(date)}
                          onChange={() => {
                            const next = new Set(checkedDates);
                            if (next.has(date)) next.delete(date); else next.add(date);
                            setCheckedDates(next);
                          }}
                          className="sr-only"
                        />
                        {formatDate(date)}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleAddCheckedDates}
                    disabled={checkedDates.size === 0}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Thêm đã chọn ({checkedDates.size} mục)
                  </button>

                  {/* Code filter within selected dates */}
                  {codesForSelectedDates.length > 0 && (
                    <div className="border-t border-slate-200 mt-3 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-500">Lọc mã hàng theo ngày</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCheckedCodes(new Set(codesForSelectedDates))}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            Chọn tất cả
                          </button>
                          <button
                            onClick={() => setCheckedCodes(new Set())}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Bỏ chọn tất cả
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                        {codesForSelectedDates.map(code => (
                          <label
                            key={code}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                              checkedCodes.has(code)
                                ? 'bg-green-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-300 hover:border-green-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checkedCodes.has(code)}
                              onChange={() => {
                                const next = new Set(checkedCodes);
                                if (next.has(code)) next.delete(code); else next.add(code);
                                setCheckedCodes(next);
                              }}
                              className="sr-only"
                            />
                            {code}
                          </label>
                        ))}
                      </div>
                      <button
                        onClick={handleAddDateFilteredCodes}
                        disabled={checkedCodes.size === 0}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium"
                      >
                        Thêm đã chọn ({checkedCodes.size} mục)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Add specific variant */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Thêm variant cụ thể</label>
                <div className="flex items-end gap-2">
                  <select
                    value={filterCode}
                    onChange={e => { setFilterCode(e.target.value); setFilterColor(''); setFilterSize(''); }}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Mã hàng</option>
                    {uniqueCodes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={filterColor}
                    onChange={e => { setFilterColor(e.target.value); setFilterSize(''); }}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    disabled={!filterCode}
                  >
                    <option value="">Màu</option>
                    {colorsForCode.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={filterSize}
                    onChange={e => setFilterSize(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    disabled={!filterColor}
                  >
                    <option value="">Size</option>
                    {sizesForCodeColor.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddVariant}
                    disabled={!filterCode || !filterColor || !filterSize}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Selected items table */}
      {selectedRecordId && !loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">
              3. Items đã chọn ({selectedItems.length})
            </h2>
            {selectedItems.length > 0 && (
              <button
                onClick={() => setSelectedItems([])}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {selectedItems.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">
              Sử dụng các filter phía trên để thêm items
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Ngày KT</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Mã hàng</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Màu</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Size</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">SL KT</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">SL đạt</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">SL lỗi</th>
                    <th className="text-right px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">{formatDate(item.inspectionDate)}</td>
                      <td className="px-3 py-2 font-mono">{item.productCode}</td>
                      <td className="px-3 py-2">{item.color}</td>
                      <td className="px-3 py-2">{item.size}</td>
                      <td className="px-3 py-2 text-right">{item.inspectedQuantity}</td>
                      <td className="px-3 py-2 text-right">{item.passedQuantity}</td>
                      <td className="px-3 py-2 text-right">{item.defectiveQuantity}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Part C - Productivity preview */}
      {selectedRecordId && !loading && selectedItems.length > 0 && (
        filteredProductivity.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 mb-3">
            4. C - Theo dõi năng suất ({filteredProductivity.length} ngày)
          </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Ngày</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Nhà máy</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">SL QC</th>
                    <th className="text-right px-3 py-2 font-medium text-slate-600">OT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProductivity.map(p => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">{formatDate(p.recordDate)}</td>
                      <td className="px-3 py-2">{p.factoryName || '-'}</td>
                      <td className="px-3 py-2 text-right">{p.qcQuantity}</td>
                      <td className="px-3 py-2 text-right">{p.ot}</td>
                    </tr>
                  ))}
                </tbody>
                {filteredProductivity.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-medium">
                      <td className="px-3 py-2" colSpan={2}>Tổng cộng</td>
                      <td className="px-3 py-2 text-right">{filteredProductivity.reduce((s, p) => s + (p.qcQuantity || 0), 0)}</td>
                      <td className="px-3 py-2 text-right">{filteredProductivity.reduce((s, p) => s + (p.ot || 0), 0)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
        </div>
      )}

      {/* Action buttons */}
      {selectedRecordId && !loading && selectedItems.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => doSave('draft')}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Lưu nháp
          </button>
          <button
            onClick={handleSaveReport}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Lưu phiếu
          </button>
        </div>
      )}
    </div>
  );
}
