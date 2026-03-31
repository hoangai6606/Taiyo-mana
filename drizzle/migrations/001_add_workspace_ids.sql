-- Create workspaces table if not exists
CREATE TABLE IF NOT EXISTS workspaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    name varchar(255) NOT NULL,
    manager_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create default workspace for existing data
INSERT INTO workspaces (id, name, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Workspace', now(), now())
ON CONFLICT DO NOTHING;

-- Add workspace_id column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE profiles ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE profiles SET workspace_id = '00000000-0000-0000-0000-000000000000' WHERE workspace_id IS NULL;
ALTER TABLE profiles ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Add workspace_id column to inspection_records
ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE inspection_records ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE inspection_records SET workspace_id = '00000000-0000-0000-0000-000000000000' WHERE workspace_id IS NULL;
ALTER TABLE inspection_records ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE inspection_records ADD CONSTRAINT inspection_records_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Add workspace_id column to debit_notes
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE debit_notes ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE debit_notes SET workspace_id = '00000000-0000-0000-0000-000000000000' WHERE workspace_id IS NULL;
ALTER TABLE debit_notes ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE debit_notes ADD CONSTRAINT debit_notes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Add workspace_id column to customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE customers ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE customers SET workspace_id = '00000000-0000-0000-0000-000000000000' WHERE workspace_id IS NULL;
ALTER TABLE customers ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE customers ADD CONSTRAINT customers_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Add workspace_id column to factories
ALTER TABLE factories ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE factories ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE factories SET workspace_id = '00000000-0000-0000-0000-000000000000' WHERE workspace_id IS NULL;
ALTER TABLE factories ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE factories ADD CONSTRAINT factories_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Add workspace_id column to product_types
ALTER TABLE product_types ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE product_types ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE product_types SET workspace_id = '00000000-0000-0000-0000-000000000000' WHERE workspace_id IS NULL;
ALTER TABLE product_types ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE product_types ADD CONSTRAINT product_types_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Add workspace_id column to product_styles
ALTER TABLE product_styles ADD COLUMN IF NOT EXISTS workspace_id uuid;
ALTER TABLE product_styles ALTER COLUMN workspace_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
UPDATE product_styles SET workspace_id = '00000000-0000-0000-0000-000000000000' WHERE workspace_id IS NULL;
ALTER TABLE product_styles ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE product_styles ADD CONSTRAINT product_styles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Create index for faster workspace lookups
CREATE INDEX IF NOT EXISTS idx_profiles_workspace_id ON profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_workspace_id ON inspection_records(workspace_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_workspace_id ON debit_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_customers_workspace_id ON customers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_factories_workspace_id ON factories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_types_workspace_id ON product_types(workspace_id);
CREATE INDEX IF NOT EXISTS idx_product_styles_workspace_id ON product_styles(workspace_id);