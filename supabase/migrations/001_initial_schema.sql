-- EcoMatch Health AI — Production PostgreSQL Schema with Organisation-Level Row-Level Security (RLS)
-- Target: Supabase PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  tier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN (
      'founder_admin',
      'facility_manager',
      'inventory_manager',
      'procurement_officer',
      'sustainability_analyst',
      'read_only_reviewer'
    )
  ),
  org_id TEXT REFERENCES organisations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facilities (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organisations(id),
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  bed_count INTEGER NOT NULL CHECK (bed_count > 0),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  storage_capabilities TEXT[] NOT NULL,
  lead_time_weeks INTEGER NOT NULL DEFAULT 2,
  avg_monthly_budget_usd NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit_label TEXT NOT NULL,
  unit_cost_usd NUMERIC(10, 2) NOT NULL CHECK (unit_cost_usd > 0),
  unit_weight_kg NUMERIC(8, 3) NOT NULL CHECK (unit_weight_kg > 0),
  storage_condition TEXT NOT NULL,
  shelf_life_months INTEGER NOT NULL,
  regulated_medicine BOOLEAN NOT NULL DEFAULT FALSE,
  emission_factor_kg_co2_per_kg NUMERIC(6, 3) NOT NULL,
  patient_episodes_per_unit INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_batches (
  batch_id TEXT PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES facilities(id),
  sku TEXT NOT NULL REFERENCES products(sku),
  quantity_on_hand INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
  unit_cost_usd NUMERIC(10, 2) NOT NULL CHECK (unit_cost_usd > 0),
  received_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('sealed_nominal', 'recalled', 'damaged', 'restricted')),
  storage_location TEXT NOT NULL,
  data_tag TEXT NOT NULL DEFAULT 'User Entry',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_transfers (
  transfer_id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL,
  donor_facility_id TEXT NOT NULL REFERENCES facilities(id),
  recipient_facility_id TEXT NOT NULL REFERENCES facilities(id),
  batch_id TEXT NOT NULL REFERENCES inventory_batches(batch_id),
  sku TEXT NOT NULL REFERENCES products(sku),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  match_score INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK (status IN ('Pending Approval', 'Approved', 'In Transit', 'Completed', 'Rejected')),
  requested_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  net_savings_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  waste_diverted_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  avoided_co2e_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT human_approval_required CHECK (status = 'Pending Approval' OR status = 'Rejected' OR approved_by IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  outcome TEXT NOT NULL,
  details TEXT NOT NULL
);

-- Enable Row-Level Security (RLS) for multi-tenant organisation isolation
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example RLS policy: operators can read/write batches strictly inside their assigned organisation (or founder_admin across all)
CREATE POLICY org_batch_isolation ON inventory_batches
  USING (
    EXISTS (
      SELECT 1 FROM facilities f
      JOIN user_profiles u ON (u.org_id = f.org_id OR u.role = 'founder_admin')
      WHERE f.id = inventory_batches.facility_id
        AND u.id = auth.uid()
    )
  );
