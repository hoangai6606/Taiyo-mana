import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  Package,
  BarChart3,
  Activity,
} from 'lucide-react';

interface DashboardStats {
  todayProduction: number;
  activeOrders: number;
  negativeStockOrders: number;
  avgDefectRate: number;
  recentReports: RecentReport[];
  topDefects: TopDefect[];
}

interface RecentReport {
  id: string;
  product_name: string;
  inspection_date: string;
  status: string;
  defect_rate: number;
}

interface TopDefect {
  name: string;
  count: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todayProduction: 0,
    activeOrders: 0,
    negativeStockOrders: 0,
    avgDefectRate: 0,
    recentReports: [],
    topDefects: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [{ data: todayLogs }, { data: activeLots }, { data: reports }, { data: pendingSessions }] = await Promise.all([
          supabase.from('quantity_logs').select('quantity').eq('log_date', today),
          supabase.from('order_lots').select('id, order_qty').eq('status', 'active'),
          supabase
            .from('inspection_sessions')
            .select('id, inspection_date, status, product_styles(style_code, customers(name))')
            .is('deleted_at', null)
            .order('inspection_date', { ascending: false })
            .limit(5),
          supabase.from('inspection_sessions').select('id').eq('status', 'submitted').is('deleted_at', null),
        ]);

        const todayProduction = (todayLogs ?? []).reduce((s: number, l: any) => s + l.quantity, 0);
        const activeOrders = activeLots?.length ?? 0;

        let negativeCount = 0;
        if (activeLots && activeLots.length > 0) {
          const lotIds = activeLots.map((o: any) => o.id);
          const { data: logs } = await supabase.from('quantity_logs').select('order_lot_id, quantity').in('order_lot_id', lotIds);
          const totals: Record<string, number> = {};
          (logs ?? []).forEach((l: any) => { totals[l.order_lot_id] = (totals[l.order_lot_id] || 0) + l.quantity; });
          activeLots.forEach((o: any) => { if ((totals[o.id] || 0) > o.order_qty) negativeCount++; });
        }

        const recentReports: RecentReport[] = (reports ?? []).map((r: any) => {
          const style = r.product_styles as { style_code: string; customers?: { name: string } } | null;
          return {
            id: r.id,
            product_name: style ? `${style.style_code}${style.customers?.name ? ' — ' + style.customers.name : ''}` : 'N/A',
            inspection_date: r.inspection_date,
            status: r.status,
            defect_rate: 0,
          };
        });

        setStats({
          todayProduction,
          activeOrders,
          negativeStockOrders: negativeCount,
          avgDefectRate: pendingSessions?.length ?? 0,
          recentReports,
          topDefects: [],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusLabel: Record<string, { label: string; class: string }> = {
    draft: { label: 'Nháp', class: 'bg-slate-100 text-slate-600' },
    submitted: { label: 'Chờ duyệt', class: 'bg-amber-100 text-amber-700' },
    approved: { label: 'Đã duyệt', class: 'bg-blue-100 text-blue-700' },
    locked: { label: 'Đã khóa', class: 'bg-green-100 text-green-700' },
    rejected: { label: 'Từ chối', class: 'bg-red-100 text-red-700' },
  };

  const statCards = [
    {
      label: 'Sản lượng hôm nay',
      value: stats.todayProduction.toLocaleString(),
      unit: 'đôi/cái',
      icon: TrendingUp,
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Đơn hàng đang chạy',
      value: stats.activeOrders.toLocaleString(),
      unit: 'đơn',
      icon: Package,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Vượt tồn kho',
      value: stats.negativeStockOrders.toLocaleString(),
      unit: 'đơn',
      icon: AlertTriangle,
      color: stats.negativeStockOrders > 0 ? 'bg-red-500' : 'bg-slate-400',
      bg: stats.negativeStockOrders > 0 ? 'bg-red-50' : 'bg-slate-50',
    },
    {
      label: 'Chờ phê duyệt',
      value: stats.avgDefectRate.toLocaleString(),
      unit: 'phiếu kiểm',
      icon: ClipboardCheck,
      color: stats.avgDefectRate > 0 ? 'bg-amber-500' : 'bg-slate-400',
      bg: stats.avgDefectRate > 0 ? 'bg-amber-50' : 'bg-slate-50',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
              <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{unit}</p>
            <p className="text-sm text-slate-600 mt-1 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {stats.negativeStockOrders > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-800 font-semibold text-sm">Cảnh báo vượt tồn kho</p>
            <p className="text-red-600 text-sm mt-0.5">
              {stats.negativeStockOrders} đơn hàng có sản lượng thực tế vượt quá số lượng order. Vui lòng kiểm tra module Sản lượng.
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
          {stats.recentReports.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <ClipboardCheck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Chưa có báo cáo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.recentReports.map(r => {
                const s = statusLabel[r.status] ?? { label: r.status, class: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={r.id} className="px-6 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.product_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(r.inspection_date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${s.class}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Hướng dẫn nhanh</h2>
          </div>
          <div className="p-6 space-y-3">
            {[
              { step: '1', text: 'Thêm mã hàng mới trong mục "Mã hàng"', icon: Package },
              { step: '2', text: 'Tạo đơn hàng (order) cho mã hàng đó', icon: ShoppingCartIcon },
              { step: '3', text: 'Ghi nhận sản lượng hàng ngày trong "Sản lượng"', icon: TrendingUp },
              { step: '4', text: 'Tạo và hoàn thành báo cáo kiểm hàng trong "Kiểm hàng"', icon: ClipboardCheck },
            ].map(({ step, text, icon: Icon }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {step}
                </div>
                <div className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-600">{text}</p>
                </div>
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

function ShoppingCartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
