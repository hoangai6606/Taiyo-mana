-- Create factory_prices table
CREATE TABLE factory_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID NOT NULL REFERENCES factories(id),
  unit_price NUMERIC(12, 4) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID
);

-- Create unique constraint on factory_id + effective_date
CREATE UNIQUE INDEX idx_factory_prices_factory_date ON factory_prices(factory_id, effective_date);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON factory_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON factory_prices TO authenticated;

-- Add index for faster lookups
CREATE INDEX idx_factory_prices_factory_id ON factory_prices(factory_id);
CREATE INDEX idx_factory_prices_effective_date ON factory_prices(effective_date);
