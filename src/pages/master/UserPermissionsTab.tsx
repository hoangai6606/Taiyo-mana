import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { UserFactoryPermission, Factory, Profile } from '../../lib/database.types';
import { ROLE_LABELS } from '../../lib/database.types';
import { MOCK_USER_PERMISSIONS, MOCK_USERS, MOCK_FACTORIES } from '../../lib/mock-data';
import { Modal } from '../../components/ui/Modal';
import { FormField, selectClass } from '../../components/ui/FormField';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { Users, Plus, Trash2 } from 'lucide-react';

interface PermissionRow extends UserFactoryPermission {
  profile: Profile;
  factory: Factory;
}

interface FormState {
  user_id: string;
  factory_id: string;
  access_level: 'read_only' | 'read_write';
}

const empty: FormState = { user_id: '', factory_id: '', access_level: 'read_only' };

const accessLabels: Record<string, string> = { read_only: 'Chỉ xem', read_write: 'Xem + Ghi' };
const accessColors: Record<string, string> = { read_only: 'bg-slate-100 text-slate-600', read_write: 'bg-green-100 text-green-700' };

function buildRows(perms: UserFactoryPermission[]): PermissionRow[] {
  return perms.map(p => ({
    ...p,
    profile: MOCK_USERS.find(u => u.id === p.user_id) ?? MOCK_USERS[0],
    factory: MOCK_FACTORIES.find(f => f.id === p.factory_id) ?? MOCK_FACTORIES[0],
  }));
}

export function UserPermissionsTab() {
  const { isManager, user } = useAuth();
  const [rows, setRows] = useState<PermissionRow[]>(buildRows(MOCK_USER_PERMISSIONS));
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');
  const [filterFactory, setFilterFactory] = useState('');

  const openCreate = () => { setForm(empty); setError(''); setShowModal(true); };

  const save = () => {
    if (!form.user_id || !form.factory_id) { setError('Vui lòng chọn nhân viên và xưởng'); return; }
    const exists = rows.find(r => r.user_id === form.user_id && r.factory_id === form.factory_id);
    if (exists) { setError('Quyền này đã tồn tại. Vui lòng xóa quyền cũ trước khi tạo lại.'); return; }
    const profile = MOCK_USERS.find(u => u.id === form.user_id)!;
    const factory = MOCK_FACTORIES.find(f => f.id === form.factory_id)!;
    const newPerm: PermissionRow = {
      id: `perm-${Date.now()}`,
      user_id: form.user_id,
      factory_id: form.factory_id,
      access_level: form.access_level,
      created_at: new Date().toISOString(),
      created_by: user?.id ?? null,
      profile,
      factory,
    };
    setRows(prev => [newPerm, ...prev]);
    setShowModal(false);
  };

  const updateLevel = (id: string, level: 'read_only' | 'read_write') => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, access_level: level } : r));
  };

  const remove = (id: string) => {
    if (!confirm('Xóa quyền truy cập này?')) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const filtered = rows.filter(r => !filterFactory || r.factory_id === filterFactory);

  const groupedByFactory: Record<string, PermissionRow[]> = {};
  filtered.forEach(r => {
    const key = r.factory?.code ?? r.factory_id;
    if (!groupedByFactory[key]) groupedByFactory[key] = [];
    groupedByFactory[key].push(r);
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select value={filterFactory} onChange={e => setFilterFactory(e.target.value)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tất cả xưởng</option>
          {MOCK_FACTORIES.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
        </select>
        {isManager && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shrink-0 ml-auto">
            <Plus className="w-4 h-4" /> Cấp quyền
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center"><Users className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chưa có phân quyền nào</p></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByFactory).map(([factoryCode, perms]) => (
            <div key={factoryCode}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">{factoryCode}</h3>
              <div className="space-y-2">
                {perms.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 text-sm">{r.profile?.name_vn ?? '—'}</span>
                        {r.profile?.name_jp && <span className="text-slate-400 text-xs">{r.profile.name_jp}</span>}
                        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">{ROLE_LABELS[r.profile?.role] ?? r.profile?.role}</span>
                      </div>
                    </div>
                    {isManager ? (
                      <select
                        value={r.access_level}
                        onChange={e => updateLevel(r.id, e.target.value as 'read_only' | 'read_write')}
                        className={`px-2.5 py-1 text-xs rounded-lg border ${accessColors[r.access_level]} border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                      >
                        <option value="read_only">Chỉ xem</option>
                        <option value="read_write">Xem + Ghi</option>
                      </select>
                    ) : (
                      <span className={`px-2.5 py-1 text-xs rounded-lg font-medium ${accessColors[r.access_level]}`}>{accessLabels[r.access_level]}</span>
                    )}
                    {isManager && (
                      <button onClick={() => remove(r.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Cấp quyền truy cập xưởng" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            {error && <ErrorAlert message={error} />}
            <FormField label="Nhân viên" required>
              <select className={selectClass} value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}>
                <option value="">Chọn nhân viên</option>
                {MOCK_USERS.filter(u => u.active).map(p => <option key={p.id} value={p.id}>{p.name_vn} ({ROLE_LABELS[p.role]})</option>)}
              </select>
            </FormField>
            <FormField label="Xưởng" required>
              <select className={selectClass} value={form.factory_id} onChange={e => setForm(f => ({ ...f, factory_id: e.target.value }))}>
                <option value="">Chọn xưởng</option>
                {MOCK_FACTORIES.filter(f => f.is_active).map(f => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
              </select>
            </FormField>
            <FormField label="Mức quyền">
              <select className={selectClass} value={form.access_level} onChange={e => setForm(f => ({ ...f, access_level: e.target.value as 'read_only' | 'read_write' }))}>
                <option value="read_only">Chỉ xem</option>
                <option value="read_write">Xem + Ghi</option>
              </select>
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={save} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium">Cấp quyền</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
