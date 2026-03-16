import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ProductStylesTab } from './ProductStylesTab';
import { OrderLotsTab } from './OrderLotsTab';
import { PriceRulesTab } from './PriceRulesTab';
import { DefectCatalogsTab } from './DefectCatalogsTab';
import { ReportTemplatesTab } from './ReportTemplatesTab';
import { UserPermissionsTab } from './UserPermissionsTab';
import { Package, ShoppingCart, Tag, AlertCircle, FileText, Users } from 'lucide-react';

type TabId = 'styles' | 'lots' | 'prices' | 'defects' | 'templates' | 'permissions';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  managerOnly?: boolean;
}

const TABS: Tab[] = [
  { id: 'styles', label: 'Mã hàng', icon: Package },
  { id: 'lots', label: 'Order Lots', icon: ShoppingCart },
  { id: 'prices', label: 'Quy tắc giá', icon: Tag },
  { id: 'defects', label: 'Danh mục lỗi', icon: AlertCircle },
  { id: 'templates', label: 'Mẫu báo cáo', icon: FileText },
  { id: 'permissions', label: 'Phân quyền', icon: Users, managerOnly: true },
];

export function MasterDataPage() {
  const { isManager } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('styles');

  const visibleTabs = TABS.filter(t => !t.managerOnly || isManager);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dữ liệu gốc</h1>
        <p className="text-slate-500 text-sm mt-1">Quản lý mã hàng, đơn hàng, giá, danh mục lỗi và phân quyền</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'styles' && <ProductStylesTab />}
        {activeTab === 'lots' && <OrderLotsTab />}
        {activeTab === 'prices' && <PriceRulesTab />}
        {activeTab === 'defects' && <DefectCatalogsTab />}
        {activeTab === 'templates' && <ReportTemplatesTab />}
        {activeTab === 'permissions' && isManager && <UserPermissionsTab />}
      </div>
    </div>
  );
}
