import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { PriceRule, Customer, Factory, ProductTypeRecord, ProductStyle } from '../../lib/database.types';
import {
  MOCK_PRICE_RULES, MOCK_CUSTOMERS, MOCK_FACTORIES, MOCK_PRODUCT_TYPES, MOCK_PRODUCT_STYLES,
} from '../../lib/mock-data';
import { Modal } from '../../components/ui/Modal';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Tag, Plus, CreditCard as Edit2, ChevronDown, ChevronUp } from 'lucide-react';

interface PriceRuleRow extends PriceRule {
  customer?: Customer;
  factory?: Factory;
  product_type?: ProductTypeRecord;
  product_style?: ProductStyle;
}

interface FormState {
  customer_id: string;
  factory_id: string;
  product_type_id: string;
  product_style_id: string;
  rule_type: string;
  unit_price: string;
  currency: string;
  effective_from: string;
  effective_to: string;
  priority: string;
  notes: string;
}

const empty: FormState = {
  customer_id: '', factory_id: '', product_type_id: '', product_style_id: '',
  rule_type: 'first_inspection', unit_price: '', currency: 'JPY',
  effective_from: '', effective_to: '', priority: '0', notes: '',
};

const ruleTypeLabels: Record<string, string> = { first_inspection: 'KCS lần đầu', reinspection: 'Tái kiểm' };
const priorityLabels: Record<number, string> = { 0: 'Thấp (Customer)', 10: 'Trung bình (Factory)', 20: 'Cao (Style)', 30: 'Cao nhất (Lot)' };

function buildRows(rules: PriceRule[]): PriceRuleRow[] {
  return rules.map(r => ({
    ...r,
    customer: r.customer_id ? MOCK_CUSTOMERS.find(c => c.id === r.customer_id) : undefined,
    factory: r.factory_id ? MOCK_FACTORIES.find(f => f.id === r.factory_id) : undefined,
    product_type: r.product_type_id ? MOCK_PRODUCT_TYPES.find(t => t.id === r.product_type_id) : undefined,
    product_style: r.product_style_id ? MOCK_PRODUCT_STYLES.find(s => s.id === r.product_style_id) : undefined,
  }));
}

export function PriceRulesTab() {
  const { isManager } = useAuth();
  const [rows, setRows] = useState<PriceRuleRow[]>(buildRows(MOCK_PRICE_RULES));
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const openCreate = () => { setEditId(null); setForm(empty); setError(''); setShowModal(true); };
  const openEdit = (r: PriceRuleRow) => {
    setEditId(r.id);
    setForm({
      customer_id: r.customer_id ?? '', factory_id: r.factory_id ?? '',
      product_type_id: r.product_type_id ?? '', product_style_id: r.product_style_id ?? '',
      rule_type: r.rule_type, unit_price: String(r.unit_price), currency: r.currency,
      effective_from: r.effective_from ?? '', effective_to: r.effective_to ?? '',
      priority: String(r.priority), notes: r.notes,
    });
    setError(''); setShowModal(true);
  };

  const save = () => {
    const price = parseFloat(form.unit_price);
    if (isNaN(price) || price < 0) { setError('Đơn giá không hợp lệ'); return; }
    const payload: PriceRule = {
      id: editId ?? `price-${Date.now()}`,
      customer_id: form.customer_id || null,
      factory_id: form.factory_id || null,
      product_type_id: form.product_type_id || null,
      product_style_id: form.product_style_id || null,
      rule_type: form.rule_type,
      unit_price: price,
      currency: form.currency,
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      priority: parseInt(form.priority) || 0,
      active: true,
      notes: form.notes.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const newRow: PriceRuleRow = {
      ...payload,
      customer: payload.customer_id ? MOCK_CUSTOMERS.find(c => c.id === payload.customer_id) : undefined,
      factory: payload.factory_id ? MOCK_FACTORIES.find(f => f.id === payload.factory_id) : undefined,
      product_type: payload.product_type_id ? MOCK_PRODUCT_TYPES.find(t => t.id === payload.product_type_id) : undefined,
      product_style: payload.product_style_id ? MOCK_PRODUCT_STYLES.find(s => s.id === payload.product_style_id) : undefined,
    };
    if (editId) {
      setRows(prev => prev.map(r => r.id === editId ? newRow : r));
    } else {
      setRows(prev => [newRow, ...prev]);
    }
    setShowModal(false);
  };

  const toggleActive = (id: string, current: boolean) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, active: !current } : r));
  };

  const visible = rows.filter(r => showInactive || r.active);

  const getScopeLabel = (r: PriceRuleRow): string => {
    if (r.product_style) return `Style: ${r.product_style.style_code}`;
    if (r.product_type) return `Loại: ${r.product_type.code}`;
    const parts: string[] = [];
    if (r.customer) parts.push(r.customer.code);
    if (r.factory) parts.push(r.factory.code);
    return parts.join(' × ') || 'Tất cả';
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
          Hiện cả đã ẩn
        </label>
        {isManager && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Thêm quy tắc giá
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center"><Tag className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chưa có quy tắc giá nào</p></div>
      ) : (
        <div className="space-y-2">
          {visible.map(r => (
            <div key={r.id} className={`bg-white rounded-xl border p-4 ${!r.active ? 'opacity-50' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{r.unit_price.toLocaleString()} {r.currency}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{ruleTypeLabels[r.rule_type]}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{priorityLabels[r.priority] ?? `Priority ${r.priority}`}</span>
                    {!r.active && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400">Đã ẩn</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                    <span>{getScopeLabel(r)}</span>
                    {(r.effective_from || r.effective_to) && <><span>·</span><span>{r.effective_from ?? '...'} → {r.effective_to ?? '...'}</span></>}
                  </div>
                  {r.notes && (
                    <button onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="flex items-center gap-1 mt-1 text-xs text-slate-400 hover:text-slate-600">
                      {expandedId === r.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Ghi chú
                    </button>
                  )}
                  {expandedId === r.id && r.notes && <p className="mt-1 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{r.notes}</p>}
                </div>
                {isManager && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => toggleActive(r.id, r.active)} className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">{r.active ? 'Ẩn' : 'Hiện'}</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'Sửa quy tắc giá' : 'Thêm quy tắc giá'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <ErrorAlert message={error} />}
            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">Phạm vi áp dụng: để trống = áp dụng tất cả. Càng cụ thể thì độ ưu tiên càng cao.</p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Khách hàng">
                <select className={selectClass} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                  <option value="">Tất cả KH</option>
                  {MOCK_CUSTOMERS.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Xưởng">
                <select className={selectClass} value={form.factory_id} onChange={e => setForm(f => ({ ...f, factory_id: e.target.value }))}>
                  <option value="">Tất cả xưởng</option>
                  {MOCK_FACTORIES.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Loại hàng">
                <select className={selectClass} value={form.product_type_id} onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value }))}>
                  <option value="">Tất cả</option>
                  {MOCK_PRODUCT_TYPES.map(pt => <option key={pt.id} value={pt.id}>{pt.code} — {pt.name}</option>)}
                </select>
              </FormField>
              <FormField label="Mã hàng cụ thể">
                <select className={selectClass} value={form.product_style_id} onChange={e => setForm(f => ({ ...f, product_style_id: e.target.value }))}>
                  <option value="">Tất cả</option>
                  {MOCK_PRODUCT_STYLES.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.style_code}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Loại kiểm" required>
              <select className={selectClass} value={form.rule_type} onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))}>
                <option value="first_inspection">KCS lần đầu</option>
                <option value="reinspection">Tái kiểm</option>
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Đơn giá" required>
                <input type="number" min="0" step="0.01" className={inputClass} value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="0" />
              </FormField>
              <FormField label="Tiền tệ">
                <select className={selectClass} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option value="JPY">JPY</option>
                  <option value="USD">USD</option>
                  <option value="VND">VND</option>
                </select>
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Hiệu lực từ">
                <input type="date" className={inputClass} value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
              </FormField>
              <FormField label="Hiệu lực đến">
                <input type="date" className={inputClass} value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Độ ưu tiên">
              <select className={selectClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="0">0 — Thấp (Customer)</option>
                <option value="10">10 — Trung bình (Factory)</option>
                <option value="20">20 — Cao (Style)</option>
                <option value="30">30 — Cao nhất (Lot)</option>
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
