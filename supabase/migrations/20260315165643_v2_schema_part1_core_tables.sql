/*
  # V2 Schema Part 1 — Core Master Data Tables (no cross-table RLS yet)

  Creates all new tables with basic RLS. Cross-table factory-isolation policies
  are added in part 2 after all tables exist.
*/

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Update profiles role constraint to include all 4 roles
-- ============================================================
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('staff','leader','manager','accounting_admin'));

-- ============================================================
-- customers (drop old policies first)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Managers can insert customers" ON customers;
DROP POLICY IF EXISTS "Managers can update customers" ON customers;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'JPY',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='updated_at') THEN
    ALTER TABLE customers ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "customers_select" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "customers_update" ON customers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));

-- ============================================================
-- factories (drop old policies first)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view factories" ON factories;
DROP POLICY IF EXISTS "Managers can insert factories" ON factories;
DROP POLICY IF EXISTS "Managers can update factories" ON factories;

ALTER TABLE factories
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'VN',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factories' AND column_name='updated_at') THEN
    ALTER TABLE factories ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS factories_updated_at ON factories;
CREATE TRIGGER factories_updated_at BEFORE UPDATE ON factories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE POLICY "factories_select" ON factories FOR SELECT TO authenticated USING (true);
CREATE POLICY "factories_insert" ON factories FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "factories_update" ON factories FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));

-- ============================================================
-- product_styles (new table)
-- ============================================================
CREATE TABLE IF NOT EXISTS product_styles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES customers(id),
  style_code       text NOT NULL,
  name             text NOT NULL DEFAULT '',
  product_type     text NOT NULL DEFAULT 'SHOES' CHECK (product_type IN ('SHOES','APPAREL','OTHER')),
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id),
  UNIQUE(customer_id, style_code)
);
DROP TRIGGER IF EXISTS product_styles_updated_at ON product_styles;
CREATE TRIGGER product_styles_updated_at BEFORE UPDATE ON product_styles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE product_styles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_styles_select" ON product_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "product_styles_insert" ON product_styles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "product_styles_update" ON product_styles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','leader','staff')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','leader','staff')));

-- ============================================================
-- defect_catalogs
-- ============================================================
CREATE TABLE IF NOT EXISTS defect_catalogs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  name         text NOT NULL,
  product_type text NOT NULL DEFAULT 'ANY' CHECK (product_type IN ('SHOES','APPAREL','ANY')),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE defect_catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "defect_catalogs_select" ON defect_catalogs FOR SELECT TO authenticated USING (true);
CREATE POLICY "defect_catalogs_insert" ON defect_catalogs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "defect_catalogs_update" ON defect_catalogs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ============================================================
-- defect_catalog_items
-- ============================================================
CREATE TABLE IF NOT EXISTS defect_catalog_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_id  uuid NOT NULL REFERENCES defect_catalogs(id),
  code        text NOT NULL,
  name_vn     text NOT NULL,
  name_jp     text NOT NULL DEFAULT '',
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(catalog_id, code)
);
ALTER TABLE defect_catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "defect_catalog_items_select" ON defect_catalog_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "defect_catalog_items_insert" ON defect_catalog_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "defect_catalog_items_update" ON defect_catalog_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ============================================================
-- report_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS report_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text UNIQUE NOT NULL,
  name                text NOT NULL,
  customer_id         uuid REFERENCES customers(id),
  defect_catalog_id   uuid REFERENCES defect_catalogs(id),
  has_reinspection    boolean NOT NULL DEFAULT false,
  has_shipment_qty    boolean NOT NULL DEFAULT true,
  export_template_key text NOT NULL DEFAULT '',
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "report_templates_select" ON report_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "report_templates_insert" ON report_templates FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "report_templates_update" ON report_templates FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ============================================================
-- user_factory_permissions (MUST exist before cross-table RLS)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_factory_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  factory_id  uuid NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  can_view    boolean NOT NULL DEFAULT true,
  can_edit    boolean NOT NULL DEFAULT false,
  granted_by  uuid REFERENCES profiles(id),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, factory_id)
);
ALTER TABLE user_factory_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ufp_select" ON user_factory_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "ufp_insert" ON user_factory_permissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "ufp_update" ON user_factory_permissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));
CREATE POLICY "ufp_delete" ON user_factory_permissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager'));

-- ============================================================
-- order_lots (new table — replaces orders)
-- ============================================================
CREATE TABLE IF NOT EXISTS order_lots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_style_id uuid NOT NULL REFERENCES product_styles(id),
  factory_id       uuid NOT NULL REFERENCES factories(id),
  lot_code         text NOT NULL DEFAULT '',
  contract_no      text NOT NULL DEFAULT '',
  debit_group      text NOT NULL DEFAULT '',
  order_qty        integer NOT NULL DEFAULT 0 CHECK (order_qty >= 0),
  unit             text NOT NULL DEFAULT 'pairs',
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  delivery_date    date,
  notes            text NOT NULL DEFAULT '',
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id)
);
DROP TRIGGER IF EXISTS order_lots_updated_at ON order_lots;
CREATE TRIGGER order_lots_updated_at BEFORE UPDATE ON order_lots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE order_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_lots_select" ON order_lots FOR SELECT TO authenticated USING (true);
CREATE POLICY "order_lots_insert" ON order_lots FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));
CREATE POLICY "order_lots_update" ON order_lots FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- price_rules
-- ============================================================
CREATE TABLE IF NOT EXISTS price_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES customers(id),
  factory_id       uuid REFERENCES factories(id),
  product_style_id uuid REFERENCES product_styles(id),
  order_lot_id     uuid REFERENCES order_lots(id),
  rule_type        text NOT NULL DEFAULT 'first_inspection'
    CHECK (rule_type IN ('first_inspection','reinspection')),
  unit_price       numeric(12,4) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  currency         text NOT NULL DEFAULT 'JPY',
  effective_from   date NOT NULL DEFAULT CURRENT_DATE,
  effective_to     date,
  notes            text NOT NULL DEFAULT '',
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES auth.users(id)
);
ALTER TABLE price_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_rules_select" ON price_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "price_rules_insert" ON price_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
CREATE POLICY "price_rules_update" ON price_rules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('manager','accounting_admin')));
