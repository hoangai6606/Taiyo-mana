-- Migration to create missing tables for inspection records and debit notes
-- Note: Database uses text type for all IDs, not uuid

-- Create inspection_records table
CREATE TABLE IF NOT EXISTS inspection_records (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  customer_id text,
  customer_name text,
  factory_ids text NOT NULL DEFAULT '[]',
  inspection_date timestamp with time zone NOT NULL,
  workspace_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text
);

-- Create inspection_items table
CREATE TABLE IF NOT EXISTS inspection_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
  inspection_date timestamp with time zone,
  inspection_content text,
  product_code text,
  brand text,
  product_name text,
  color text,
  size text,
  inspected_quantity integer,
  passed_quantity integer,
  defective_quantity integer,
  specifications integer,
  accessories integer,
  appearance integer,
  fabric integer,
  dirty integer,
  seam_defect integer,
  other integer,
  metal_check integer
);

-- Create daily_reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
  specifications integer,
  accessories integer,
  appearance integer,
  fabric integer,
  dirty integer,
  seam_defect integer,
  other integer,
  metal_check integer
);

-- Create productivity_tracking table
CREATE TABLE IF NOT EXISTS productivity_tracking (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text NOT NULL REFERENCES inspection_records(id) ON DELETE CASCADE,
  record_date date NOT NULL,
  factory_id text,
  qc_quantity integer,
  transit_quantity integer,
  ot integer
);

-- Create debit_notes table
CREATE TABLE IF NOT EXISTS debit_notes (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_no text NOT NULL UNIQUE,
  customer_id text,
  customer_name text,
  inspection_record_id text,
  unit_price_goods integer DEFAULT 0,
  unit_price_qc integer DEFAULT 0,
  notes text,
  workspace_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text
);

-- Create debit_note_items table
CREATE TABLE IF NOT EXISTS debit_note_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_id text NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
  product_code text,
  size text,
  quantity integer DEFAULT 0,
  unit_price integer DEFAULT 0,
  line_total integer DEFAULT 0,
  item_type text NOT NULL DEFAULT 'goods'
);

-- Create factory_prices table
CREATE TABLE IF NOT EXISTS factory_prices (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id text NOT NULL REFERENCES factories(id),
  unit_price numeric(12, 4) NOT NULL DEFAULT '0',
  currency text NOT NULL DEFAULT 'USD',
  effective_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text
);

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manager_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create product_styles table
CREATE TABLE IF NOT EXISTS product_styles (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  style_code text NOT NULL,
  name text NOT NULL,
  customer_id text NOT NULL,
  factory_id text NOT NULL,
  product_type_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  workspace_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text
);

-- Create user_factory_permissions table
CREATE TABLE IF NOT EXISTS user_factory_permissions (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  factory_id text NOT NULL,
  access_level text NOT NULL DEFAULT 'read_only',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text
);