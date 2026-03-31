-- Migration to add missing workspace_id column to inspection_records table
-- The inspection_records table was created by a prior migration but missing the workspace_id column
-- This fixes the error: column "workspace_id" of relation "inspection_records" does not exist

ALTER TABLE inspection_records ADD COLUMN IF NOT EXISTS workspace_id text;