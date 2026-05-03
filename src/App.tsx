import { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout, { type PageKey } from './components/Layout';
import LoginPage from './pages/LoginPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InspectionPage = lazy(() => import('./pages/inspection/InspectionPage'));
const InspectionReportsPage = lazy(() => import('./pages/reports/InspectionReportsPage'));
const DebitNotesPage = lazy(() => import('./pages/debit/DebitNotesPage'));
const SuperAdminPage = lazy(() => import('./pages/admin/SuperAdminPage'));

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-100">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
    </div>
  );
}

function AppContent() {
  const { profile, loading, isSuperAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>('inspection');

  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show login page if not authenticated
  if (!profile) {
    return <LoginPage />;
  }

  // Redirect away from admin page if not super admin
  if (currentPage === 'admin' && !isSuperAdmin) {
    setCurrentPage('inspection');
    return null;
  }

  const pages: Record<PageKey, React.ReactNode> = {
    dashboard: <DashboardPage />,
    inspection: <InspectionPage />,
    reports: <InspectionReportsPage />,
    debit: <DebitNotesPage />,
    admin: <SuperAdminPage onNavigate={setCurrentPage} />,
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <Suspense fallback={<LoadingSpinner />}>
        {pages[currentPage]}
      </Suspense>
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
