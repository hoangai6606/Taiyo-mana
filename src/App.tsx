import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Layout, { type PageKey } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProductionPage from './pages/ProductionPage';
import InspectionPage from './pages/InspectionPage';
import { MasterDataPage } from './pages/master/MasterDataPage';
import ImportPage from './pages/ImportPage';
import DebitPage from './pages/DebitPage';
import AuditLogPage from './pages/AuditLogPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const pages: Record<PageKey, React.ReactNode> = {
    dashboard: <DashboardPage />,
    production: <ProductionPage />,
    inspection: <InspectionPage />,
    master: <MasterDataPage />,
    import: <ImportPage />,
    debit: <DebitPage />,
    audit: <AuditLogPage />,
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {pages[currentPage]}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
