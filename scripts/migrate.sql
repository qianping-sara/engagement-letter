-- EL Application Database Schema
-- Engagement Letter Automation Platform

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  client_code VARCHAR(20) UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_group TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- Status: pending | updated | edited | generated | sent | no_sa
  
  -- Contact Info
  contact_name TEXT,
  salutation TEXT,
  client_email TEXT,
  postal_address_1 TEXT,
  suburb TEXT,
  state VARCHAR(50),
  postcode VARCHAR(20),
  country TEXT,
  
  -- Letter Info
  letter_date DATE DEFAULT CURRENT_DATE,
  
  -- Staff
  opc_director TEXT,
  opc_director_2 TEXT,
  opc_manager TEXT,
  opc_crm TEXT,
  lpa_director TEXT,
  lpa_manager TEXT,
  
  -- Oxygen Fees (in cents to avoid float issues)
  tax_and_compliance_fee INTEGER DEFAULT 0,
  asic_fee INTEGER DEFAULT 0,
  quarterly_activity_fee INTEGER DEFAULT 0,
  bookkeeping_fee INTEGER DEFAULT 0,
  foundation_annual_comp_fee INTEGER DEFAULT 0,
  fbt_fee INTEGER DEFAULT 0,
  family_office_fee INTEGER DEFAULT 0,
  annual_tax_planning_fee INTEGER DEFAULT 0,
  adhoc_advice_fee INTEGER DEFAULT 0,
  financial_reports_fee INTEGER DEFAULT 0,
  
  -- Lumiere / SMSF Fees
  smsf_tax_compliance_fee INTEGER DEFAULT 0,
  smsf_asic_fee INTEGER DEFAULT 0,
  smsf_bas_fee INTEGER DEFAULT 0,
  
  -- Computed totals (stored for reference, computed live on frontend)
  total_oxygen_fee INTEGER DEFAULT 0,
  total_lumiere_fee INTEGER DEFAULT 0,
  total_fees INTEGER DEFAULT 0,
  
  -- Raw Excel/CSV status (do not mix with workflow status)
  excel_status TEXT,
  total_2026_compliance_including_asic INTEGER DEFAULT 0,
  check_fees_split TEXT,
  corporate_secretarial_services INTEGER DEFAULT 0,
  corporate_secretarial_services_smsf INTEGER DEFAULT 0,
  asic_2025_smsf_trustee INTEGER DEFAULT 0,
  asic_2025_non_smsf_trustee INTEGER DEFAULT 0,
  total_opc_lpa_fees_2026 INTEGER DEFAULT 0,
  
  -- Manual overrides (JSON map of field -> overridden value)
  user_overrides JSONB DEFAULT '{}',
  locked_fields TEXT[] DEFAULT '{}',
  
  -- Meta
  paper_copy BOOLEAN DEFAULT false,
  date_sent DATE,
  signed_sa_received BOOLEAN DEFAULT false,
  comments TEXT,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_entities (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  entity_type VARCHAR(30) NOT NULL, -- individual | trust | company | foundation | smsf | partnership
  entity_name TEXT NOT NULL,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sync_history (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL,
  rows_processed INTEGER DEFAULT 0,
  rows_added INTEGER DEFAULT 0,
  rows_updated INTEGER DEFAULT 0,
  rows_skipped INTEGER DEFAULT 0,
  conflicts JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_log (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  snapshot JSONB NOT NULL,
  filename TEXT,
  is_stale BOOLEAN DEFAULT false
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);
CREATE INDEX IF NOT EXISTS idx_client_entities_client_id ON client_entities(client_id);
CREATE INDEX IF NOT EXISTS idx_generation_log_client_id ON generation_log(client_id);

-- Ensure address fields have sufficient length on existing databases
ALTER TABLE IF EXISTS clients
  ALTER COLUMN state TYPE VARCHAR(50),
  ALTER COLUMN postcode TYPE VARCHAR(20);
