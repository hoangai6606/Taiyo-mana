/*
  # V3c — Add product_types table and FK relationships

  ## Changes
  1. Create product_types table (missing from V2 schema but referenced by tabs)
  2. Add FK from product_styles.product_type_id -> product_types.id
  3. Add FK from defect_catalogs.product_type_id -> product_types.id
  4. Add FK from price_rules.product_type_id -> product_types.id
  5. Seed default product types

  ## Security
  - RLS enabled on product_types
*/

CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_jp text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_types' AND policyname = 'Authenticated users can read product types') THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read product types" ON product_types FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_types' AND policyname = 'Managers can manage product types') THEN
    EXECUTE 'CREATE POLICY "Managers can manage product types" ON product_types FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = auth.uid()) = ''manager'') WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = ''manager'')';
  END IF;
END $$;

INSERT INTO product_types (code, name, name_jp) VALUES
  ('SHOES', 'Giày dép', '靴'),
  ('APPAREL', 'Quần áo', '衣類'),
  ('OTHER', 'Khác', 'その他')
ON CONFLICT (code) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'product_styles' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'product_type_id'
  ) THEN
    ALTER TABLE product_styles ADD CONSTRAINT product_styles_product_type_id_fkey
      FOREIGN KEY (product_type_id) REFERENCES product_types(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'defect_catalogs' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'product_type_id'
  ) THEN
    ALTER TABLE defect_catalogs ADD CONSTRAINT defect_catalogs_product_type_id_fkey
      FOREIGN KEY (product_type_id) REFERENCES product_types(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'price_rules' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'product_type_id'
  ) THEN
    ALTER TABLE price_rules ADD CONSTRAINT price_rules_product_type_id_fkey
      FOREIGN KEY (product_type_id) REFERENCES product_types(id);
  END IF;
END $$;
