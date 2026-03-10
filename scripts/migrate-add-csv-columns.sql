-- Add all columns from 2026 Master Control Sheet CSV that are not yet in clients table.
-- Safe to run multiple times (use DO block for Postgres < 9.6 that lack IF NOT EXISTS for ADD COLUMN).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'excel_status') THEN
    ALTER TABLE clients ADD COLUMN excel_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'total_2026_compliance_including_asic') THEN
    ALTER TABLE clients ADD COLUMN total_2026_compliance_including_asic INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'check_fees_split') THEN
    ALTER TABLE clients ADD COLUMN check_fees_split TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'corporate_secretarial_services') THEN
    ALTER TABLE clients ADD COLUMN corporate_secretarial_services INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'corporate_secretarial_services_smsf') THEN
    ALTER TABLE clients ADD COLUMN corporate_secretarial_services_smsf INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'asic_2025_smsf_trustee') THEN
    ALTER TABLE clients ADD COLUMN asic_2025_smsf_trustee INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'asic_2025_non_smsf_trustee') THEN
    ALTER TABLE clients ADD COLUMN asic_2025_non_smsf_trustee INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'total_opc_lpa_fees_2026') THEN
    ALTER TABLE clients ADD COLUMN total_opc_lpa_fees_2026 INTEGER DEFAULT 0;
  END IF;
END $$;
