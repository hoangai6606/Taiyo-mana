import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ImportJob, ImportJobStatus } from '../lib/database.types';
import { FileUp, Upload, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Eye, Trash2, FileText } from 'lucide-react';

const STATUS_LABELS: Record<ImportJobStatus, string> = {
  uploaded: 'Đã tải lên',
  parsing: 'Đang xử lý',
  preview: 'Xem trước',
  validating: 'Đang kiểm tra',
  committed: 'Đã commit',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

const STATUS_COLORS: Record<ImportJobStatus, string> = {
  uploaded: 'bg-slate-100 text-slate-600',
  parsing: 'bg-amber-100 text-amber-700',
  preview: 'bg-blue-100 text-blue-700',
  validating: 'bg-amber-100 text-amber-700',
  committed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const STATUS_ICONS: Record<ImportJobStatus, React.ReactNode> = {
  uploaded: <Clock className="w-3.5 h-3.5" />,
  parsing: <RefreshCw className="w-3.5 h-3.5" />,
  preview: <Eye className="w-3.5 h-3.5" />,
  validating: <AlertTriangle className="w-3.5 h-3.5" />,
  committed: <CheckCircle2 className="w-3.5 h-3.5" />,
  failed: <XCircle className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

export default function ImportPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('import_jobs')
      .select('*')
      .order('created_at', { ascending: false });
    setJobs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Chỉ hỗ trợ file CSV');
      setUploadSuccess('');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    const { error } = await supabase.from('import_jobs').insert({
      original_filename: file.name,
      import_type: 'csv',
      status: 'uploaded',
      created_by: user?.id ?? null,
      notes: '',
    });
    if (error) {
      setUploadError(error.message);
    } else {
      setUploadSuccess(`Đã tải lên "${file.name}" thành công`);
      await load();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const commitJob = async (job: ImportJob) => {
    await supabase.from('import_jobs').update({ status: 'committed' }).eq('id', job.id);
    await load();
  };

  const cancelJob = async (job: ImportJob) => {
    await supabase.from('import_jobs').update({ status: 'cancelled' }).eq('id', job.id);
    await load();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Import CSV</h1>
        <p className="text-slate-500 text-sm mt-1">Quản lý các tác vụ nhập dữ liệu từ file CSV</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`mb-6 border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}
          ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
          disabled={uploading}
        />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
          ) : (
            <FileUp className="w-10 h-10 text-slate-300" />
          )}
          <div>
            <p className="text-slate-700 font-medium text-sm">
              {uploading ? 'Đang tải lên...' : 'Kéo thả file CSV vào đây hoặc click để chọn'}
            </p>
            {!uploading && (
              <p className="text-slate-400 text-xs mt-1">Chỉ hỗ trợ file .csv</p>
            )}
          </div>
          {!uploading && (
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              <Upload className="w-4 h-4" /> Chọn file
            </button>
          )}
        </div>
      </div>

      {uploadSuccess && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {uploadSuccess}
        </div>
      )}

      {uploadError && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <XCircle className="w-4 h-4 shrink-0" />
          {uploadError}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">Danh sách import jobs</h2>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">Chưa có import job nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-400 font-medium uppercase tracking-wide">
                  <th className="text-left px-4 py-3">File</th>
                  <th className="text-left px-4 py-3">Loại</th>
                  <th className="text-left px-4 py-3">Trạng thái</th>
                  <th className="text-right px-4 py-3">Tổng</th>
                  <th className="text-right px-4 py-3">Hợp lệ</th>
                  <th className="text-right px-4 py-3">Lỗi</th>
                  <th className="text-right px-4 py-3">Committed</th>
                  <th className="text-left px-4 py-3">Ngày tạo</th>
                  <th className="text-right px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {jobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                        <span className="font-medium text-slate-800 truncate max-w-48" title={job.original_filename}>
                          {job.original_filename}
                        </span>
                      </div>
                      {job.error_summary && (
                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-48" title={job.error_summary}>
                          {job.error_summary}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{job.import_type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                        {STATUS_ICONS[job.status]}
                        {STATUS_LABELS[job.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{job.total_rows ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-green-600">{job.valid_rows ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-red-500">{job.error_rows ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{job.committed_rows ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(job.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {job.status === 'preview' && (
                          <button
                            onClick={() => commitJob(job)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                          >
                            <Eye className="w-3.5 h-3.5" /> Xem trước / Commit
                          </button>
                        )}
                        {job.status !== 'committed' && job.status !== 'cancelled' && (
                          <button
                            onClick={() => cancelJob(job)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
