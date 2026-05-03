ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS travel_days numeric DEFAULT 0;
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS travel_unit_price numeric DEFAULT 0;
ALTER TABLE debit_notes ADD COLUMN IF NOT EXISTS vehicle_count numeric DEFAULT 0;
