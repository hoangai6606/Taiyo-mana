import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { InspectionSession, InspectionLine, ProductStyle, Customer, Factory, OrderLot, UserRole } from '../../lib/database.types';
import { SESSION_STATUS_LABELS, SESSION_STATUS_COLORS } from '../../lib/database.types';
import { calcLine, calcSessionSummary, isDefectRateHigh, formatDefectRate, validateLine } from '../../services/inspection-calc';
import { getAllowedTransitions, canEditSession } from '../../services/approval';
import { Modal } from '../../components/ui/Modal';
import { FormField, inputClass } from '../../components/ui/FormField';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Save } from 'lucide-react';

interface SessionWithRelations extends InspectionSession {
  product_style: ProductStyle & { customer: Customer; factory: Factory };
  order_lot?: OrderLot;
  lines: InspectionLine[];
}

interface LineFormState {
  color: string;
  size_label: string;
  inspected_qty: string;
  first_pass_good_qty: string;
  defect_qty: string;
  reinspection_qty: string;
  reinspection_good_qty: string;
  shipment_qty: string;
  notes: string;
}

const emptyLine: LineFormState = {
  color: '', size_label: '', inspected_qty: '0', first_pass_good_qty: '0',
  defect_qty: '0', reinspection_qty: '0', reinspection_good_qty: '0', shipment_qty: '0', notes: '',
};

interface Props {
  session: SessionWithRelations;
  onBack: () => void;
  onTransition: (toStatus: string) => void;
  role: UserRole | null;
  userId: string | null;
}

export function SessionEditor({ session, onBack, onTransition, role, userId }: Props) {
  const [lines, setLines] = useState<InspectionLine[]>(session.lines);
  const [loading, setLoading] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [editLineId, setEditLineId] = useState<string | null>(null);
  const [lineForm, setLineForm] = useState<LineFormState>(emptyLine);
  const [saving, setSaving] = useState(false);
  const [lineError, setLineError] = useState('');

  const canEdit = role ? canEditSession(session.status, role) : false;
  const transitions = role ? getAllowedTransitions(session.status, role) : [];

  const reloadLines = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('inspection_lines').select('*').eq('session_id', session.id).order('sort_order');
    setLines(data ?? []);
    setLoading(false);
  }, [session.id]);

  useEffect(() => { reloadLines(); }, [reloadLines]);

  const openCreateLine = () => {
    setEditLineId(null);
    setLineForm({ ...emptyLine, sort_order: String(lines.length * 10) } as any);
    setLineError(''); setShowLineModal(true);
  };

  const openEditLine = (line: InspectionLine) => {
    setEditLineId(line.id);
    setLineForm({
      color: line.color, size_label: line.size_label,
      inspected_qty: String(line.inspected_qty),
      first_pass_good_qty: String(line.first_pass_good_qty),
      defect_qty: String(line.defect_qty),
      reinspection_qty: String(line.reinspection_qty),
      reinspection_good_qty: String(line.reinspection_good_qty),
      shipment_qty: String(line.shipment_qty),
      notes: line.notes,
    });
    setLineError(''); setShowLineModal(true);
  };

  const parseLine = (): Partial<InspectionLine> => ({
    inspected_qty: parseInt(lineForm.inspected_qty) || 0,
    first_pass_good_qty: parseInt(lineForm.first_pass_good_qty) || 0,
    defect_qty: parseInt(lineForm.defect_qty) || 0,
    reinspection_qty: parseInt(lineForm.reinspection_qty) || 0,
    reinspection_good_qty: parseInt(lineForm.reinspection_good_qty) || 0,
    shipment_qty: parseInt(lineForm.shipment_qty) || 0,
  });

  const saveLine = async () => {
    const parsed = parseLine();
    const errors = validateLine(parsed);
    if (errors.length > 0) { setLineError(errors[0]); return; }
    setSaving(true); setLineError('');
    const payload = {
      session_id: session.id,
      color: lineForm.color.trim(),
      size_label: lineForm.size_label.trim(),
      ...parsed,
      sort_order: editLineId ? (lines.find(l => l.id === editLineId)?.sort_order ?? lines.length * 10) : lines.length * 10,
      notes: lineForm.notes.trim(),
    };
    const { error: e } = editLineId
      ? await supabase.from('inspection_lines').update(payload).eq('id', editLineId)
      : await supabase.from('inspection_lines').insert(payload);
    if (e) { setLineError(e.message); setSaving(false); return; }
    setShowLineModal(false); reloadLines();
    setSaving(false);
  };

  const deleteLine = async (id: string) => {
    if (!confirm('Xóa dòng này?')) return;
    await supabase.from('inspection_lines').delete().eq('id', id);
    reloadLines();
  };

  const summary = calcSessionSummary(lines);
  const highDefect = isDefectRateHigh(summary.session_defect_rate);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{session.product_style.style_code}</h1>
              {session.report_no && <span className="text-slate-400 font-mono text-sm">{session.report_no}</span>}
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${SESSION_STATUS_COLORS[session.status]}`}>
                {SESSION_STATUS_LABELS[session.status]}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-slate-400 flex-wrap">
              <span>{session.product_style.customer.name}</span>
              <span>·</span>
              <span>{session.product_style.factory.code}</span>
              <span>·</span>
              <span>{new Date(session.inspection_date).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>
          {transitions.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {transitions.map(t => (
                <button
                  key={t.to}
                  onClick={() => onTransition(t.to)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                    t.to === 'rejected' ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    : t.to === 'locked' ? 'bg-green-600 text-white hover:bg-green-700'
                    : t.to === 'approved' ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {lines.length > 0 && (
        <div className={`rounded-xl p-4 mb-4 ${highDefect ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-100'}`}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400">Tổng kiểm</p>
              <p className="text-xl font-bold text-slate-900">{summary.total_inspected.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tổng lỗi</p>
              <p className={`text-xl font-bold ${highDefect ? 'text-red-600' : 'text-slate-900'}`}>{summary.total_defect.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Tỷ lệ lỗi</p>
              <p className={`text-xl font-bold flex items-center gap-1 ${highDefect ? 'text-red-600' : 'text-slate-900'}`}>
                {highDefect && <AlertTriangle className="w-4 h-4" />}
                {formatDefectRate(summary.session_defect_rate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Xuất kho</p>
              <p className="text-xl font-bold text-slate-900">{summary.total_shipment.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">Dòng kiểm ({lines.length})</h2>
        {canEdit && (
          <button onClick={openCreateLine} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Thêm dòng
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : lines.length === 0 ? (
        <div className="py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-400 text-sm">Chưa có dòng kiểm nào</p>
          {canEdit && <button onClick={openCreateLine} className="mt-2 text-blue-600 text-sm hover:text-blue-700">+ Thêm dòng đầu tiên</button>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-100">
                <th className="text-left py-2 px-3 font-medium">Màu / Size</th>
                <th className="text-right py-2 px-3 font-medium">Kiểm</th>
                <th className="text-right py-2 px-3 font-medium">Đạt</th>
                <th className="text-right py-2 px-3 font-medium">Lỗi</th>
                <th className="text-right py-2 px-3 font-medium">Tái kiểm</th>
                <th className="text-right py-2 px-3 font-medium">TK đạt</th>
                <th className="text-right py-2 px-3 font-medium">Xuất</th>
                <th className="text-right py-2 px-3 font-medium">Tỷ lệ lỗi</th>
                {canEdit && <th className="py-2 px-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lines.map(line => {
                const calc = calcLine(line);
                const lineHighDefect = isDefectRateHigh(calc.defect_rate);
                return (
                  <tr key={line.id} className={`hover:bg-slate-50 ${lineHighDefect ? 'bg-red-50/50' : ''}`}>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-800">{line.color || '—'}</div>
                      {line.size_label && <div className="text-xs text-slate-400">{line.size_label}</div>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{line.inspected_qty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{line.first_pass_good_qty.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right font-medium ${lineHighDefect ? 'text-red-600' : 'text-slate-600'}`}>{line.defect_qty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{line.reinspection_qty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-500">{line.reinspection_good_qty.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{line.shipment_qty.toLocaleString()}</td>
                    <td className={`py-2.5 px-3 text-right font-medium ${lineHighDefect ? 'text-red-600' : 'text-slate-500'}`}>
                      {formatDefectRate(calc.defect_rate)}
                    </td>
                    {canEdit && (
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEditLine(line)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"><Save className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteLine(line.id)} className="p-1 hover:bg-red-100 rounded text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {lines.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold text-slate-700">
                  <td className="py-2.5 px-3 text-xs text-slate-400">Tổng</td>
                  <td className="py-2.5 px-3 text-right">{summary.total_inspected.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">{summary.total_first_pass_good.toLocaleString()}</td>
                  <td className={`py-2.5 px-3 text-right ${highDefect ? 'text-red-600' : ''}`}>{summary.total_defect.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">{summary.total_reinspection.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">{summary.total_reinspection_good.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">{summary.total_shipment.toLocaleString()}</td>
                  <td className={`py-2.5 px-3 text-right ${highDefect ? 'text-red-600' : ''}`}>{formatDefectRate(summary.session_defect_rate)}</td>
                  {canEdit && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {showLineModal && (
        <Modal title={editLineId ? 'Sửa dòng kiểm' : 'Thêm dòng kiểm'} onClose={() => setShowLineModal(false)}>
          <div className="space-y-4">
            {lineError && <ErrorAlert message={lineError} />}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Màu">
                <input className={inputClass} value={lineForm.color} onChange={e => setLineForm(f => ({ ...f, color: e.target.value }))} placeholder="VD: Đen" autoFocus />
              </FormField>
              <FormField label="Size">
                <input className={inputClass} value={lineForm.size_label} onChange={e => setLineForm(f => ({ ...f, size_label: e.target.value }))} placeholder="VD: M/L" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Số lượng kiểm">
                <input type="number" min="0" className={inputClass} value={lineForm.inspected_qty} onChange={e => setLineForm(f => ({ ...f, inspected_qty: e.target.value }))} />
              </FormField>
              <FormField label="Đạt (lần đầu)">
                <input type="number" min="0" className={inputClass} value={lineForm.first_pass_good_qty} onChange={e => setLineForm(f => ({ ...f, first_pass_good_qty: e.target.value }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Số lượng lỗi">
                <input type="number" min="0" className={inputClass} value={lineForm.defect_qty} onChange={e => setLineForm(f => ({ ...f, defect_qty: e.target.value }))} />
              </FormField>
              <FormField label="Tái kiểm">
                <input type="number" min="0" className={inputClass} value={lineForm.reinspection_qty} onChange={e => setLineForm(f => ({ ...f, reinspection_qty: e.target.value }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tái kiểm đạt">
                <input type="number" min="0" className={inputClass} value={lineForm.reinspection_good_qty} onChange={e => setLineForm(f => ({ ...f, reinspection_good_qty: e.target.value }))} />
              </FormField>
              <FormField label="Số lượng xuất">
                <input type="number" min="0" className={inputClass} value={lineForm.shipment_qty} onChange={e => setLineForm(f => ({ ...f, shipment_qty: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Ghi chú">
              <input className={inputClass} value={lineForm.notes} onChange={e => setLineForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú..." />
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowLineModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={saveLine} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
