import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Plus, Search, CreditCard as Edit2, X, Save, AlertCircle, Calendar } from 'lucide-react';

interface OrderRow {
  id: string;
  debit_group: string;
  order_qty: number;
  price_jpy: number;
  status: 'active' | 'completed' | 'cancelled';
  delivery_date: string | null;
  notes: string;
  produced_qty: number;
  product: { id: string; style_code: string; name: string; customer: { name: string }; factory: { name: string } };
}

interface FormState {
  product_id: string;
  debit_group: string;
  order_qty: string;
  price_jpy: string;
  status: string;
  delivery_date: string;
  notes: string;
}

const emptyForm: FormState = {
  product_id: '',
  debit_group: '',
  order_qty: '',
  price_jpy: '',
  status: 'active',
  delivery_date: '',
  notes: '',
};

const statusLabel = {
  active: { text: 'Đang chạy', cls: 'bg-blue-100 text-blue-700' },
  completed: { text: 'Hoàn thành', cls: 'bg-green-100 text-green-700' },
  cancelled: { text: 'Đã hủy', cls: 'bg-slate-100 text-slate-500' },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<{ id: string; style_code: string; name: string; customer: { name: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: ordersData }, { data: logsData }, { data: prodsData }] = await Promise.all([
      supabase.from('orders').select(`
        id, debit_group, order_qty, price_jpy, status, delivery_date, notes,
        products!inner(id, style_code, name, customers(name), factories(name))
      `).order('created_at', { ascending: false }),
      supabase.from('production_logs').select('order_id, quantity'),
      supabase.from('products').select('id, style_code, name, customers(name)').eq('active', true),
    ]);

    const totals: Record<string, number> = {};
    logsData?.forEach(l => { totals[l.order_id] = (totals[l.order_id] || 0) + l.quantity; });

    setOrders((ordersData ?? []).map((o: any) => ({
      id: o.id,
      debit_group: o.debit_group,
      order_qty: o.order_qty,
      price_jpy: o.price_jpy,
      status: o.status,
      delivery_date: o.delivery_date,
      notes: o.notes,
      produced_qty: totals[o.id] || 0,
      product: {
        id: o.products.id,
        style_code: o.products.style_code,
        name: o.products.name,
        customer: o.products.customers,
        factory: o.products.factories,
      },
    })));

    setProducts((prodsData ?? []).map((p: any) => ({
      id: p.id,
      style_code: p.style_code,
      name: p.name,
      customer: p.customers,
    })));

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (o: OrderRow) => {
    setEditId(o.id);
    setForm({
      product_id: o.product.id,
      debit_group: o.debit_group,
      order_qty: String(o.order_qty),
      price_jpy: String(o.price_jpy || ''),
      status: o.status,
      delivery_date: o.delivery_date || '',
      notes: o.notes,
    });
    setError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.product_id) { setError('Vui lòng chọn mã hàng'); return; }
    const qty = parseInt(form.order_qty);
    if (isNaN(qty) || qty <= 0) { setError('Số lượng order phải lớn hơn 0'); return; }
    setSaving(true);
    setError('');

    const payload = {
      product_id: form.product_id,
      debit_group: form.debit_group.trim(),
      order_qty: qty,
      price_jpy: parseFloat(form.price_jpy) || 0,
      status: form.status as 'active' | 'completed' | 'cancelled',
      delivery_date: form.delivery_date || null,
      notes: form.notes.trim(),
    };

    const { error } = editId
      ? await supabase.from('orders').update(payload).eq('id', editId)
      : await supabase.from('orders').insert(payload);

    if (error) setError(error.message);
    else { setShowForm(false); load(); }
    setSaving(false);
  };

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || o.product.style_code.toLowerCase().includes(q)
      || o.debit_group.toLowerCase().includes(q)
      || o.product.customer.name.toLowerCase().includes(q);
    const matchStatus = !filterStatus || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Đơn hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý đơn hàng (Orders)</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Tạo đơn hàng
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã hàng, DEBIT group..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="active">Đang chạy</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
          <option value="">Tất cả</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <ShoppingCart className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">Chưa có đơn hàng nào</p>
          <button onClick={openCreate} className="mt-4 text-sm text-blue-600 hover:underline">+ Tạo đơn hàng đầu tiên</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã hàng</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">DEBIT Group</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SL Order</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Đã SX</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Giao hàng</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(o => {
                const sl = statusLabel[o.status];
                const pct = o.order_qty > 0 ? Math.round((o.produced_qty / o.order_qty) * 100) : 0;
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900 text-sm">{o.product.style_code}</p>
                      <p className="text-xs text-slate-400">{o.product.customer.name}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-sm text-slate-700">{o.debit_group || '—'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm font-medium text-slate-800">{o.order_qty.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right hidden md:table-cell">
                      <span className={`text-sm font-medium ${pct > 100 ? 'text-red-600' : 'text-slate-700'}`}>
                        {o.produced_qty.toLocaleString()} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {o.delivery_date ? (
                        <span className="flex items-center gap-1 text-sm text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(o.delivery_date).toLocaleDateString('vi-VN')}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sl.cls}`}>{sl.text}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900">{editId ? 'Sửa đơn hàng' : 'Tạo đơn hàng mới'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã hàng <span className="text-red-500">*</span></label>
                <select
                  value={form.product_id}
                  onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Chọn mã hàng</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.style_code}{p.name ? ` - ${p.name}` : ''} ({p.customer.name})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">DEBIT Group</label>
                <input
                  type="text"
                  value={form.debit_group}
                  onChange={e => setForm(f => ({ ...f, debit_group: e.target.value }))}
                  placeholder="VD: BR-01"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Số lượng <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={form.order_qty}
                    onChange={e => setForm(f => ({ ...f, order_qty: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Đơn giá (JPY)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price_jpy}
                    onChange={e => setForm(f => ({ ...f, price_jpy: e.target.value }))}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ngày giao hàng</label>
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Trạng thái</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">Đang chạy</option>
                  <option value="completed">Hoàn thành</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Ghi chú</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ghi chú thêm..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
