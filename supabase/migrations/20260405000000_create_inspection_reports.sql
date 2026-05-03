-- Inspection Reports: snapshot-based reports derived from inspection records
CREATE TABLE IF NOT EXISTS inspection_reports (
  id TEXT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  source_record_id TEXT,
  customer_name VARCHAR(255),
  factory_names TEXT,
  inspection_date TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  workspace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS report_items (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  inspection_date TIMESTAMPTZ,
  inspection_content VARCHAR(500),
  product_code VARCHAR(100),
  brand VARCHAR(100),
  product_name VARCHAR(255),
  color VARCHAR(100),
  size VARCHAR(50),
  inspected_quantity INTEGER,
  passed_quantity INTEGER,
  defective_quantity INTEGER,
  specifications INTEGER,
  accessories INTEGER,
  appearance INTEGER,
  fabric INTEGER,
  dirty INTEGER,
  seam_defect INTEGER,
  other INTEGER,
  print_defect INTEGER,
  sole_defect INTEGER,
  scratch_defect INTEGER,
  metal_check INTEGER,
  reinspect_quantity INTEGER,
  reinspect_passed INTEGER,
  reinspect_failed INTEGER,
  reinspect_specifications TEXT,
  reinspect_accessories TEXT,
  reinspect_appearance TEXT,
  reinspect_print_defect INTEGER DEFAULT 0,
  reinspect_sole_defect INTEGER DEFAULT 0,
  reinspect_scratch_defect INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_report_items_report_id ON report_items(report_id);
