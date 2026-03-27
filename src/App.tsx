import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Layout, { type PageKey } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ProductionPage from './pages/ProductionPage';
import InspectionPage from './pages/InspectionPage';
import { MasterDataPage } from './pages/master/MasterDataPage';
import ImportPage from './pages/ImportPage';
import DebitPage from './pages/DebitPage';
import AuditLogPage from './pages/AuditLogPage';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

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
