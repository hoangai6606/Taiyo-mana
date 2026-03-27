import {
  TrendingUp,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Package,
  BarChart3,
  Activity,
} from 'lucide-react';
import {
  MOCK_QUANTITY_LOGS,
  MOCK_ORDER_LOTS,
  MOCK_INSPECTION_SESSIONS,
  MOCK_PRODUCT_STYLES,
  MOCK_CUSTOMERS,
} from '../lib/mock-data';

const lotTotals: Record<string, number> = {};
MOCK_QUANTITY_LOGS.forEach(l => { lotTotals[l.order_lot_id] = (lotTotals[l.order_lot_id] || 0) + l.quantity; });

const todayProduction = MOCK_QUANTITY_LOGS
  .filter(l => l.log_date === '2024-03-05')
  .reduce((s, l) => s + l.quantity, 0);
const activeOrders = MOCK_ORDER_LOTS.filter(l => l.status === 'active').length;
const overProduced = MOCK_ORDER_LOTS.filter(l => l.status === 'active' && (lotTotals[l.id] || 0) > l.order_qty).length;
const pendingApproval = MOCK_INSPECTION_SESSIONS.filter(s => s.status === 'submitted').length;

const recentReports = MOCK_INSPECTION_SESSIONS.slice(0, 5).map(s => {
  const style = MOCK_PRODUCT_STYLES.find(p => p.id === s.product_style_id);
  const cust = MOCK_CUSTOMERS.find(c => c.id === s.customer_id);
  return {
    id: s.id,
    product_name: style ? `${style.style_code} \u2014 ${cust?.name ?? ''}` : 'N/A',
    inspection_date: s.inspection_date,
    status: s.status,
  };
});

const statusLabel: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Nháp', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Đã duyệt', cls: 'bg-blue-100 text-blue-700' },
  locked: { label: 'Đã khóa', cls: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-700' },
};

const statCards = [
  { label: 'Sản lượng hôm nay', value: todayProduction.toLocaleString(), unit: 'đôi/cái', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
  { label: 'Đơn hàng đang chạy', value: activeOrders.toLocaleString(), unit: 'đơn', icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { label: 'Vượt tồn kho', value: overProduced.toLocaleString(), unit: 'đơn', icon: AlertTriangle, color: overProduced > 0 ? 'text-red-500' : 'text-slate-400', bg: overProduced > 0 ? 'bg-red-50' : 'bg-slate-50' },
  { label: 'Chờ phê duyệt', value: pendingApproval.toLocaleString(), unit: 'phiếu kiểm', icon: ClipboardCheck, color: pendingApproval > 0 ? 'text-amber-500' : 'text-slate-400', bg: pendingApproval > 0 ? 'bg-amber-50' : 'bg-slate-50' },
];

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, unit, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{unit}</p>
            <p className="text-sm text-slate-600 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {overProduced > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-800 font-semibold text-sm">Cảnh báo vượt tồn kho</p>
            <p className="text-red-600 text-sm mt-0.5">
              {overProduced} đơn hàng có sản lượng thực tế vượt quá số lượng order.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <Activity className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Báo cáo kiểm hàng gần nhất</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentReports.map(r => {
              const s = statusLabel[r.status] ?? { label: r.status, cls: 'bg-slate-100 text-slate-600' };
              return (
                <div key={r.id} className="px-6 py-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.product_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date(r.inspection_date).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Hướng dẫn nhanh</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              { step: '1', text: 'Thêm mã hàng mới trong mục "Dữ liệu gốc"' },
              { step: '2', text: 'Tạo order lot cho mã hàng trong "Dữ liệu gốc → Order Lots"' },
              { step: '3', text: 'Ghi nhận sản lượng hàng ngày trong trang "Sản xuất"' },
              { step: '4', text: 'Tạo và hoàn thành báo cáo kiểm hàng trong "Kiểm hàng"' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {step}
                </div>
                <p className="text-sm text-slate-600">{text}</p>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <p className="text-sm font-medium">Hệ thống đã sẵn sàng hoạt động!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
