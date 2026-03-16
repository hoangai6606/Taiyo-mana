import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { DefectCatalog, DefectCatalogItem, ProductTypeRecord } from '../../lib/database.types';
import { Modal } from '../../components/ui/Modal';
import { FormField, inputClass, selectClass } from '../../components/ui/FormField';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { AlertCircle, Plus, CreditCard as Edit2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface CatalogRow extends DefectCatalog {
  product_type?: ProductTypeRecord;
  items: DefectCatalogItem[];
}

interface CatalogFormState { code: string; name: string; product_type_id: string; }
interface ItemFormState { code: string; name_vn: string; name_jp: string; sort_order: string; }

const emptyCatalog: CatalogFormState = { code: '', name: '', product_type_id: '' };
const emptyItem: ItemFormState = { code: '', name_vn: '', name_jp: '', sort_order: '0' };

export function DefectCatalogsTab() {
  const { isManager } = useAuth();
  const [catalogs, setCatalogs] = useState<CatalogRow[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editCatalogId, setEditCatalogId] = useState<string | null>(null);
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(emptyCatalog);
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [itemCatalogId, setItemCatalogId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItem);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemError, setItemError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: catData }, { data: itemData }, { data: ptData }] = await Promise.all([
      supabase.from('defect_catalogs').select('*, product_types(*)').order('code'),
      supabase.from('defect_catalog_items').select('*').order('sort_order'),
      supabase.from('product_types').select('*').order('code'),
    ]);
    setProductTypes(ptData ?? []);
    const itemMap: Record<string, DefectCatalogItem[]> = {};
    (itemData ?? []).forEach((item: any) => {
      if (!itemMap[item.catalog_id]) itemMap[item.catalog_id] = [];
      itemMap[item.catalog_id].push(item);
    });
    setCatalogs((catData ?? []).map((c: any) => ({
      ...c,
      product_type: c.product_types ?? undefined,
      items: itemMap[c.id] ?? [],
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreateCatalog = () => { setEditCatalogId(null); setCatalogForm(emptyCatalog); setCatalogError(''); setShowCatalogModal(true); };
  const openEditCatalog = (c: CatalogRow) => {
    setEditCatalogId(c.id);
    setCatalogForm({ code: c.code, name: c.name, product_type_id: c.product_type_id ?? '' });
    setCatalogError(''); setShowCatalogModal(true);
  };

  const saveCatalog = async () => {
    if (!catalogForm.code.trim() || !catalogForm.name.trim()) { setCatalogError('Vui lòng điền mã và tên danh mục'); return; }
    setCatalogSaving(true); setCatalogError('');
    const payload = { code: catalogForm.code.trim(), name: catalogForm.name.trim(), product_type_id: catalogForm.product_type_id || null };
    const { error: e } = editCatalogId
      ? await supabase.from('defect_catalogs').update(payload).eq('id', editCatalogId)
      : await supabase.from('defect_catalogs').insert({ ...payload, active: true });
    if (e) setCatalogError(e.message);
    else { setShowCatalogModal(false); load(); }
    setCatalogSaving(false);
  };

  const toggleCatalogActive = async (id: string, current: boolean) => {
    await supabase.from('defect_catalogs').update({ active: !current }).eq('id', id);
    load();
  };

  const openCreateItem = (catalogId: string) => {
    setEditItemId(null); setItemCatalogId(catalogId);
    const cat = catalogs.find(c => c.id === catalogId);
    const nextOrder = cat ? cat.items.length * 10 : 0;
    setItemForm({ ...emptyItem, sort_order: String(nextOrder) });
    setItemError(''); setShowItemModal(true);
  };

  const openEditItem = (item: DefectCatalogItem) => {
    setEditItemId(item.id); setItemCatalogId(item.catalog_id);
    setItemForm({ code: item.code, name_vn: item.name_vn, name_jp: item.name_jp, sort_order: String(item.sort_order) });
    setItemError(''); setShowItemModal(true);
  };

  const saveItem = async () => {
    if (!itemForm.name_vn.trim()) { setItemError('Vui lòng điền tên lỗi (tiếng Việt)'); return; }
    setItemSaving(true); setItemError('');
    const payload = {
      code: itemForm.code.trim(),
      name_vn: itemForm.name_vn.trim(),
      name_jp: itemForm.name_jp.trim(),
      sort_order: parseInt(itemForm.sort_order) || 0,
    };
    const { error: e } = editItemId
      ? await supabase.from('defect_catalog_items').update(payload).eq('id', editItemId)
      : await supabase.from('defect_catalog_items').insert({ ...payload, catalog_id: itemCatalogId, active: true });
    if (e) setItemError(e.message);
    else { setShowItemModal(false); load(); }
    setItemSaving(false);
  };

  const toggleItemActive = async (id: string, current: boolean) => {
    await supabase.from('defect_catalog_items').update({ active: !current }).eq('id', id);
    load();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Quản lý danh mục lỗi kiểm hàng và các mục lỗi con</p>
        {isManager && (
          <button onClick={openCreateCatalog} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Thêm danh mục
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : catalogs.length === 0 ? (
        <div className="py-16 text-center"><AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-2" /><p className="text-slate-400 text-sm">Chưa có danh mục lỗi nào</p></div>
      ) : (
        <div className="space-y-2">
          {catalogs.map(c => {
            const isOpen = expandedId === c.id;
            const activeItems = c.items.filter(i => i.active);
            return (
              <div key={c.id} className={`bg-white rounded-xl border ${!c.active ? 'opacity-60' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => setExpandedId(isOpen ? null : c.id)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{c.code}</span>
                      <span className="text-slate-600 text-sm">{c.name}</span>
                      {c.product_type && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">{c.product_type.code}</span>}
                      {!c.active && <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-400">Đã ẩn</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{activeItems.length} mục lỗi đang hoạt động</p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {isManager && (
                      <>
                        <button onClick={() => openEditCatalog(c)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleCatalogActive(c.id, c.active)} className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                          {c.active ? 'Ẩn' : 'Hiện'}
                        </button>
                      </>
                    )}
                    <button onClick={() => setExpandedId(isOpen ? null : c.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    {c.items.length === 0 ? (
                      <p className="text-xs text-slate-400 py-2">Chưa có mục lỗi nào</p>
                    ) : (
                      <div className="space-y-1 mb-3">
                        {c.items.map(item => (
                          <div key={item.id} className={`flex items-center gap-3 py-1.5 px-3 rounded-lg ${!item.active ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                            <span className="text-xs font-mono text-slate-400 w-10 shrink-0">{item.code || '—'}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-slate-700">{item.name_vn}</span>
                              {item.name_jp && <span className="ml-2 text-xs text-slate-400">{item.name_jp}</span>}
                            </div>
                            {isManager && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openEditItem(item)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => toggleItemActive(item.id, item.active)} className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isManager && (
                      <button onClick={() => openCreateItem(c.id)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium py-1">
                        <Plus className="w-3.5 h-3.5" /> Thêm mục lỗi
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCatalogModal && (
        <Modal title={editCatalogId ? 'Sửa danh mục lỗi' : 'Thêm danh mục lỗi'} onClose={() => setShowCatalogModal(false)}>
          <div className="space-y-4">
            {catalogError && <ErrorAlert message={catalogError} />}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mã danh mục" required>
                <input className={inputClass} value={catalogForm.code} onChange={e => setCatalogForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: BR-GENERAL" />
              </FormField>
              <FormField label="Loại hàng áp dụng">
                <select className={selectClass} value={catalogForm.product_type_id} onChange={e => setCatalogForm(f => ({ ...f, product_type_id: e.target.value }))}>
                  <option value="">Tất cả loại hàng</option>
                  {productTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.code} — {pt.name}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Tên danh mục" required>
              <input className={inputClass} value={catalogForm.name} onChange={e => setCatalogForm(f => ({ ...f, name: e.target.value }))} placeholder="VD: Lỗi hàng may mặc" />
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCatalogModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={saveCatalog} disabled={catalogSaving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">{catalogSaving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </Modal>
      )}

      {showItemModal && (
        <Modal title={editItemId ? 'Sửa mục lỗi' : 'Thêm mục lỗi'} onClose={() => setShowItemModal(false)}>
          <div className="space-y-4">
            {itemError && <ErrorAlert message={itemError} />}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Mã lỗi">
                <input className={inputClass} value={itemForm.code} onChange={e => setItemForm(f => ({ ...f, code: e.target.value }))} placeholder="VD: D01" />
              </FormField>
              <FormField label="Thứ tự">
                <input type="number" min="0" className={inputClass} value={itemForm.sort_order} onChange={e => setItemForm(f => ({ ...f, sort_order: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Tên lỗi (tiếng Việt)" required>
              <input className={inputClass} value={itemForm.name_vn} onChange={e => setItemForm(f => ({ ...f, name_vn: e.target.value }))} placeholder="VD: Đứt chỉ" />
            </FormField>
            <FormField label="Tên lỗi (tiếng Nhật)">
              <input className={inputClass} value={itemForm.name_jp} onChange={e => setItemForm(f => ({ ...f, name_jp: e.target.value }))} placeholder="VD: 糸切れ" />
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowItemModal(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Hủy</button>
              <button onClick={saveItem} disabled={itemSaving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-sm font-medium">{itemSaving ? 'Đang lưu...' : 'Lưu'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
