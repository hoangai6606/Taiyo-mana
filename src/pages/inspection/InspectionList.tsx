import { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, Pencil } from 'lucide-react';
import { api } from '../../lib/api';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import type { InspectionRecord } from '../../lib/database.types';

interface Props {
  onCreate: () => void;
  onDetail: (record: InspectionRecord) => void;
  onEdit: (record: InspectionRecord) => void;
}

export default function InspectionList({ onCreate, onDetail, onEdit }: Props) {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.inspectionRecords.list();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;
    try {
      await api.inspectionRecords.delete(id);
      await loadRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('CẢNH BÁO: Bạn sắp xóa TẤT CẢ dữ liệu kiểm hàng! Điều này không thể hoàn tác. Tiếp tục?')) return;
    if (!confirm('Xác nhận lần cuối: XÓA TẤT CẢ dữ liệu?')) return;
    try {
      setLoading(true);
      await api.inspectionRecords.deleteAll();
      await loadRecords();
    } catch (err: any) {
      setError(err.message || 'Failed to delete all records');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dữ liệu kiểm hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý phiếu kiểm hàng QC</p>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Tạo Phiếu Kiểm Mới
        </button>
        {records.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Xóa Tất Cả
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Chưa có phiếu kiểm hàng nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Mã phiếu</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Khách hàng</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Nhà máy</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Ngày tạo</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{record.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-900">{record.customerName || record.customerId}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{record.factoryNames || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(record.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onDetail(record)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                          title="Chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(record)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"
                          title="Sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
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
    </div>
  );
}