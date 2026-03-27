import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { QuantityLog } from '../lib/database.types';
import {
  MOCK_ORDER_LOTS, MOCK_QUANTITY_LOGS, MOCK_PRODUCT_STYLES,
  MOCK_CUSTOMERS, MOCK_FACTORIES,
} from '../lib/mock-data';
import { calcLotProgress, progressBarColor, validateQuantityLog } from '../services/quantity-summary';
import { Modal } from '../components/ui/Modal';
import { FormField, inputClass } from '../components/ui/FormField';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Activity, Plus, Search, ChevronDown, ChevronUp, AlertTriangle, Calendar, Clock } from 'lucide-react';

interface LotRow {
  id: string;
  lot_code: string;
  style_code: string;
  customer_name: string;
  factory_code: string;
  debit_group: string;
  order_qty: number;
  delivery_date: string | null;
  status: string;
}

const lotsWithStyle: LotRow[] = MOCK_ORDER_LOTS.map(l => {
  const style = MOCK_PRODUCT_STYLES.find(s => s.id === l.product_style_id);
  const cust = MOCK_CUSTOMERS.find(c => c.id === l.customer_id);
  const fac = MOCK_FACTORIES.find(f => f.id === l.factory_id);
  return {
    id: l.id,
    lot_code: l.lot_code,
    style_code: style?.style_code ?? '',
    customer_name: cust?.name ?? '',
    factory_code: fac?.code ?? '',
    debit_group: l.debit_group,
    order_qty: l.order_qty,
    delivery_date: l.delivery_date,
    status: l.status,
  };
});

const todayStr = () => new Date().toISOString().split('T')[0];

export default function ProductionPage() {
  const { role } = useAuth();
  const [logs, setLogs] = useState<QuantityLog[]>(MOCK_QUANTITY_LOGS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [targetLotId, setTargetLotId] = useState<string | null>(null);
  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [logForm, setLogForm] = useState({ log_date: todayStr(), quantity: '', notes: '' });
  const [formError, setFormError] = useState('');

  const canWrite = role === 'staff' || role === 'leader' || role === 'manager';

  const logsByLot: Record<string, QuantityLog[]> = {};
  logs.forEach(l => {
    if (!logsByLot[l.order_lot_id]) logsByLot[l.order_lot_id] = [];
    logsByLot[l.order_lot_id].push(l);
  });

  const filtered = lotsWithStyle.filter(l => {
    const q = search.toLowerCase();
    const matchQ = !q || l.style_code.toLowerCase().includes(q) || l.lot_code.toLowerCase().includes(q) || l.debit_group.toLowerCase().includes(q);
    const matchS = !filterStatus || l.status === filterStatus;
    return matchQ && matchS;
  });

  const openCreateLog = (lotId: string) => {
    setTargetLotId(lotId); setEditLogId(null);
    setLogForm({ log_date: todayStr(), quantity: '', notes: '' });
    setFormError(''); setShowModal(true);
  };

  const openEditLog = (lotId: string, log: QuantityLog) => {
    setTargetLotId(lotId); setEditLogId(log.id);
    setLogForm({ log_date: log.log_date, quantity: String(log.quantity), notes: log.notes });
    setFormError(''); setShowModal(true);
  };

  const saveLog = () => {
    const qty = parseInt(logForm.quantity);
    const err = validateQuantityLog(qty);
    if (err) { setFormError(err); return; }
    if (!logForm.log_date) { setFormError('Vui lòng chọn ngày'); return; }
    const newLog: QuantityLog = {
      id: editLogId ?? `qlog-${Date.now()}`,
      order_lot_id: targetLotId!,
      log_date: logForm.log_date,
      quantity: qty,
      notes: logForm.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'user-001',
      updated_by: null,
    };
    if (editLogId) {
      setLogs(prev => prev.map(l => l.id === editLogId ? newLog : l));
    } else {
      setLogs(prev => [...prev, newLog]);
    }
    setShowModal(false);
  };

  const targetLot = targetLotId ? lotsWithStyle.find(l => l.id === targetLotId) : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sản xuất</h1>
        <p className="text-slate-500 text-sm mt-1">Theo dõi tiến độ sản xuất theo từng order lot</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hàng, lot code..." className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="active">Đang chạy</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
          <option value="">Tất cả</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center"><Activity className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Không có đơn hàng nào</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(lot => {
            const lotLogs = logsByLot[lot.id] ?? [];
            const progress = calcLotProgress(lot.order_qty, lotLogs);
            const barColor = progressBarColor(progress.progress_pct);
            const isExpanded = expandedLotId === lot.id;
            const recentLogs = [...lotLogs].sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 5);

            return (
              <div key={lot.id} className={`bg-white rounded-xl border ${progress.is_over_produced ? 'border-red-200' : 'border-slate-100'}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{lot.style_code}</span>
                        {lot.lot_code && <span className="text-slate-500 text-xs">{lot.lot_code}</span>}
                        {lot.debit_group && <span className="text-slate-400 text-xs">DEBIT: {lot.debit_group}</span>}
                        {progress.is_over_produced && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />Vượt order
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{lot.customer_name}</span>
                        <span>·</span>
                        <span>{lot.factory_code}</span>
                        {lot.delivery_date && (
                          <><span>·</span><span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(lot.delivery_date).toLocaleDateString('vi-VN')}</span></>
                        )}
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Tiến độ SX</span>
                          <span className={`font-semibold ${progress.is_over_produced ? 'text-red-600' : 'text-slate-700'}`}>
                            {progress.produced_qty.toLocaleString()} / {progress.order_qty.toLocaleString()} ({(progress.progress_pct * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(progress.progress_pct * 100, 100)}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Còn lại: {Math.max(progress.remaining_qty, 0).toLocaleString()}</span>
                          <span>Tổng order: {progress.order_qty.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canWrite && (
                        <button onClick={() => openCreateLog(lot.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Nhập SL
                        </button>
                      )}
                      <button onClick={() => setExpandedLotId(isExpanded ? null : lot.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    {recentLogs.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">Chưa có log sản xuất nào</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-400 mb-2">Log gần đây</p>
                        {recentLogs.map(log => (
                          <div key={log.id} className="flex items-center gap-3 py-1.5 hover:bg-slate-50 rounded-lg px-2 group">
                            <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span className="text-xs text-slate-500 w-24 shrink-0">{new Date(log.log_date).toLocaleDateString('vi-VN')}</span>
                            <span className="text-sm font-semibold text-slate-700 flex-1">+{log.quantity.toLocaleString()}</span>
                            {log.notes && <span className="text-xs text-slate-400 truncate max-w-32">{log.notes}</span>}
                            {canWrite && (
                              <button onClick={() => openEditLog(lot.id, log)} className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-700 transition-opacity shrink-0">Sửa</button>
                            )}
                          </div>
                        ))}
                        {lotLogs.length > 5 && <p className="text-xs text-slate-400 text-center py-1">... và {lotLogs.length - 5} log khác</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && targetLot && (
        <Modal title={editLogId ? 'Sửa log sản xuất' : `Nhập sản lượng — ${targetLot.style_code}`} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {formError && <ErrorAlert message={formError} />}
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Order lot</span>
                <span className="font-medium text-slate-700">{targetLot.lot_code || '—'}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>Đã sản xuất / Order</span>
                <span className="font-medium text-slate-700">
                  {(logsByLot[targetLot.id] ?? []).reduce((s, l) => s + l.quantity, 0).toLocaleString()} / {targetLot.order_qty.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Ngày sản xuất" required>
                <input type="date" className={inputClass} value={logForm.log_date} onChange={e => setLogForm(f => ({ ...f, log_date: e.target.value }))} />
              </FormField>
              <FormField label="Số lượng" required>
                <input type="number" min="1" className={inputClass} value={logForm.quantity} onChange={e => setLogForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" autoFocus />
              </FormField>
            </div>
            <FormField label="Ghi chú">
              <input className={inputClass} value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." />
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={saveLog} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Lưu</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
