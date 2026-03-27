import { useState } from 'react';
import { Shield, Search, Filter, Clock, User, ArrowRight, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { AuditLog, ApprovalLog } from '../lib/database.types';
import { MOCK_AUDIT_LOGS, MOCK_APPROVAL_LOGS } from '../lib/mock-data';
import { Modal } from '../components/ui/Modal';

type Tab = 'audit' | 'approval';

function truncate(value: string | null | undefined, length = 20): string {
  if (!value) return '—';
  return value.length > length ? value.slice(0, length) + '…' : value;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AuditLogPage() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('audit');
  const [auditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [approvalLogs] = useState<ApprovalLog[]>(MOCK_APPROVAL_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null);

  const isAuthorized = role === 'manager' || role === 'accounting_admin';

  const filteredAuditLogs = auditLogs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return log.entity_type.toLowerCase().includes(q) || log.action.toLowerCase().includes(q);
  });

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Truy cập bị từ chối</h2>
        <p className="text-slate-500 max-w-sm">Bạn không có quyền truy cập trang này. Chỉ Manager và Accounting Admin mới có thể xem nhật ký hệ thống.</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nhật ký hệ thống</h1>
          <p className="text-slate-500 text-sm mt-0.5">Theo dõi hoạt động và thay đổi dữ liệu</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between px-6 pt-4 pb-0 border-b border-slate-100">
          <div className="flex gap-1">
            <button
              onClick={() => { setActiveTab('audit'); setSearchQuery(''); }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'audit' ? 'text-slate-900 border-b-2 border-slate-900 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Audit Log
            </button>
            <button
              onClick={() => { setActiveTab('approval'); setSearchQuery(''); }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${activeTab === 'approval' ? 'text-slate-900 border-b-2 border-slate-900 bg-white' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Nhật ký duyệt
            </button>
          </div>
          <div className="flex items-center gap-2 pb-2">
            {activeTab === 'audit' && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo loại, action..."
                  className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 w-56"
                />
              </div>
            )}
          </div>
        </div>

        {activeTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Thời gian</div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Action</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    <div className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" />Loại thực thể</div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Entity ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />User ID</div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Ghi chú</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">{searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có dữ liệu audit log'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedAuditLog(log)}>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{log.entity_type}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{truncate(log.entity_id, 24)}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{truncate(log.user_id, 20)}</td>
                      <td className="px-4 py-3 text-slate-500">{truncate(log.notes, 32)}</td>
                      <td className="px-4 py-3"><Eye className="w-4 h-4 text-slate-300 hover:text-slate-600 transition-colors" /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredAuditLogs.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
                Hiển thị {filteredAuditLogs.length} bản ghi {searchQuery ? `(lọc từ ${auditLogs.length})` : ''}
              </div>
            )}
          </div>
        )}

        {activeTab === 'approval' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Thời gian</div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    <div className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" />Loại thực thể</div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Entity ID</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
                    <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Thực hiện bởi</div>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {approvalLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Chưa có dữ liệu nhật ký duyệt</p>
                    </td>
                  </tr>
                ) : (
                  approvalLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3 text-slate-700">{log.entity_type}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{truncate(log.entity_id, 24)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {log.from_status ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{log.from_status}</span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{log.to_status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{truncate(log.performed_by, 20)}</td>
                      <td className="px-4 py-3 text-slate-500">{truncate(log.reason, 40)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {approvalLogs.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">Hiển thị {approvalLogs.length} bản ghi</div>
            )}
          </div>
        )}
      </div>

      {selectedAuditLog && (
        <Modal title="Chi tiết Audit Log" onClose={() => setSelectedAuditLog(null)} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Action</p>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded font-medium text-sm">{selectedAuditLog.action}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Loại thực thể</p>
                <p className="text-slate-900 font-medium">{selectedAuditLog.entity_type}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Entity ID</p>
                <p className="text-slate-700 font-mono text-xs break-all">{selectedAuditLog.entity_id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">User ID</p>
                <p className="text-slate-700 font-mono text-xs break-all">{selectedAuditLog.user_id ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">IP Address</p>
                <p className="text-slate-700 font-mono text-xs">{selectedAuditLog.ip_address ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Thời gian</p>
                <p className="text-slate-700 text-xs">{formatDate(selectedAuditLog.created_at)}</p>
              </div>
            </div>
            {selectedAuditLog.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Ghi chú</p>
                <p className="text-slate-700 text-sm">{selectedAuditLog.notes}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Snapshot cũ</p>
              {selectedAuditLog.old_snapshot !== null ? (
                <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedAuditLog.old_snapshot, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-400 text-sm italic">Không có dữ liệu</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Snapshot mới</p>
              {selectedAuditLog.new_snapshot !== null ? (
                <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedAuditLog.new_snapshot, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-400 text-sm italic">Không có dữ liệu</p>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
