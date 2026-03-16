/*
  # Create Core Tables for TAIYO NISSHIN Production Management System

  ## Summary
  This migration creates the foundational tables for managing production and quality inspection data.

  ## New Tables

  ### 1. profiles
  - User profile extending Supabase auth.users
  - Stores name (Japanese + Vietnamese), role, and factory assignment

  ### 2. customers
  - Customer records (e.g., FITFIT, Gardner)

  ### 3. factories
  - Factory records (e.g., T&K, TAN PHUOC AN)

  ### 4. product_types
  - Product category: SHOES or APPAREL (determines defect type list)

  ### 5. products
  - Individual product/style records linked to customer, factory, product type

  ### 6. orders
  - Orders per product with quantity, DEBIT group, price JPY, status

  ### 7. production_logs
  - Daily production entries (order_id, date, quantity produced)

  ### 8. defect_types
  - Master list of defect categories, linked to product_type

  ### 9. inspection_reports
  - Header-level inspection report (product, date, inspector, supervisor)

  ### 10. inspection_line_items
  - Per color/size inspection row (checked qty, passed qty, defect qty, exported qty)

  ### 11. defect_records
  - Individual defect type counts per inspection line item

  ## Security
  - RLS enabled on ALL tables
  - Authenticated users can read most data
  - Write access controlled by role
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name_jp text NOT NULL DEFAULT '',
  name_vn text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'supervisor', 'manager')),
  factory_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_jp text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor'))
  );

CREATE POLICY "Managers can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- Factories table
CREATE TABLE IF NOT EXISTS factories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_jp text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE factories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view factories"
  ON factories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert factories"
  ON factories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager', 'supervisor'))
  );

CREATE POLICY "Managers can update factories"
  ON factories FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- Update profiles foreign key after factories table exists
ALTER TABLE profiles ADD CONSTRAINT profiles_factory_id_fkey
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE SET NULL
  NOT VALID;

-- Product types enum-like table
CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_jp text NOT NULL DEFAULT ''
);

ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view product types"
  ON product_types FOR SELECT
  TO authenticated
  USING (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_code text NOT NULL,
  name text NOT NULL DEFAULT '',
  customer_id uuid NOT NULL REFERENCES customers(id),
  factory_id uuid NOT NULL REFERENCES factories(id),
  product_type_id uuid NOT NULL REFERENCES product_types(id),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(style_code, customer_id)
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff and above can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('staff', 'supervisor', 'manager'))
  );

CREATE POLICY "Staff and above can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  debit_group text NOT NULL DEFAULT '',
  order_qty integer NOT NULL DEFAULT 0,
  price_jpy numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  delivery_date date,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff and above can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff and above can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Production logs table
CREATE TABLE IF NOT EXISTS production_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  log_date date NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  notes text DEFAULT '',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(order_id, log_date)
);

ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view production logs"
  ON production_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert production logs"
  ON production_logs FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can update own production logs"
  ON production_logs FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Defect types master table
CREATE TABLE IF NOT EXISTS defect_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_type_id uuid NOT NULL REFERENCES product_types(id),
  code text NOT NULL,
  name_vn text NOT NULL,
  name_jp text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(product_type_id, code)
);

ALTER TABLE defect_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view defect types"
  ON defect_types FOR SELECT
  TO authenticated
  USING (true);

-- Inspection reports table (header)
CREATE TABLE IF NOT EXISTS inspection_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  order_id uuid REFERENCES orders(id),
  inspection_date date NOT NULL,
  inspector_id uuid REFERENCES profiles(id),
  supervisor_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inspection reports"
  ON inspection_reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert inspection reports"
  ON inspection_reports FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can update inspection reports"
  ON inspection_reports FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Inspection line items (per color/size row)
CREATE TABLE IF NOT EXISTS inspection_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES inspection_reports(id) ON DELETE CASCADE,
  color text NOT NULL DEFAULT '',
  size_label text NOT NULL DEFAULT '',
  checked_qty integer NOT NULL DEFAULT 0 CHECK (checked_qty >= 0),
  passed_qty integer NOT NULL DEFAULT 0 CHECK (passed_qty >= 0),
  defect_qty integer NOT NULL DEFAULT 0 CHECK (defect_qty >= 0),
  exported_qty integer NOT NULL DEFAULT 0 CHECK (exported_qty >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE inspection_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inspection line items"
  ON inspection_line_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert inspection line items"
  ON inspection_line_items FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can update inspection line items"
  ON inspection_line_items FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can delete inspection line items"
  ON inspection_line_items FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Defect records (counts per defect type per line item)
CREATE TABLE IF NOT EXISTS defect_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line_item_id uuid NOT NULL REFERENCES inspection_line_items(id) ON DELETE CASCADE,
  defect_type_id uuid NOT NULL REFERENCES defect_types(id),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(line_item_id, defect_type_id)
);

ALTER TABLE defect_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view defect records"
  ON defect_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert defect records"
  ON defect_records FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can update defect records"
  ON defect_records FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can delete defect records"
  ON defect_records FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_customer ON products(customer_id);
CREATE INDEX IF NOT EXISTS idx_products_factory ON products(factory_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_debit_group ON orders(debit_group);
CREATE INDEX IF NOT EXISTS idx_production_logs_order ON production_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_date ON production_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_product ON inspection_reports(product_id);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_date ON inspection_reports(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspection_line_items_report ON inspection_line_items(report_id);
CREATE INDEX IF NOT EXISTS idx_defect_records_line_item ON defect_records(line_item_id);
CREATE INDEX IF NOT EXISTS idx_defect_types_product_type ON defect_types(product_type_id);
