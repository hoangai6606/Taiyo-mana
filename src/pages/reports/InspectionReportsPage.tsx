import { useState } from 'react';
import ReportList from './ReportList';
import ReportCreate from './ReportCreate';
import ReportDetail from './ReportDetail';
import type { InspectionReport } from '../../lib/database.types';
import { api } from '../../lib/api';

type View = 'list' | 'create' | 'detail';

export default function InspectionReportsPage() {
  const [view, setView] = useState<View>('list');
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);

  const handleCreate = () => {
    setSelectedReport(null);
    setView('create');
  };

  const handleDetail = async (report: InspectionReport) => {
    try {
      const fullReport = await api.inspectionReports.getById(report.id);
      setSelectedReport(fullReport);
      setView('detail');
    } catch (err) {
      console.error('Failed to fetch report:', err);
      alert('Không thể tải chi tiết báo cáo');
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedReport(null);
  };

  const handleSaved = () => {
    setView('list');
    setSelectedReport(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {view === 'list' && (
        <ReportList onCreate={handleCreate} onDetail={handleDetail} />
      )}
      {view === 'create' && (
        <ReportCreate onBack={handleBack} onSaved={handleSaved} />
      )}
      {view === 'detail' && selectedReport && (
        <ReportDetail report={selectedReport} onBack={handleBack} />
      )}
    </div>
  );
}
