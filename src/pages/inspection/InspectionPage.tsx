import { useState } from 'react';
import InspectionList from './InspectionList';
import InspectionForm from './InspectionForm';
import InspectionDetail from './InspectionDetail';
import type { InspectionRecord } from '../../lib/database.types';
import { api } from '../../lib/api';

type View = 'list' | 'create' | 'detail' | 'edit';

export default function InspectionPage() {
  const [view, setView] = useState<View>('list');
  const [selectedRecord, setSelectedRecord] = useState<InspectionRecord | null>(null);

  const handleCreate = () => {
    setSelectedRecord(null);
    setView('create');
  };

  const handleDetail = async (record: InspectionRecord) => {
    try {
      const fullRecord = await api.inspectionRecords.getById(record.id);
      setSelectedRecord(fullRecord);
      setView('detail');
    } catch (err) {
      console.error('Failed to fetch detail:', err);
      alert('Không thể tải chi tiết phiếu kiểm hàng');
    }
  };

  const handleEdit = async (record: InspectionRecord) => {
    try {
      const fullRecord = await api.inspectionRecords.getById(record.id);
      setSelectedRecord(fullRecord);
      setView('edit');
    } catch (err) {
      console.error('Failed to fetch record for edit:', err);
      alert('Không thể tải phiếu kiểm hàng');
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedRecord(null);
  };

  const handleSaved = () => {
    setView('list');
    setSelectedRecord(null);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {view === 'list' && (
        <InspectionList onCreate={handleCreate} onDetail={handleDetail} onEdit={handleEdit} />
      )}
      {view === 'create' && (
        <InspectionForm onBack={handleBack} onSaved={handleSaved} />
      )}
      {view === 'edit' && selectedRecord && (
        <InspectionForm onBack={handleBack} onSaved={handleSaved} editRecord={selectedRecord} />
      )}
      {view === 'detail' && selectedRecord && (
        <InspectionDetail record={selectedRecord} onBack={handleBack} onEdit={handleEdit} />
      )}
    </div>
  );
}