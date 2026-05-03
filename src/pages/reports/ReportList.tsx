import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { InspectionReport } from '../../lib/database.types';
import { buildGroups, exportInspectionReportFromGroups } from '../../lib/export-inspection-report';
import type { InspectionItem } from '../../lib/database.types';
import { FileDown, Trash2, Eye, Plus } from 'lucide-react';

interface Props {
  onCreate: () => void;
  onDetail: (report: InspectionReport) => void;
}

export default function ReportList({ onCreate, onDetail }: Props) {
  const [reports, setReports] = useState<InspectionReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.inspectionReports.list();
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa báo cáo này?')) return;
    try {
      await api.inspectionReports.delete(id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
      alert('Không thể xóa báo cáo');
    }
  };

  const handleExport = async (report: InspectionReport) => {
    try {
      const full = report.items ? report : await api.inspectionReports.getById(report.id);
      const items = (full.items || []) as unknown as InspectionItem[];
      if (items.length === 0) {
        alert('Báo cáo không có dữ liệu');
        return;
      }
      const groups = buildGroups(items);
      const dateStr = full.inspectionDate
        ? new Date(full.inspectionDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';
      await exportInspectionReportFromGroups(groups, {
        customerName: full.customerName || '',
        factoryNames: full.factoryNames || '',
        dateStr,
        code: full.code,
      }, full.productivity);
    } catch (err) {
      console.error(err);
      alert('Xuất Excel thất bại');
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Phiếu báo cáo</h1>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tạo báo cáo
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Chưa có báo cáo nào. Nhấn "Tạo báo cáo" để bắt đầu.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Mã phiếu</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Khách hàng</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nhà máy</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ngày</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Trạng thái</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{r.code}</td>
                  <td className="px-4 py-3">{r.customerName || '-'}</td>
                  <td className="px-4 py-3">{r.factoryNames || '-'}</td>
                  <td className="px-4 py-3">{formatDate(r.inspectionDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'finalized'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {r.status === 'finalized' ? 'Hoàn thành' : 'Nháp'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onDetail(r)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleExport(r)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-blue-500"
                        title="Xuất Excel"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-red-500"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
