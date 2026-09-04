ALTER TABLE reports ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS thana_upazila TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS village_area TEXT;

CREATE TABLE IF NOT EXISTS bill_reports (
  id SERIAL PRIMARY KEY,
  division TEXT NOT NULL,
  district TEXT,
  supplier_company TEXT,
  previous_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL,
  percent_change NUMERIC NOT NULL,
  previous_photo_key TEXT,
  current_photo_key TEXT,
  reporter_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bill_reports_division ON bill_reports(division);
