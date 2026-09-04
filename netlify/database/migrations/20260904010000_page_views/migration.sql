CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_page_views_date ON page_views(visit_date);
