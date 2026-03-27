import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { OrderLot, ProductStyle, Customer, Factory } from '../../lib/database.types';
import { ORDER_STATUS_LABELS } from '../../lib/database.types';
import {
  MOCK_ORDER_LOTS, MOCK_PRODUCT_STYLES, MOCK_CUSTOMERS, MOCK_FACTORIES, MOCK_QUANTITY_LOGS,
} from '../../lib/mock-data';
import { Modal } from '../../components/ui/Modal';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { ShoppingCart, Plus, Search, CreditCard as Edit2, Calendar, AlertTriangle } from 'lucide-react';

interface LotRow extends OrderLot {
  product_style: ProductStyle & { customer: Customer; factory: Factory };
  produced_qty: number;
}

interface FormState {
  product_style_id: string;
  lot_code: string;
  contract_no: string;
  debit_group: string;
  order_qty: string;
  unit_price: string;
  currency: string;
  delivery_date: string;
  status: string;
  notes: string;
}

const empty: FormState = {
  product_style_id: '', lot_code: '', contract_no: '', debit_group: '',
  order_qty: '', unit_price: '', currency: 'JPY', delivery_date: '', status: 'active', notes: '',
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function buildRows(lots: OrderLot[]): LotRow[] {
  const totals: Record<string, number> = {};
  MOCK_QUANTITY_LOGS.forEach(l => { totals[l.order_lot_id] = (totals[l.order_lot_id] || 0) + l.quantity; });
  return lots.map(l => {
    const style = MOCK_PRODUCT_STYLES.find(s => s.id === l.product_style_id)!;
    const customer = MOCK_CUSTOMERS.find(c => c.id === l.customer_id)!;
    const factory = MOCK_FACTORIES.find(f => f.id === l.factory_id)!;
    return { ...l, product_style: { ...style, customer, factory }, produced_qty: totals[l.id] || 0 };
  });
}

export function OrderLotsTab() {
  const { isManager } = useAuth();
  const [rows, setRows] = useState<LotRow[]>(buildRows(MOCK_ORDER_LOTS));
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');

  const activeStyles = MOCK_PRODUCT_STYLES.filter(s => s.active).map(s => ({
    ...s,
    customer: MOCK_CUSTOMERS.find(c => c.id === s.customer_id)!,
    factory: MOCK_FACTORIES.find(f => f.id === s.factory_id)!,
  }));

  const openCreate = () => { setEditId(null); setForm(empty); setError(''); setShowModal(true); };
  const openEdit = (r: LotRow) => {
    setEditId(r.id);
    setForm({
      product_style_id: r.product_style_id, lot_code: r.lot_code, contract_no: r.contract_no,
      debit_group: r.debit_group, order_qty: String(r.order_qty), unit_price: String(r.unit_price),
      currency: r.currency, delivery_date: r.delivery_date ?? '', status: r.status, notes: r.notes,
    });
    setError(''); setShowModal(true);
  };

  const save = () => {
    if (!form.product_style_id) { setError('Vui lòng chọn mã hàng'); return; }
    const qty = parseInt(form.order_qty);
    if (isNaN(qty) || qty < 0) { setError('Số lượng order không hợp lệ'); return; }
    const style = activeStyles.find(s => s.id === form.product_style_id)!;
    const payload: OrderLot = {
      id: editId ?? `lot-${Date.now()}`,
      product_style_id: form.product_style_id,
      customer_id: style.customer_id,
      factory_id: style.factory_id,
      lot_code: form.lot_code.trim(),
      contract_no: form.contract_no.trim(),
      debit_group: form.debit_group.trim(),
      order_qty: qty,
      unit_price: parseFloat(form.unit_price) || 0,
      currency: form.currency,
      delivery_date: form.delivery_date || null,
      status: form.status,
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'user-001',
      updated_by: null,
    };
    const existingProduced = editId ? (rows.find(r => r.id === editId)?.produced_qty ?? 0) : 0;
    const newRow: LotRow = { ...payload, product_style: style, produced_qty: existingProduced };
    if (editId) {
      setRows(prev => prev.map(r => r.id === editId ? newRow : r));
    } else {
      setRows(prev => [newRow, ...prev]);
    }
    setShowModal(false);
  };

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.lot_code.toLowerCase().includes(q) || r.product_style.style_code.toLowerCase().includes(q) || r.debit_group.toLowerCase().includes(q) || r.contract_no.toLowerCase().includes(q);
    const matchS = !filterStatus || r.status === filterStatus;
    return matchQ && matchS;
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hàng, lot code, debit group..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="active">Đang chạy</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
          <option value="">Tất cả</option>
        </select>
        {isManager && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Tạo Order Lot
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center"><ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chưa có đơn hàng nào</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const pct = r.order_qty > 0 ? r.produced_qty / r.order_qty : 0;
            const over = r.produced_qty > r.order_qty;
            return (
              <div key={r.id} className={`bg-white rounded-xl border p-4 ${over ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{r.product_style.style_code}</span>
                      {r.lot_code && <span className="text-slate-500 text-xs">{r.lot_code}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] ?? ''}`}>{ORDER_STATUS_LABELS[r.status as keyof typeof ORDER_STATUS_LABELS]}</span>
                      {over && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vượt order</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                      <span>{r.product_style.customer.name}</span>
                      {r.debit_group && <><span>·</span><span>DEBIT: {r.debit_group}</span></>}
                      {r.contract_no && <><span>·</span><span>{r.contract_no}</span></>}
                      {r.delivery_date && <><span>·</span><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(r.delivery_date).toLocaleDateString('vi-VN')}</span></>}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Tiến độ SX</span>
                        <span className={`font-medium ${over ? 'text-red-600' : 'text-slate-700'}`}>{r.produced_qty.toLocaleString()} / {r.order_qty.toLocaleString()} ({(pct * 100).toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${over ? 'bg-red-500' : pct >= 0.8 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(pct * 100, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                  {isManager && (
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shrink-0"><Edit2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'Sửa Order Lot' : 'Tạo Order Lot mới'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <ErrorAlert message={error} />}
            <FormField label="Mã hàng" required>
              <select className={selectClass} value={form.product_style_id} onChange={e => setForm(f => ({ ...f, product_style_id: e.target.value }))}>
                <option value="">Chọn mã hàng</option>
                {activeStyles.map(s => <option key={s.id} value={s.id}>{s.style_code}{s.name ? ` — ${s.name}` : ''} ({s.customer.name})</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Lot Code">
                <input className={inputClass} value={form.lot_code} onChange={e => setForm(f => ({ ...f, lot_code: e.target.value }))} placeholder="LOT-001" />
              </FormField>
              <FormField label="Contract No">
                <input className={inputClass} value={form.contract_no} onChange={e => setForm(f => ({ ...f, contract_no: e.target.value }))} placeholder="PO-2026-001" />
              </FormField>
            </div>
            <FormField label="DEBIT Group">
              <input className={inputClass} value={form.debit_group} onChange={e => setForm(f => ({ ...f, debit_group: e.target.value }))} placeholder="VD: BR-01" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Số lượng Order" required>
                <input type="number" min="0" className={inputClass} value={form.order_qty} onChange={e => setForm(f => ({ ...f, order_qty: e.target.value }))} placeholder="0" />
              </FormField>
              <FormField label="Đơn giá">
                <input type="number" min="0" step="0.01" className={inputClass} value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tiền tệ">
                <select className={selectClass} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option value="JPY">JPY</option>
                  <option value="USD">USD</option>
                  <option value="VND">VND</option>
                </select>
              </FormField>
              <FormField label="Ngày giao hàng">
                <input type="date" className={inputClass} value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Trạng thái">
              <select className={selectClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Đang chạy</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </FormField>
            <FormField label="Ghi chú">
              <input className={inputClass} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." />
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
