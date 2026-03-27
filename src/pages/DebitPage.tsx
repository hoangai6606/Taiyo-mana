import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { DebitNote, DebitNoteItem, DebitNoteStatus } from '../lib/database.types';
import { MOCK_DEBIT_NOTES, MOCK_DEBIT_NOTE_ITEMS, MOCK_CUSTOMERS, MOCK_FACTORIES } from '../lib/mock-data';
import { Modal } from '../components/ui/Modal';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { FormField, inputClass, selectClass } from '../components/ui/FormField';
import { Receipt, Plus, Lock, Eye, AlertCircle, Calendar, DollarSign, Filter, ChevronDown, CheckCircle2 } from 'lucide-react';

interface CreateFormState {
  customer_id: string;
  factory_id: string;
  period_from: string;
  period_to: string;
  currency: string;
  notes: string;
}

const STATUS_LABELS: Record<DebitNoteStatus, string> = {
  draft: 'Nháp',
  reviewed: 'Đã xem xét',
  locked: 'Đã khóa',
};

const STATUS_COLORS: Record<DebitNoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  reviewed: 'bg-amber-100 text-amber-700',
  locked: 'bg-green-100 text-green-700',
};

const today = () => new Date().toISOString().split('T')[0];

const formatAmount = (amount: number, currency: string) => {
  if (currency === 'JPY') return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
  if (currency === 'VND') return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

export default function DebitPage() {
  const { user, role } = useAuth();
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>(MOCK_DEBIT_NOTES);
  const [allItems] = useState<DebitNoteItem[]>(MOCK_DEBIT_NOTE_ITEMS);
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    customer_id: '', factory_id: '', period_from: today(), period_to: today(), currency: 'USD', notes: '',
  });
  const [createError, setCreateError] = useState('');

  const [viewNote, setViewNote] = useState<DebitNote | null>(null);

  const canManage = role === 'manager' || role === 'accounting_admin';

  const openDetail = (note: DebitNote) => setViewNote(note);

  const handleCreate = () => {
    if (!createForm.customer_id) { setCreateError('Vui lòng chọn khách hàng'); return; }
    if (!createForm.factory_id) { setCreateError('Vui lòng chọn nhà máy'); return; }
    if (!createForm.period_from) { setCreateError('Vui lòng chọn ngày bắt đầu'); return; }
    if (!createForm.period_to) { setCreateError('Vui lòng chọn ngày kết thúc'); return; }
    if (createForm.period_to < createForm.period_from) { setCreateError('Ngày kết thúc phải sau ngày bắt đầu'); return; }
    const newNote: DebitNote = {
      id: `dn-${Date.now()}`,
      debit_note_no: null,
      customer_id: createForm.customer_id,
      factory_id: createForm.factory_id,
      period_from: createForm.period_from,
      period_to: createForm.period_to,
      currency: createForm.currency,
      total_amount: 0,
      status: 'draft',
      notes: createForm.notes.trim(),
      locked_at: null, locked_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user?.id ?? null,
    };
    setDebitNotes(prev => [newNote, ...prev]);
    setShowCreateModal(false);
    setCreateForm({ customer_id: '', factory_id: '', period_from: today(), period_to: today(), currency: 'USD', notes: '' });
    setCreateError('');
  };

  const handleLock = (note: DebitNote) => {
    const now = new Date().toISOString();
    setDebitNotes(prev => prev.map(n => n.id === note.id ? { ...n, status: 'locked' as DebitNoteStatus, locked_at: now, locked_by: user?.id ?? null } : n));
    if (viewNote?.id === note.id) setViewNote(prev => prev ? { ...prev, status: 'locked', locked_at: now, locked_by: user?.id ?? null } : prev);
  };

  const filtered = debitNotes.filter(n => !filterStatus || n.status === filterStatus);
  const getCustomerName = (id: string) => MOCK_CUSTOMERS.find(c => c.id === id)?.name ?? id;

  if (role !== null && role !== 'manager' && role !== 'accounting_admin') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Debit Note</h1></div>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle className="w-12 h-12 text-red-400" />
          <p className="text-slate-700 font-semibold text-lg">Không có quyền truy cập</p>
          <p className="text-slate-400 text-sm">Trang này chỉ dành cho Quản lý và Kế toán.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-slate-600" /> Debit Note
          </h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý và tạo debit note từ phiên kiểm hàng</p>
        </div>
        {canManage && (
          <button
            onClick={() => { setCreateForm({ customer_id: '', factory_id: '', period_from: today(), period_to: today(), currency: 'USD', notes: '' }); setCreateError(''); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Tạo Debit Note
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <button onClick={() => setShowFilterMenu(v => !v)} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4 text-slate-400" />
            {filterStatus ? STATUS_LABELS[filterStatus as DebitNoteStatus] : 'Tất cả trạng thái'}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
              {(['', 'draft', 'reviewed', 'locked'] as const).map(s => (
                <button key={s} onClick={() => { setFilterStatus(s); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${filterStatus === s ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
                  {s === '' ? 'Tất cả trạng thái' : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400">{filtered.length} kết quả</span>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Chưa có debit note nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Số DN</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Khách hàng</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Kỳ</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Tiền tệ</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Tổng tiền</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Trạng thái</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Ngày tạo</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(note => (
                <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">
                    {note.debit_note_no ?? <span className="text-slate-400 italic">Chưa có số</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{getCustomerName(note.customer_id)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {new Date(note.period_from).toLocaleDateString('vi-VN')} – {new Date(note.period_to).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs font-semibold">{note.currency}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    <span className="flex items-center justify-end gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {formatAmount(note.total_amount, note.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[note.status]}`}>
                      {note.status === 'locked' && <CheckCircle2 className="w-3 h-3" />}
                      {note.status === 'reviewed' && <Eye className="w-3 h-3" />}
                      {STATUS_LABELS[note.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{new Date(note.created_at).toLocaleDateString('vi-VN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openDetail(note)} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Xem
                      </button>
                      {canManage && note.status !== 'locked' && (
                        <button onClick={() => handleLock(note)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors">
                          <Lock className="w-3.5 h-3.5" /> Khóa
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <Modal title="Tạo Debit Note mới" onClose={() => setShowCreateModal(false)}>
          <div className="space-y-4">
            {createError && <ErrorAlert message={createError} />}
            <FormField label="Khách hàng" required>
              <select className={selectClass} value={createForm.customer_id} onChange={e => setCreateForm(f => ({ ...f, customer_id: e.target.value }))}>
                <option value="">Chọn khách hàng</option>
                {MOCK_CUSTOMERS.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Nhà máy" required>
              <select className={selectClass} value={createForm.factory_id} onChange={e => setCreateForm(f => ({ ...f, factory_id: e.target.value }))}>
                <option value="">Chọn nhà máy</option>
                {MOCK_FACTORIES.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Từ ngày" required>
                <input type="date" className={inputClass} value={createForm.period_from} onChange={e => setCreateForm(f => ({ ...f, period_from: e.target.value }))} />
              </FormField>
              <FormField label="Đến ngày" required>
                <input type="date" className={inputClass} value={createForm.period_to} onChange={e => setCreateForm(f => ({ ...f, period_to: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Tiền tệ" required>
              <select className={selectClass} value={createForm.currency} onChange={e => setCreateForm(f => ({ ...f, currency: e.target.value }))}>
                <option value="USD">USD</option>
                <option value="JPY">JPY</option>
                <option value="VND">VND</option>
              </select>
            </FormField>
            <FormField label="Ghi chú">
              <textarea className={`${inputClass} resize-none`} rows={3} value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú thêm..." />
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Hủy</button>
              <button onClick={handleCreate} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">Tạo Debit Note</button>
            </div>
          </div>
        </Modal>
      )}

      {viewNote && (
        <Modal title={`Debit Note: ${viewNote.debit_note_no ?? 'Chưa có số'}`} onClose={() => setViewNote(null)} maxWidth="max-w-3xl">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách hàng</span>
                  <span className="font-medium text-slate-800">{getCustomerName(viewNote.customer_id)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhà máy</span>
                  <span className="font-medium text-slate-800">{MOCK_FACTORIES.find(f => f.id === viewNote.factory_id)?.name ?? viewNote.factory_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tiền tệ</span>
                  <span className="font-medium text-slate-800">{viewNote.currency}</span>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kỳ từ</span>
                  <span className="font-medium text-slate-800">{new Date(viewNote.period_from).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kỳ đến</span>
                  <span className="font-medium text-slate-800">{new Date(viewNote.period_to).toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[viewNote.status]}`}>{STATUS_LABELS[viewNote.status]}</span>
                </div>
              </div>
            </div>

            {viewNote.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">{viewNote.notes}</div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-800 text-sm">Chi tiết dòng</h4>
                <span className="text-xs text-slate-400">{allItems.filter(i => i.debit_note_id === viewNote.id).length} dòng</span>
              </div>
              {allItems.filter(i => i.debit_note_id === viewNote.id).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">Chưa có dòng chi tiết nào</div>
              ) : (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="text-left px-3 py-2 font-semibold text-slate-600">Mô tả</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">SL kiểm</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">SL tái kiểm</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Đơn giá</th>
                        <th className="text-right px-3 py-2 font-semibold text-slate-600">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {allItems.filter(i => i.debit_note_id === viewNote.id).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700">{item.description}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.first_inspection_qty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.reinspection_qty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{item.unit_price.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800">{formatAmount(item.line_amount, item.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td colSpan={4} className="px-3 py-2 text-right font-semibold text-slate-700">Tổng cộng</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{formatAmount(viewNote.total_amount, viewNote.currency)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {viewNote.locked_at && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Đã khóa lúc {new Date(viewNote.locked_at).toLocaleString('vi-VN')}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              {canManage && viewNote.status !== 'locked' && (
                <button onClick={() => { handleLock(viewNote); setViewNote(null); }} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors">
                  <Lock className="w-4 h-4" /> Khóa Debit Note
                </button>
              )}
              <button onClick={() => setViewNote(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Đóng</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
