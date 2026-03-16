import { useState } from 'react';
import {
  Factory,
  LayoutDashboard,
  TrendingUp,
  ClipboardCheck,
  Database,
  LogOut,
  Menu,
  X,
  ChevronRight,
  User,
  FileUp,
  Receipt,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../lib/database.types';

export type PageKey = 'dashboard' | 'production' | 'inspection' | 'master' | 'import' | 'debit' | 'audit';

interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { key: 'production', label: 'Sản xuất', icon: TrendingUp },
  { key: 'inspection', label: 'Kiểm hàng', icon: ClipboardCheck },
  { key: 'import', label: 'Import CSV', icon: FileUp },
  { key: 'debit', label: 'Debit Note', icon: Receipt, roles: ['manager', 'accounting_admin'] },
  { key: 'master', label: 'Dữ liệu gốc', icon: Database },
  { key: 'audit', label: 'Audit Log', icon: Shield, roles: ['manager', 'accounting_admin'] },
];

interface LayoutProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: React.ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { profile, signOut, role } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleNav = NAV_ITEMS.filter(item => !item.roles || (role && item.roles.includes(role)));

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-slate-900">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <Factory className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">TAIYO NISSHIN</p>
          <p className="text-slate-400 text-xs truncate">Vietnam</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map(({ key, label, icon: Icon }) => {
          const active = currentPage === key;
          return (
            <button
              key={key}
              onClick={() => { onNavigate(key); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="w-4 h-4" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate">{profile?.name_vn || 'User'}</p>
            <p className="text-slate-400 text-xs">{role ? ROLE_LABELS[role] : ''}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 flex flex-col z-10">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="font-bold text-slate-800">TAIYO NISSHIN</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
