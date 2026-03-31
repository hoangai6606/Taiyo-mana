-- Add travel_allowance column to debit_notes table
ALTER TABLE debit_notes ADD COLUMN travel_allowance numeric DEFAULT 0;