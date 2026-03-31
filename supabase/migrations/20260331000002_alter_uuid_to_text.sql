-- Migration: Convert all uuid columns to text to match Drizzle schema
-- This is needed because the Drizzle schema uses text() for all ID columns,
-- but the actual database was created with uuid types by the original Drizzle migration.

-- ============================================================
-- Step 1: Drop all foreign key constraints
-- ============================================================

ALTER TABLE daily_reports DROP CONSTRAINT IF EXISTS daily_reports_record_id_inspection_records_id_fk;
ALTER TABLE inspection_items DROP CONSTRAINT IF EXISTS inspection_items_record_id_inspection_records_id_fk;
ALTER TABLE productivity_tracking DROP CONSTRAINT IF EXISTS productivity_tracking_record_id_inspection_records_id_fk;
ALTER TABLE debit_note_items DROP CONSTRAINT IF EXISTS debit_note_items_debit_note_id_debit_notes_id_fk;
ALTER TABLE factory_prices DROP CONSTRAINT IF EXISTS factory_prices_factory_id_factories_id_fk;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_workspace_id_fkey;
ALTER TABLE inspection_records DROP CONSTRAINT IF EXISTS inspection_records_workspace_id_fkey;
ALTER TABLE debit_notes DROP CONSTRAINT IF EXISTS debit_notes_workspace_id_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_workspace_id_fkey;
ALTER TABLE factories DROP CONSTRAINT IF EXISTS factories_workspace_id_fkey;
ALTER TABLE product_types DROP CONSTRAINT IF EXISTS product_types_workspace_id_fkey;
ALTER TABLE product_styles DROP CONSTRAINT IF EXISTS product_styles_workspace_id_fkey;

-- ============================================================
-- Step 2: Alter inspection_records columns
-- ============================================================

ALTER TABLE inspection_records ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE inspection_records ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE inspection_records ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE inspection_records ALTER COLUMN workspace_id TYPE text USING workspace_id::text;
ALTER TABLE inspection_records ALTER COLUMN created_by TYPE text USING created_by::text;

-- ============================================================
-- Step 3: Alter child tables of inspection_records
-- ============================================================

ALTER TABLE inspection_items ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE inspection_items ALTER COLUMN record_id TYPE text USING record_id::text;

ALTER TABLE daily_reports ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE daily_reports ALTER COLUMN record_id TYPE text USING record_id::text;

ALTER TABLE productivity_tracking ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE productivity_tracking ALTER COLUMN record_id TYPE text USING record_id::text;

-- ============================================================
-- Step 4: Alter profiles columns
-- ============================================================

ALTER TABLE profiles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE profiles ALTER COLUMN factory_id TYPE text USING factory_id::text;
ALTER TABLE profiles ALTER COLUMN workspace_id TYPE text USING workspace_id::text;

-- ============================================================
-- Step 5: Alter customers columns
-- ============================================================

ALTER TABLE customers ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE customers ALTER COLUMN workspace_id TYPE text USING workspace_id::text;
ALTER TABLE customers ALTER COLUMN created_by TYPE text USING created_by::text;

-- ============================================================
-- Step 6: Alter factories columns
-- ============================================================

ALTER TABLE factories ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE factories ALTER COLUMN workspace_id TYPE text USING workspace_id::text;
ALTER TABLE factories ALTER COLUMN created_by TYPE text USING created_by::text;

-- ============================================================
-- Step 7: Alter workspaces columns
-- ============================================================

ALTER TABLE workspaces ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE workspaces ALTER COLUMN manager_id TYPE text USING manager_id::text;

-- ============================================================
-- Step 8: Alter product_styles columns
-- ============================================================

ALTER TABLE product_styles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE product_styles ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE product_styles ALTER COLUMN factory_id TYPE text USING factory_id::text;
ALTER TABLE product_styles ALTER COLUMN product_type_id TYPE text USING product_type_id::text;
ALTER TABLE product_styles ALTER COLUMN workspace_id TYPE text USING workspace_id::text;
ALTER TABLE product_styles ALTER COLUMN created_by TYPE text USING created_by::text;

-- ============================================================
-- Step 9: Alter product_types columns
-- ============================================================

ALTER TABLE product_types ALTER COLUMN id TYPE text USING id::text;

-- ============================================================
-- Step 10: Alter user_factory_permissions columns
-- ============================================================

ALTER TABLE user_factory_permissions ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE user_factory_permissions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE user_factory_permissions ALTER COLUMN factory_id TYPE text USING factory_id::text;
ALTER TABLE user_factory_permissions ALTER COLUMN created_by TYPE text USING created_by::text;

-- ============================================================
-- Step 11: Alter factory_prices columns
-- ============================================================

ALTER TABLE factory_prices ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE factory_prices ALTER COLUMN factory_id TYPE text USING factory_id::text;
ALTER TABLE factory_prices ALTER COLUMN created_by TYPE text USING created_by::text;

-- ============================================================
-- Step 12: Alter debit_notes columns
-- ============================================================

ALTER TABLE debit_notes ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE debit_notes ALTER COLUMN customer_id TYPE text USING customer_id::text;
ALTER TABLE debit_notes ALTER COLUMN inspection_record_id TYPE text USING inspection_record_id::text;
ALTER TABLE debit_notes ALTER COLUMN workspace_id TYPE text USING workspace_id::text;
ALTER TABLE debit_notes ALTER COLUMN created_by TYPE text USING created_by::text;

-- ============================================================
-- Step 13: Alter debit_note_items columns
-- ============================================================

ALTER TABLE debit_note_items ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE debit_note_items ALTER COLUMN debit_note_id TYPE text USING debit_note_id::text;

-- ============================================================
-- Step 14: Re-add foreign key constraints
-- ============================================================

ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_record_id_inspection_records_id_fk
  FOREIGN KEY (record_id) REFERENCES inspection_records(id) ON DELETE CASCADE;
ALTER TABLE inspection_items ADD CONSTRAINT inspection_items_record_id_inspection_records_id_fk
  FOREIGN KEY (record_id) REFERENCES inspection_records(id) ON DELETE CASCADE;
ALTER TABLE productivity_tracking ADD CONSTRAINT productivity_tracking_record_id_inspection_records_id_fk
  FOREIGN KEY (record_id) REFERENCES inspection_records(id) ON DELETE CASCADE;
ALTER TABLE debit_note_items ADD CONSTRAINT debit_note_items_debit_note_id_debit_notes_id_fk
  FOREIGN KEY (debit_note_id) REFERENCES debit_notes(id) ON DELETE CASCADE;
ALTER TABLE factory_prices ADD CONSTRAINT factory_prices_factory_id_factories_id_fk
  FOREIGN KEY (factory_id) REFERENCES factories(id);
ALTER TABLE profiles ADD CONSTRAINT profiles_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE inspection_records ADD CONSTRAINT inspection_records_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE debit_notes ADD CONSTRAINT debit_notes_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE customers ADD CONSTRAINT customers_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE factories ADD CONSTRAINT factories_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE product_types ADD CONSTRAINT product_types_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
ALTER TABLE product_styles ADD CONSTRAINT product_styles_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
