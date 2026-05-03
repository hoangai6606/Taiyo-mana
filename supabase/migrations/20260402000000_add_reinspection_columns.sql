-- Add reinspection columns to inspection_items table
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_quantity integer;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_passed integer;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_failed integer;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_specifications text;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_accessories text;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_appearance text;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS print_defect integer DEFAULT 0;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS sole_defect integer DEFAULT 0;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS scratch_defect integer DEFAULT 0;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_print_defect integer DEFAULT 0;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_sole_defect integer DEFAULT 0;
ALTER TABLE inspection_items ADD COLUMN IF NOT EXISTS reinspect_scratch_defect integer DEFAULT 0;
