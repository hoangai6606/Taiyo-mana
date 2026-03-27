import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { ProductStyle, Customer, Factory, ProductTypeRecord } from '../../lib/database.types';
import {
  MOCK_PRODUCT_STYLES, MOCK_CUSTOMERS, MOCK_FACTORIES, MOCK_PRODUCT_TYPES,
} from '../../lib/mock-data';
import { Modal } from '../../components/ui/Modal';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Package, Plus, Search, CreditCard as Edit2, ToggleLeft, ToggleRight } from 'lucide-react';

interface StyleRow extends ProductStyle {
  customer: Customer;
  factory: Factory;
  product_type: ProductTypeRecord;
}

interface FormState {
  style_code: string;
  name: string;
  customer_id: string;
  factory_id: string;
  product_type_id: string;
}

const empty: FormState = { style_code: '', name: '', customer_id: '', factory_id: '', product_type_id: '' };

function buildRows(styles: ProductStyle[]): StyleRow[] {
  return styles.map(s => ({
    ...s,
    customer: MOCK_CUSTOMERS.find(c => c.id === s.customer_id) ?? MOCK_CUSTOMERS[0],
    factory: MOCK_FACTORIES.find(f => f.id === s.factory_id) ?? MOCK_FACTORIES[0],
    product_type: MOCK_PRODUCT_TYPES.find(t => t.id === s.product_type_id) ?? MOCK_PRODUCT_TYPES[0],
  }));
}

export function ProductStylesTab() {
  const { isManager } = useAuth();
  const [rows, setRows] = useState<StyleRow[]>(buildRows(MOCK_PRODUCT_STYLES));
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');

  const openCreate = () => { setEditId(null); setForm(empty); setError(''); setShowModal(true); };
  const openEdit = (r: StyleRow) => {
    setEditId(r.id);
    setForm({ style_code: r.style_code, name: r.name, customer_id: r.customer_id, factory_id: r.factory_id, product_type_id: r.product_type_id });
    setError(''); setShowModal(true);
  };

  const save = () => {
    if (!form.style_code.trim()) { setError('Vui lòng nhập mã hàng'); return; }
    if (!form.customer_id) { setError('Vui lòng chọn khách hàng'); return; }
    if (!form.factory_id) { setError('Vui lòng chọn nhà máy'); return; }
    if (!form.product_type_id) { setError('Vui lòng chọn loại sản phẩm'); return; }
    const id = editId ?? `style-${Date.now()}`;
    const payload: ProductStyle = {
      id,
      style_code: form.style_code.trim().toUpperCase(),
      name: form.name.trim(),
      customer_id: form.customer_id,
      factory_id: form.factory_id,
      product_type_id: form.product_type_id,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'user-001',
    };
    const newRow: StyleRow = {
      ...payload,
      customer: MOCK_CUSTOMERS.find(c => c.id === payload.customer_id)!,
      factory: MOCK_FACTORIES.find(f => f.id === payload.factory_id)!,
      product_type: MOCK_PRODUCT_TYPES.find(t => t.id === payload.product_type_id)!,
    };
    if (editId) {
      setRows(prev => prev.map(r => r.id === editId ? { ...r, ...newRow } : r));
    } else {
      setRows(prev => [newRow, ...prev]);
    }
    setShowModal(false);
  };

  const toggleActive = (id: string, active: boolean) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, active: !active } : r));
  };

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.style_code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.customer.name.toLowerCase().includes(q);
  });

  const typeColor: Record<string, string> = {
    SHOE: 'bg-blue-100 text-blue-700',
    BAG: 'bg-emerald-100 text-emerald-700',
    BELT: 'bg-amber-100 text-amber-700',
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hàng..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {isManager && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Thêm mã hàng
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center"><Package className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chưa có mã hàng nào</p></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full bg-white">
            <thead><tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mã hàng</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Khách hàng</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Nhà máy</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Loại</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Trạng thái</th>
              {isManager && <th className="px-4 py-3 w-10" />}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(r => (
                <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${!r.active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 text-sm">{r.style_code}</p>
                    {r.name && <p className="text-xs text-slate-400">{r.name}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-sm text-slate-700">{r.customer.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-700">{r.factory.name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[r.product_type.code] ?? 'bg-slate-100 text-slate-600'}`}>{r.product_type.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(r.id, r.active)} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${r.active ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>
                      {r.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      {r.active ? 'Hoạt động' : 'Ngừng'}
                    </button>
                  </td>
                  {isManager && (
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'Sửa mã hàng' : 'Thêm mã hàng'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <ErrorAlert message={error} />}
            <FormField label="Mã hàng (Style Code)" required>
              <input className={inputClass} value={form.style_code} onChange={e => setForm(f => ({ ...f, style_code: e.target.value }))} placeholder="VD: BR-1120" />
            </FormField>
            <FormField label="Tên sản phẩm">
              <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mô tả ngắn" />
            </FormField>
            <FormField label="Khách hàng" required>
              <select className={selectClass} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">Chọn khách hàng</option>
                {MOCK_CUSTOMERS.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Nhà máy" required>
              <select className={selectClass} value={form.factory_id} onChange={e => setForm(f => ({ ...f, factory_id: e.target.value }))}>
                <option value="">Chọn nhà máy</option>
                {MOCK_FACTORIES.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </FormField>
            <FormField label="Loại sản phẩm" required>
              <select className={selectClass} value={form.product_type_id} onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value }))}>
                <option value="">Chọn loại</option>
                {MOCK_PRODUCT_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={save} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Lưu</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
