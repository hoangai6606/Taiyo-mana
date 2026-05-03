CREATE TABLE IF NOT EXISTS report_productivity (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  factory_id TEXT,
  factory_name VARCHAR(255),
  qc_quantity INTEGER,
  transit_quantity INTEGER,
  ot INTEGER
);
CREATE INDEX IF NOT EXISTS idx_report_productivity_report_id ON report_productivity(report_id);
