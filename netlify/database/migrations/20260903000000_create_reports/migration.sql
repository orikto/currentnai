CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  division TEXT NOT NULL,
  report_date DATE NOT NULL,
  hours NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(report_date);
CREATE INDEX IF NOT EXISTS idx_reports_division ON reports(division);
