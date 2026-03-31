import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout, { type PageKey } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import InspectionPage from './pages/inspection/InspectionPage';
import DebitNotesPage from './pages/debit/DebitNotesPage';
import SuperAdminPage from './pages/admin/SuperAdminPage';

function AppContent() {
  const { profile, loading, isSuperAdmin } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!profile) {
    return <LoginPage />;
  }

  // Redirect away from admin page if not super admin
  if (currentPage === 'admin' && !isSuperAdmin) {
    setCurrentPage('dashboard');
    return null;
  }

  const pages: Record<PageKey, React.ReactNode> = {
    dashboard: <DashboardPage />,
    inspection: <InspectionPage />,
    debit: <DebitNotesPage />,
    admin: <SuperAdminPage onNavigate={setCurrentPage} />,
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
