-- Performance indexes for multi-tenant filtering
CREATE INDEX IF NOT EXISTS idx_inspection_records_workspace_id ON inspection_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_record_id ON inspection_items(record_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_record_id ON daily_reports(record_id);
CREATE INDEX IF NOT EXISTS idx_productivity_tracking_record_id ON productivity_tracking(record_id);

CREATE INDEX IF NOT EXISTS idx_inspection_reports_workspace_id ON inspection_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_report_items_report_id ON report_items(report_id);
CREATE INDEX IF NOT EXISTS idx_report_productivity_report_id ON report_productivity(report_id);

CREATE INDEX IF NOT EXISTS idx_debit_notes_workspace_id ON debit_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_debit_note_items_debit_note_id ON debit_note_items(debit_note_id);

CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_factories_workspace_id ON factories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_styles_workspace_id ON product_styles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON profiles(workspace_id);

-- Index for date-based filtering
CREATE INDEX IF NOT EXISTS idx_inspection_records_inspection_date ON inspection_records(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspection_records_created_at ON inspection_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debit_notes_created_at ON debit_notes(created_at DESC);

-- Index for code search
CREATE INDEX IF NOT EXISTS idx_inspection_records_code ON inspection_records(code);
CREATE INDEX IF NOT EXISTS idx_debit_notes_debit_no ON debit_notes(debit_no);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_code ON inspection_reports(code);

-- Composite indexes for most common queries
CREATE INDEX IF NOT EXISTS idx_inspection_records_ws_created ON inspection_records(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debit_notes_ws_created ON debit_notes(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_ws_created ON inspection_reports(workspace_id, created_at DESC);
