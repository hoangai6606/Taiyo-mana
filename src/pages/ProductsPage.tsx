import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Package, Plus, Search, CreditCard as Edit2, X, Save, AlertCircle, Check } from 'lucide-react';

interface ProductWithRefs {
  id: string;
  style_code: string;
  name: string;
  active: boolean;
  customer: { id: string; code: string; name: string };
  factory: { id: string; code: string; name: string };
  product_type: { id: string; code: string; name: string };
}

interface FormState {
  style_code: string;
  name: string;
  customer_id: string;
  factory_id: string;
  product_type_id: string;
}

const emptyForm: FormState = {
  style_code: '',
  name: '',
  customer_id: '',
  factory_id: '',
  product_type_id: '',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithRefs[]>([]);
  const [customers, setCustomers] = useState<{ id: string; code: string; name: string }[]>([]);
  const [factories, setFactories] = useState<{ id: string; code: string; name: string }[]>([]);
  const [productTypes, setProductTypes] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: custs }, { data: facts }, { data: types }] = await Promise.all([
      supabase.from('products').select(`
        id, style_code, name, active,
        customers!inner(id, code, name),
        factories!inner(id, code, name),
        product_types!inner(id, code, name)
      `).order('created_at', { ascending: false }),
      supabase.from('customers').select('id, code, name'),
      supabase.from('factories').select('id, code, name'),
      supabase.from('product_types').select('id, code, name'),
    ]);

    setCustomers(custs ?? []);
    setFactories(facts ?? []);
    setProductTypes(types ?? []);
    setProducts((prods ?? []).map((p: any) => ({
      id: p.id,
      style_code: p.style_code,
      name: p.name,
      active: p.active,
      customer: p.customers,
      factory: p.factories,
      product_type: p.product_types,
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

  const openEdit = (p: ProductWithRefs) => {
    setEditId(p.id);
    setForm({
      style_code: p.style_code,
      name: p.name,
      customer_id: p.customer.id,
      factory_id: p.factory.id,
      product_type_id: p.product_type.id,
    });
    setError('');
    setShowForm(true);
  };

  const save = async () => {
    if (!form.style_code.trim()) { setError('Vui lòng nhập mã hàng'); return; }
    if (!form.customer_id) { setError('Vui lòng chọn khách hàng'); return; }
    if (!form.factory_id) { setError('Vui lòng chọn nhà máy'); return; }
    if (!form.product_type_id) { setError('Vui lòng chọn loại sản phẩm'); return; }
    setSaving(true);
    setError('');
    if (editId) {
      const { error } = await supabase.from('products').update({
        style_code: form.style_code.trim(),
        name: form.name.trim(),
        customer_id: form.customer_id,
        factory_id: form.factory_id,
        product_type_id: form.product_type_id,
      }).eq('id', editId);
      if (error) setError(error.message);
      else { setShowForm(false); load(); }
    } else {
      const { error } = await supabase.from('products').insert({
        style_code: form.style_code.trim(),
        name: form.name.trim(),
        customer_id: form.customer_id,
        factory_id: form.factory_id,
        product_type_id: form.product_type_id,
      });
      if (error) setError(error.message);
      else { setShowForm(false); load(); }
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('products').update({ active: !active }).eq('id', id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !active } : p));
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    return !q || p.style_code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.customer.name.toLowerCase().includes(q);
  });

  const typeColors: Record<string, string> = {
    SHOES: 'bg-blue-100 text-blue-700',
    APPAREL: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mã hàng</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý danh mục sản phẩm</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Thêm mã hàng
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tìm mã hàng, tên, khách hàng..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500">Chưa có mã hàng nào</p>
          <button onClick={openCreate} className="mt-4 text-sm text-blue-600 hover:underline">+ Thêm mã hàng đầu tiên</button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mã hàng</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Khách hàng</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Nhà máy</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Loại</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trạng thái</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${!p.active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-900 text-sm">{p.style_code}</p>
                    {p.name && <p className="text-xs text-slate-400 mt-0.5">{p.name}</p>}
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-sm text-slate-700">{p.customer.name}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="text-sm text-slate-700">{p.factory.name}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColors[p.product_type.code] || 'bg-slate-100 text-slate-600'}`}>
                      {p.product_type.name.split(' / ')[0]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => toggleActive(p.id, p.active)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${p.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {p.active ? <><Check className="w-3 h-3" /> Hoạt động</> : 'Ngừng'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-900">{editId ? 'Sửa mã hàng' : 'Thêm mã hàng mới'}</h3>
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
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mã hàng (Style Code) <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.style_code}
                  onChange={e => setForm(f => ({ ...f, style_code: e.target.value }))}
                  placeholder="VD: BR-1120"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên sản phẩm</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="VD: Giày thể thao nam"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Khách hàng <span className="text-red-500">*</span></label>
                <select
                  value={form.customer_id}
                  onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Chọn khách hàng</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nhà máy <span className="text-red-500">*</span></label>
                <select
                  value={form.factory_id}
                  onChange={e => setForm(f => ({ ...f, factory_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Chọn nhà máy</option>
                  {factories.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Loại sản phẩm <span className="text-red-500">*</span></label>
                <select
                  value={form.product_type_id}
                  onChange={e => setForm(f => ({ ...f, product_type_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Chọn loại</option>
                  {productTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
