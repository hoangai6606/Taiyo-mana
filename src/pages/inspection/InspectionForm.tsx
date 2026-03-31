import { useState, useEffect, useRef } from 'react';
import { Upload, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import type { Factory, InspectionItem } from '../../lib/database.types';

interface Props {
  onBack: () => void;
  onSaved: () => void;
}

interface ProductivityRow {
  recordDate: string;
  qcQuantity: number;
  transitQuantity: number;
  ot: number;
}

interface FormData {
  code: string;
  customerName: string;
  factoryId: string;
  inspectionDate: string;
  items: InspectionItem[];
  reports: {
    specifications: number;
    accessories: number;
    appearance: number;
    fabric: number;
    dirty: number;
    seamDefect: number;
    other: number;
    metalCheck: number;
  };
  productivity: ProductivityRow[];
}

const emptyItem = (): InspectionItem => ({
  id: '',
  recordId: '',
  inspectionDate: null,
  inspectionContent: '',
  productCode: '',
  brand: '',
  productName: '',
  color: '',
  size: '',
  inspectedQuantity: 0,
  passedQuantity: 0,
  defectiveQuantity: 0,
  specifications: 0,
  accessories: 0,
  appearance: 0,
  fabric: 0,
  dirty: 0,
  seamDefect: 0,
  other: 0,
  metalCheck: 0,
});

export default function InspectionForm({ onBack, onSaved }: Props) {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emptyProductivityRow = (): ProductivityRow => ({
    recordDate: new Date().toISOString().split('T')[0],
    qcQuantity: 0,
    transitQuantity: 0,
    ot: 0,
  });

  const [form, setForm] = useState<FormData>({
    code: '',
    customerName: '',
    factoryId: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    items: [emptyItem()],
    reports: {
      specifications: 0,
      accessories: 0,
      appearance: 0,
      fabric: 0,
      dirty: 0,
      seamDefect: 0,
      other: 0,
      metalCheck: 0,
    },
    productivity: [],
  });

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async () => {
    try {
      const factoriesData = await api.factories.list();
      setFactories(factoriesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      setError('Vui lòng nhập mã phiếu');
      return;
    }
    if (!form.customerName.trim()) {
      setError('Vui lòng nhập tên khách hàng');
      return;
    }
    if (!form.factoryId) {
      setError('Vui lòng chọn nhà máy');
      return;
    }
    if (form.items.length === 0 || !form.items[0].productCode) {
      setError('Vui lòng nhập ít nhất một chi tiết hàng hóa');
      return;
    }

    const validProductivity = form.productivity.filter(p => p.qcQuantity > 0);
    if (validProductivity.length === 0) {
      setError('Vui lòng nhập ít nhất một dòng năng suất với số lượng QC');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.inspectionRecords.create({
        code: form.code,
        customerName: form.customerName,
        factoryIds: form.factoryId ? [form.factoryId] : [],
        inspectionDate: form.inspectionDate,
        items: form.items,
        reports: form.reports,
        productivity: validProductivity,
      } as any);
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number | Date | null)[][];

        const excelToDate = (serial: number): string => {
          if (!serial || isNaN(serial)) return form.inspectionDate;
          // 25569 = days from Excel epoch (1899-12-30) to Unix epoch (1970-01-01)
          const ms = Math.round((serial - 25569) * 86400000);
          const d = new Date(ms);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        };

        const getCell = (row: (string | number | Date | null)[], idx: number): string | number | Date | null => {
          return idx >= 0 && idx < row.length ? row[idx] : null;
        };

        // Helper function to parse date string dạng "d/m" (dd/mm/yy rút gọn)
        // Ví dụ: "5/9" = day=5, month=9 (05/09/yy)
        // "9/3" = day=9, month=3 (09/03/yy)
        // "16/3" = day=16, month=3 (16/03/yy)
        // Ưu tiên lấy năm từ inspectionDate vì đây là ngày kiểm hàng chính
        const parseDMDate = (val: string): string => {
          const parts = val.split('/');
          if (parts.length !== 2) return form.inspectionDate;
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          // Validate: day 1-31, month 1-12
          if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 1 || month > 12) {
            return form.inspectionDate;
          }
          // Lấy năm từ inspectionDate (đây là ngày kiểm hàng chính)
          const year = new Date(form.inspectionDate).getFullYear();
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        };

        const parseDate = (val: string | number | Date | null): string => {
          if (!val || val === '') return form.inspectionDate;
          if (val instanceof Date) {
            // Sử dụng local methods thay vì toISOString() để tránh timezone shift
            return `${val.getUTCFullYear()}-${String(val.getUTCMonth() + 1).padStart(2, '0')}-${String(val.getUTCDate()).padStart(2, '0')}`;
          }
          if (typeof val === 'number') {
            // Excel serial numbers are typically > 40000 for dates after 2009
            if (val > 40000 && val < 60000) {
              return excelToDate(val);
            }
            // Small numbers are not valid dates in this context
            return form.inspectionDate;
          }
          if (typeof val === 'string') {
            // Nếu có dấu /, đây là format d/m (dd/mm/yy rút gọn)
            if (val.includes('/')) {
              return parseDMDate(val);
            }
            const num = parseFloat(val);
            // Nếu là số nhỏ (1-31), có thể là serial của Excel cho ngày trong tháng
            if (!isNaN(num) && num >= 1 && num <= 31 && !val.includes('/')) {
              const year = new Date(form.inspectionDate).getFullYear();
              const month = new Date(form.inspectionDate).getMonth() + 1;
              return `${year}-${String(month).padStart(2, '0')}-${String(Math.floor(num)).padStart(2, '0')}`;
            }
            const parsed = new Date(val);
            if (!isNaN(parsed.getTime())) {
              // Sử dụng local methods thay vì toISOString() để tránh timezone shift
              return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
            }
          }
          return form.inspectionDate;
        };

        const parseNum = (val: string | number | Date | null): number => {
          if (val == null || val === '') return 0;
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            const cleaned = val.replace(/[^\d.-]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          }
          return 0;
        };

        // Helper: check if cell has valid date value (not empty)
        const hasValidDate = (row: (string | number | Date | null)[], colIndex: number): boolean => {
          const val = getCell(row, colIndex);
          return val !== undefined && val !== null && val !== '';
        };

        // Auto-detect file format: check row 3 for Japanese characters (testtaiyo.xlsx format)
        const isTestTaiyoFormat = (() => {
          const row3 = json[3] || [];
          return row3.some(cell => {
            const val = String(cell || '');
            // Check for Japanese characters (Hiragana, Katakana, Kanji)
            return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(val);
          });
        })();

        let dataRows: (string | number | Date | null)[][];
        let col: Record<string, number>;

        if (isTestTaiyoFormat) {
          // testtaiyo.xlsx format: 4 header rows (0-3), data starts at row 4
          // Row 0: Section headers (P1, P2, P3)
          // Row 1: Vietnamese column names
          // Row 2: English column names
          // Row 3: Japanese column names
          dataRows = json.slice(4).filter(row => row.some(cell => cell !== '' && cell != null));

          // Fixed column indices for testtaiyo.xlsx
          // Vietnamese headers row 1: Dơ(14), Lỗi may(15), Khác(16)
          col = {
            date: 0,
            content: 1,
            productCode: 2,
            brand: 3,
            productName: 4,
            color: 5,
            size: 6,
            inspectedQty: 7,
            passedQty: 8,
            defectiveQty: 9,
            specifications: -1,
            accessories: -1,
            appearance: -1,
            fabric: -1,
            dirty: 14,
            seamDefect: 15,
            other: 16,
            metalCheck: -1,
            qcQty: 21,
            transitHours: 22,
            workingHours: -1,
            otHours: 24,
          };
        } else {
          // Hoàng Daily Link File format: 6 header rows (0-5), data starts at row 6
          dataRows = json.slice(6).filter(row => row.some(cell => cell !== '' && cell != null));

          // Find column indices based on header row (row 3-5 contain Vietnamese headers)
          const headerRow = json[3] || [];
          const findColIndex = (keys: string[]): number => {
            for (let col = 0; col < headerRow.length; col++) {
              const cell = String(headerRow[col] || '').toLowerCase();
              for (const key of keys) {
                if (cell.includes(key.toLowerCase())) return col;
              }
            }
            return -1;
          };

          col = {
            date: findColIndex(['ngày kiểm', 'ngay kiem']),
            content: findColIndex(['nội dung', 'noi dung']),
            productCode: findColIndex(['mã hàng', 'ma hang']),
            brand: findColIndex(['thương hiệu', 'thuong hieu']),
            productName: findColIndex(['tên hàng', 'ten hang']),
            color: findColIndex(['màu', 'mau']),
            size: findColIndex(['size']),
            inspectedQty: findColIndex(['sl kiểm', 'sl kiem', 'sl_kiem']),
            passedQty: findColIndex(['hàng đạt', 'hang dat']),
            defectiveQty: findColIndex(['hàng hư', 'hang hu']),
            specifications: findColIndex(['thông số', 'thong so']),
            accessories: findColIndex(['phụ liệu', 'phu lieu']),
            appearance: findColIndex(['ngoại quan', 'ngoai quan']),
            fabric: findColIndex(['vải', 'vai']),
            dirty: findColIndex(['dơ', 'do']),
            seamDefect: findColIndex(['lỗi may', 'loi may']),
            other: findColIndex(['khác', 'khac']),
            metalCheck: findColIndex(['kiểm kim', 'kiem kim']),
            qcQty: findColIndex(['sl qc', 'sl_qc']),
            transitHours: findColIndex(['giờ đi đường', 'gio di duong', 'transit']),
            workingHours: findColIndex(['thời gian làm việc', 'thoi gian lam viec']),
            otHours: findColIndex(['thời gian tăng ca', 'thoi gian tang ca', 'ot']),
          };
        }

        // Build items from data rows
        const newItems = dataRows.map(row => ({
          ...emptyItem(),
          inspectionDate: parseDate(getCell(row, col.date)),
          inspectionContent: String(getCell(row, col.content) || ''),
          productCode: String(getCell(row, col.productCode) || ''),
          brand: String(getCell(row, col.brand) || ''),
          productName: String(getCell(row, col.productName) || ''),
          color: String(getCell(row, col.color) || ''),
          size: String(getCell(row, col.size) || ''),
          inspectedQuantity: parseNum(getCell(row, col.inspectedQty)),
          passedQuantity: parseNum(getCell(row, col.passedQty)),
          defectiveQuantity: parseNum(getCell(row, col.defectiveQty)),
          specifications: parseNum(getCell(row, col.specifications)),
          accessories: parseNum(getCell(row, col.accessories)),
          appearance: parseNum(getCell(row, col.appearance)),
          fabric: parseNum(getCell(row, col.fabric)),
          dirty: parseNum(getCell(row, col.dirty)),
          seamDefect: parseNum(getCell(row, col.seamDefect)),
          other: parseNum(getCell(row, col.other)),
          metalCheck: parseNum(getCell(row, col.metalCheck)),
        })).filter(item => item.productCode || item.productName);

        // Extract daily report data from first row
        const firstRow = dataRows[0] || [];
        const reports = {
          specifications: parseNum(getCell(firstRow, col.specifications)),
          accessories: parseNum(getCell(firstRow, col.accessories)),
          appearance: parseNum(getCell(firstRow, col.appearance)),
          fabric: parseNum(getCell(firstRow, col.fabric)),
          dirty: parseNum(getCell(firstRow, col.dirty)),
          seamDefect: parseNum(getCell(firstRow, col.seamDefect)),
          other: parseNum(getCell(firstRow, col.other)),
          metalCheck: parseNum(getCell(firstRow, col.metalCheck)),
        };

        // Extract per-day productivity data and group by date
        const productivityByDate: Record<string, { qcQuantity: number; transitQuantity: number; ot: number }> = {};
        dataRows.forEach(row => {
          // Skip rows without valid date - prevents fallback to form.inspectionDate
          if (!hasValidDate(row, col.date)) return;

          const date = parseDate(getCell(row, col.date));
          if (!productivityByDate[date]) {
            productivityByDate[date] = { qcQuantity: 0, transitQuantity: 0, ot: 0 };
          }
          productivityByDate[date].qcQuantity += parseNum(getCell(row, col.qcQty));
          productivityByDate[date].transitQuantity += parseNum(getCell(row, col.transitHours));
          productivityByDate[date].ot += parseNum(getCell(row, col.otHours));
        });

        const productivity = Object.entries(productivityByDate).map(([recordDate, data]) => ({
          recordDate,
          qcQuantity: data.qcQuantity,
          transitQuantity: data.transitQuantity,
          ot: data.ot,
        }));

        if (newItems.length > 0) {
          setForm(prev => ({
            ...prev,
            items: newItems,
            reports: { ...prev.reports, ...reports },
            productivity: [...prev.productivity, ...productivity],
          }));
        }
      } catch (err) {
        console.error('Excel import error:', err);
        setError('Failed to parse Excel file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsBinaryString(file);
  };

  const updateItem = (index: number, field: keyof InspectionItem, value: any) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tạo Phiếu Kiểm Mới</h1>
            <p className="text-slate-500 text-sm mt-1">Nhập thông tin phiếu kiểm hàng QC</p>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Thông tin chung</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mã phiếu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập mã phiếu"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tên khách hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.customerName}
                onChange={e => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập tên khách hàng"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nhà máy <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.factoryId}
                onChange={e => setForm(prev => ({ ...prev, factoryId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên nhà máy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày kiểm hàng
              </label>
              <input
                type="date"
                value={form.inspectionDate}
                onChange={e => setForm(prev => ({ ...prev, inspectionDate: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Group A - Chi Tiết Hàng Hóa */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">A - Chi Tiết Hàng Hóa</h3>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleExcelImport}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Upload className="w-4 h-4" />
                Import Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold text-slate-700">Ngày KT</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-700">Nội dung</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-700">Mã hàng</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-700">Thương hiệu</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-700">Tên hàng</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-700">Màu</th>
                  <th className="px-2 py-2 text-left font-semibold text-slate-700">Size</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">SL KT</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Hàng đạt</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Hàng hư</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Thông số</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Phụ liệu</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Ngoại quan</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Vải</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Dơ</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Lỗi may</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Khác</th>
                  <th className="px-2 py-2 text-right font-semibold text-slate-700">Kiểm kim</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={item.inspectionDate || ''}
                        onChange={e => updateItem(index, 'inspectionDate', e.target.value)}
                        className="w-28 px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.inspectionContent}
                        onChange={e => updateItem(index, 'inspectionContent', e.target.value)}
                        className="w-32 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Nội dung"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.productCode}
                        onChange={e => updateItem(index, 'productCode', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Mã hàng"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.brand}
                        onChange={e => updateItem(index, 'brand', e.target.value)}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Brand"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={e => updateItem(index, 'productName', e.target.value)}
                        className="w-24 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Tên hàng"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.color}
                        onChange={e => updateItem(index, 'color', e.target.value)}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Màu"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={item.size}
                        onChange={e => updateItem(index, 'size', e.target.value)}
                        className="w-14 px-2 py-1 border border-slate-300 rounded text-xs"
                        placeholder="Size"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.inspectedQuantity || ''}
                        onChange={e => updateItem(index, 'inspectedQuantity', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.passedQuantity || ''}
                        onChange={e => updateItem(index, 'passedQuantity', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.defectiveQuantity || ''}
                        onChange={e => updateItem(index, 'defectiveQuantity', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.specifications || ''}
                        onChange={e => updateItem(index, 'specifications', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.accessories || ''}
                        onChange={e => updateItem(index, 'accessories', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.appearance || ''}
                        onChange={e => updateItem(index, 'appearance', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.fabric || ''}
                        onChange={e => updateItem(index, 'fabric', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.dirty || ''}
                        onChange={e => updateItem(index, 'dirty', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.seamDefect || ''}
                        onChange={e => updateItem(index, 'seamDefect', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.other || ''}
                        onChange={e => updateItem(index, 'other', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        value={item.metalCheck || ''}
                        onChange={e => updateItem(index, 'metalCheck', Number(e.target.value))}
                        className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        disabled={form.items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Thêm dòng
          </button>
        </div>

        {/* Group C - Theo Dõi Năng Suất */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">C - Theo Dõi Năng Suất</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Ngày</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">SL QC</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">OT</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.productivity.map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={row.recordDate}
                        onChange={e => {
                          const newProductivity = [...form.productivity];
                          newProductivity[index] = { ...newProductivity[index], recordDate: e.target.value };
                          setForm(prev => ({ ...prev, productivity: newProductivity }));
                        }}
                        className="w-28 px-2 py-1 border border-slate-300 rounded text-xs"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.qcQuantity || ''}
                        onChange={e => {
                          const newProductivity = [...form.productivity];
                          newProductivity[index] = { ...newProductivity[index], qcQuantity: Number(e.target.value) };
                          setForm(prev => ({ ...prev, productivity: newProductivity }));
                        }}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={row.ot || ''}
                        onChange={e => {
                          const newProductivity = [...form.productivity];
                          newProductivity[index] = { ...newProductivity[index], ot: Number(e.target.value) };
                          setForm(prev => ({ ...prev, productivity: newProductivity }));
                        }}
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-xs text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (form.productivity.length > 1) {
                            setForm(prev => ({
                              ...prev,
                              productivity: prev.productivity.filter((_, i) => i !== index),
                            }));
                          }
                        }}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        disabled={form.productivity.length === 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(prev => ({
                ...prev,
                productivity: [...prev.productivity, emptyProductivityRow()],
              }));
            }}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Thêm ngày
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu Phiếu Kiểm'}
          </button>
        </div>
      </form>
    </div>
  );
}