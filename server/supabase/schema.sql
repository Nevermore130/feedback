-- ============================================
-- Supabase Schema for Feedback System
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  date TIMESTAMPTZ NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 3,
  category TEXT NOT NULL DEFAULT 'Unclassified',
  sentiment TEXT NOT NULL DEFAULT 'Pending',
  tags TEXT[] DEFAULT '{}',
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'New',
  assigned_to TEXT,
  type TEXT,
  image_url TEXT,
  moments_text TEXT,
  user_type TEXT,
  content_type INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. AI Analysis Cache Table
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  content_hash TEXT PRIMARY KEY,
  sentiment TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_date ON feedback(date DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_feedback_content_type ON feedback(content_type);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_content_search ON feedback USING gin(to_tsvector('simple', content));

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Row Level Security (RLS) - Optional but recommended
-- Enable RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anon users (adjust as needed)
CREATE POLICY "Allow all for feedback" ON feedback
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for ai_analysis_cache" ON ai_analysis_cache
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- Sample Queries (for reference)
-- ============================================

-- Get feedback by date range
-- SELECT * FROM feedback
-- WHERE date >= '2025-01-01' AND date <= '2025-01-31'
-- ORDER BY date DESC
-- LIMIT 20;

-- Get sentiment distribution
-- SELECT sentiment, COUNT(*) as count
-- FROM feedback
-- GROUP BY sentiment;

-- Get category distribution
-- SELECT category, COUNT(*) as count
-- FROM feedback
-- GROUP BY category;

-- Search feedback
-- SELECT * FROM feedback
-- WHERE content ILIKE '%关键词%'
-- ORDER BY date DESC;
