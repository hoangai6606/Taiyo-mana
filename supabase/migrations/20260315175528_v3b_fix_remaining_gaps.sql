/*
  # V3b Schema Fix — Add approval_logs table and fix inspection_sessions status constraint

  ## Changes
  1. Create approval_logs table (referenced in approval.ts but missing)
  2. Update inspection_sessions status CHECK to include 'rejected'
  3. Add 'active' column to profiles (for UserPermissionsTab filter)
*/

-- ─── approval_logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  performed_by uuid REFERENCES profiles(id),
  reason text,
  notes text
);

ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'approval_logs' AND policyname = 'Authenticated users can read approval logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read approval logs" ON approval_logs FOR SELECT TO authenticated USING (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'approval_logs' AND policyname = 'Authenticated users can insert approval logs'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can insert approval logs" ON approval_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = performed_by)';
  END IF;
END $$;

-- ─── profiles: add active column ─────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='active') THEN
    ALTER TABLE profiles ADD COLUMN active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ─── inspection_sessions: update status CHECK to include 'rejected' ───────────

ALTER TABLE inspection_sessions DROP CONSTRAINT IF EXISTS inspection_sessions_status_check;
ALTER TABLE inspection_sessions ADD CONSTRAINT inspection_sessions_status_check
  CHECK (status IN ('draft','submitted','approved','locked','imported_locked','rejected'));
