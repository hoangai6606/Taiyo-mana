/*
  # V3d — Fix import_jobs columns to match UI expectations

  ## Changes
  - Add `original_filename` column (UI writes this, DB had `file_name`)
  - Add `import_type` column (UI writes this; distinguishes quantity_log, inspection_session, etc.)
  - Add `committed_rows` column (UI reads this)
  - Add `error_summary` column (UI reads this)
  - Add `template_detected` column
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_jobs' AND column_name='original_filename') THEN
    ALTER TABLE import_jobs ADD COLUMN original_filename text;
    UPDATE import_jobs SET original_filename = file_name WHERE original_filename IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_jobs' AND column_name='import_type') THEN
    ALTER TABLE import_jobs ADD COLUMN import_type text NOT NULL DEFAULT 'quantity_log';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_jobs' AND column_name='committed_rows') THEN
    ALTER TABLE import_jobs ADD COLUMN committed_rows integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_jobs' AND column_name='error_summary') THEN
    ALTER TABLE import_jobs ADD COLUMN error_summary text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='import_jobs' AND column_name='template_detected') THEN
    ALTER TABLE import_jobs ADD COLUMN template_detected text;
  END IF;
END $$;
