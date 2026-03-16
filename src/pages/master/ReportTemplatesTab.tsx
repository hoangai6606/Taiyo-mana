import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { ReportTemplate, Customer, Factory, DefectCatalog } from '../../lib/database.types';
import { Modal } from '../../components/ui/Modal';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { FileText, Plus, CreditCard as Edit2 } from 'lucide-react';

interface TemplateRow extends ReportTemplate {
  customer?: Customer;
  factory?: Factory;
  defect_catalog?: DefectCatalog;
}

interface FormState {
  code: string;
  name: string;
  customer_id: string;
  factory_id: string;
  defect_catalog_id: string;
  export_format: string;
}

const empty: FormState = {
  code: '', name: '', customer_id: '', factory_id: '', defect_catalog_id: '', export_format: 'xlsx',
};

const formatLabels: Record<string, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV',
  pdf: 'PDF',
};

export function ReportTemplatesTab() {
  const { isManager } = useAuth();
  const [rows, setRows] = useState<TemplateRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [catalogs, setCatalogs] = useState<DefectCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: tmplData }, { data: custData }, { data: factData }, { data: catData }] = await Promise.all([
      supabase.from('report_templates').select('*, customers(*), factories(*), defect_catalogs(*)').order('code'),
      supabase.from('customers').select('*').eq('is_active', true).order('code'),
      supabase.from('factories').select('*').eq('is_active', true).order('code'),
      supabase.from('defect_catalogs').select('*').eq('active', true).order('code'),
    ]);
    setCustomers(custData ?? []);
    setFactories(factData ?? []);
    setCatalogs(catData ?? []);
    setRows((tmplData ?? []).map((t: any) => ({
      ...t,
      customer: t.customers ?? undefined,
      factory: t.factories ?? undefined,
      defect_catalog: t.defect_catalogs ?? undefined,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditId(null); setForm(empty); setError(''); setShowModal(true); };
  const openEdit = (r: TemplateRow) => {
    setEditId(r.id);
    setForm({
      code: r.code, name: r.name,
      customer_id: r.customer_id ?? '',
      factory_id: r.factory_id ?? '',
      defect_catalog_id: r.defect_catalog_id ?? '',
      export_format: r.export_format,
    });
    setError(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) { setError('Vui lòng điền mã và tên template'); return; }
    setSaving(true); setError('');
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      customer_id: form.customer_id || null,
      factory_id: form.factory_id || null,
      defect_catalog_id: form.defect_catalog_id || null,
      export_format: form.export_format,
    };
    const { error: e } = editId
      ? await supabase.from('report_templates').update(payload).eq('id', editId)
      : await supabase.from('report_templates').insert({ ...payload, active: true });
    if (e) setError(e.message);
    else { setShowModal(false); load(); }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('report_templates').update({ active: !current }).eq('id', id);
    load();
  };

  const visible = rows.filter(r => showInactive || r.active);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="rounded" />
          Hiện cả đã ẩn
        </label>
        {isManager && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Thêm template
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center"><FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chưa có mẫu báo cáo nào</p></div>
      ) : (
        <div className="space-y-2">
          {visible.map(r => (
            <div key={r.id} className={`bg-white rounded-xl border p-4 flex items-start gap-3 ${!r.active ? 'opacity-50' : 'border-slate-100'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900 text-sm">{r.code}</span>
                  <span className="text-slate-600 text-sm">{r.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">{formatLabels[r.export_format] ?? r.export_format}</span>
                  {!r.active && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400">Đã ẩn</span>}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                  {r.customer && <span>KH: {r.customer.name}</span>}
                  {r.factory && <><span>·</span><span>Xưởng: {r.factory.code}</span></>}
                  {r.defect_catalog && <><span>·</span><span>Catalog: {r.defect_catalog.code}</span></>}
                  {!r.customer && !r.factory && <span>Áp dụng tất cả</span>}
                </div>
              </div>
              {isManager && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => toggleActive(r.id, r.active)} className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                    {r.active ? 'Ẩn' : 'Hiện'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editId ? 'Sửa mẫu báo cáo' : 'Thêm mẫu báo cáo'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <ErrorAlert message={error} />}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mã template" required>
                <input className={inputClass} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: GARDNER-TPA" />
              </FormField>
              <FormField label="Định dạng xuất">
                <select className={selectClass} value={form.export_format} onChange={e => setForm(f => ({ ...f, export_format: e.target.value }))}>
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF</option>
                </select>
              </FormField>
            </div>
            <FormField label="Tên mẫu báo cáo" required>
              <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Mẫu báo cáo Gardner TPA" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Khách hàng">
                <select className={selectClass} value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
                  <option value="">Tất cả</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </FormField>
              <FormField label="Xưởng">
                <select className={selectClass} value={form.factory_id} onChange={e => setForm(f => ({ ...f, factory_id: e.target.value }))}>
                  <option value="">Tất cả</option>
                  {factories.map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Danh mục lỗi">
              <select className={selectClass} value={form.defect_catalog_id} onChange={e => setForm(f => ({ ...f, defect_catalog_id: e.target.value }))}>
                <option value="">Không gán</option>
                {catalogs.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">{saving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
