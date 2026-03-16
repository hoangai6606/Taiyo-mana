import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { InspectionSession, InspectionLine, ProductStyle, Customer, Factory, OrderLot } from '../lib/database.types';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '../lib/database.types';
import { calcSessionSummary, isDefectRateHigh, formatDefectRate } from '../services/inspection-calc';
import { getAllowedTransitions, logApproval, logAudit } from '../services/approval';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass, selectClass } from '../components/ui/FormField';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { ClipboardCheck, Plus, Search, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { SessionEditor } from './inspection/SessionEditor';

interface SessionRow extends InspectionSession {
  product_style: ProductStyle & { customer: Customer; factory: Factory };
  order_lot?: OrderLot;
  lines: InspectionLine[];
}

interface CreateFormState {
  product_style_id: string;
  order_lot_id: string;
  inspection_date: string;
  notes: string;
}

const today = () => new Date().toISOString().split('T')[0];

export default function InspectionPage() {
  const { user, role } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [styles, setStyles] = useState<(ProductStyle & { customer: Customer; factory: Factory })[]>([]);
  const [lots, setLots] = useState<OrderLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>({ product_style_id: '', order_lot_id: '', inspection_date: today(), notes: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: sessData }, { data: linesData }, { data: stylesData }, { data: lotsData }] = await Promise.all([
      supabase.from('inspection_sessions').select('*, product_styles!inner(*, customers!inner(*), factories!inner(*)), order_lots(*)').is('deleted_at', null).order('inspection_date', { ascending: false }),
      supabase.from('inspection_lines').select('*'),
      supabase.from('product_styles').select('*, customers!inner(*), factories!inner(*)').eq('active', true).order('style_code'),
      supabase.from('order_lots').select('*').eq('status', 'active').order('created_at', { ascending: false }),
    ]);
    const lineMap: Record<string, InspectionLine[]> = {};
    (linesData ?? []).forEach((l: any) => {
      if (!lineMap[l.session_id]) lineMap[l.session_id] = [];
      lineMap[l.session_id].push(l);
    });
    setStyles((stylesData ?? []).map((s: any) => ({ ...s, customer: s.customers, factory: s.factories })));
    setLots(lotsData ?? []);
    setSessions((sessData ?? []).map((s: any) => ({
      ...s,
      product_style: { ...s.product_styles, customer: s.product_styles.customers, factory: s.product_styles.factories },
      order_lot: s.order_lots ?? undefined,
      lines: lineMap[s.id] ?? [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSession = async () => {
    if (!createForm.product_style_id) { setCreateError('Vui lòng chọn mã hàng'); return; }
    if (!createForm.inspection_date) { setCreateError('Vui lòng chọn ngày kiểm'); return; }
    setCreating(true); setCreateError('');
    const style = styles.find(s => s.id === createForm.product_style_id)!;
    const { data, error: e } = await supabase.from('inspection_sessions').insert({
      product_style_id: createForm.product_style_id,
      order_lot_id: createForm.order_lot_id || null,
      customer_id: style.customer_id,
      factory_id: style.factory_id,
      inspection_date: createForm.inspection_date,
      notes: createForm.notes.trim(),
      status: 'draft',
      created_by: user?.id ?? null,
    }).select().single();
    if (e) { setCreateError(e.message); setCreating(false); return; }
    setShowCreateModal(false);
    await load();
    if (data) setOpenSessionId(data.id);
    setCreating(false);
  };

  const handleTransition = async (session: SessionRow, toStatus: string) => {
    if (!role || !user) return;
    const reason = toStatus === 'rejected' ? (prompt('Lý do từ chối:') ?? '') : undefined;
    const now = new Date().toISOString();
    const update: Record<string, unknown> = { status: toStatus, updated_by: user.id };
    if (toStatus === 'submitted') { update.submitted_at = now; update.submitted_by = user.id; }
    if (toStatus === 'approved') { update.approved_at = now; update.approved_by = user.id; }
    if (toStatus === 'locked') { update.locked_at = now; update.locked_by = user.id; }
    if (toStatus === 'rejected') { update.rejected_at = now; update.rejected_by = user.id; update.reject_reason = reason ?? ''; }
    if (toStatus === 'draft') { update.reject_reason = ''; }
    const { error: e } = await supabase.from('inspection_sessions').update(update).eq('id', session.id);
    if (!e) {
      await logApproval('inspection_sessions', session.id, session.status, toStatus, user.id, reason);
      await logAudit(user.id, 'status_change', 'inspection_sessions', session.id, { status: session.status }, { status: toStatus, reason });
      load();
    }
  };

  const filteredLots = lots.filter(l => !createForm.product_style_id || l.product_style_id === createForm.product_style_id);

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.product_style.style_code.toLowerCase().includes(q) || (s.report_no ?? '').toLowerCase().includes(q) || s.product_style.customer.name.toLowerCase().includes(q);
    const matchS = !filterStatus || s.status === filterStatus;
    return matchQ && matchS;
  });

  if (openSessionId) {
    const session = sessions.find(s => s.id === openSessionId);
    if (session) {
      return (
        <SessionEditor
          session={session}
          onBack={() => { setOpenSessionId(null); load(); }}
          onTransition={(toStatus) => handleTransition(session, toStatus)}
          role={role}
          userId={user?.id ?? null}
        />
      );
    }
  }

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <div className="w-2 h-2 rounded-full bg-slate-400" />,
    submitted: <div className="w-2 h-2 rounded-full bg-amber-400" />,
    approved: <CheckCircle2 className="w-4 h-4 text-blue-500" />,
    locked: <Lock className="w-4 h-4 text-green-600" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Kiểm hàng</h1>
        <p className="text-slate-500 text-sm mt-1">Tạo và quản lý phiếu kiểm hàng</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hàng, số phiếu..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Nháp</option>
          <option value="submitted">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="locked">Đã khóa</option>
          <option value="rejected">Từ chối</option>
        </select>
        {(role === 'staff' || role === 'leader' || role === 'manager') && (
          <button
            onClick={() => { setCreateForm({ product_style_id: '', order_lot_id: '', inspection_date: today(), notes: '' }); setCreateError(''); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Tạo phiếu
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center"><ClipboardCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chưa có phiếu kiểm nào</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(s => {
            const summary = calcSessionSummary(s.lines);
            const highDefect = isDefectRateHigh(summary.session_defect_rate);
            const transitions = role ? getAllowedTransitions(s.status, role) : [];

            return (
              <div key={s.id} className={`bg-white rounded-xl border ${highDefect && s.lines.length > 0 ? 'border-red-200' : 'border-slate-100'}`}>
                <button onClick={() => setOpenSessionId(s.id)} className="w-full text-left p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{statusIcons[s.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{s.product_style.style_code}</span>
                        {s.report_no && <span className="text-slate-400 text-xs font-mono">{s.report_no}</span>}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SESSION_STATUS_COLORS[s.status]}`}>
                          {SESSION_STATUS_LABELS[s.status]}
                        </span>
                        {highDefect && s.lines.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />{formatDefectRate(summary.session_defect_rate)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                        <span>{s.product_style.customer.name}</span>
                        <span>·</span>
                        <span>{new Date(s.inspection_date).toLocaleDateString('vi-VN')}</span>
                        {s.lines.length > 0 && (
                          <><span>·</span><span>{summary.total_inspected.toLocaleString()} kiểm / {summary.total_defect.toLocaleString()} lỗi</span></>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  </div>
                </button>
                {transitions.length > 0 && (
                  <div className="flex gap-2 px-4 pb-3 border-t border-slate-50 pt-2">
                    {transitions.map(t => (
                      <button
                        key={t.to}
                        onClick={() => handleTransition(s, t.to)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          t.to === 'rejected' ? 'bg-red-50 text-red-700 hover:bg-red-100'
                          : t.to === 'locked' ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : t.to === 'approved' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <Modal title="Tạo phiếu kiểm hàng mới" onClose={() => setShowCreateModal(false)}>
          <div className="space-y-4">
            {createError && <ErrorAlert message={createError} />}
            <FormField label="Mã hàng" required>
              <select className={selectClass} value={createForm.product_style_id} onChange={e => setCreateForm(f => ({ ...f, product_style_id: e.target.value, order_lot_id: '' }))}>
                <option value="">Chọn mã hàng</option>
                {styles.map(s => <option key={s.id} value={s.id}>{s.style_code} — {s.customer.name}</option>)}
              </select>
            </FormField>
            <FormField label="Order Lot (tuỳ chọn)">
              <select className={selectClass} value={createForm.order_lot_id} onChange={e => setCreateForm(f => ({ ...f, order_lot_id: e.target.value }))}>
                <option value="">Không chọn</option>
                {filteredLots.map(l => <option key={l.id} value={l.id}>{l.lot_code || l.id.slice(0, 8)} — {l.order_qty.toLocaleString()} pcs</option>)}
              </select>
            </FormField>
            <FormField label="Ngày kiểm" required>
              <input type="date" className={inputClass} value={createForm.inspection_date} onChange={e => setCreateForm(f => ({ ...f, inspection_date: e.target.value }))} />
            </FormField>
            <FormField label="Ghi chú">
              <input className={inputClass} value={createForm.notes} onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." />
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={createSession} disabled={creating} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">{creating ? 'Đang tạo...' : 'Tạo phiếu'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
