-- WanTok Database Schema for Supabase with Supabase Auth Integration
-- Production-Ready Authentication Setup
-- Run this SQL in your Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

-- Create users table that syncs with auth.users
-- This table stores additional user profile data
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  age VARCHAR(100), -- Stored as formatted string e.g. "28 years old (DOB: 01/15/1997)"
  gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other') OR gender IS NULL),
  dob DATE, -- Date of birth
  bio TEXT,
  interests TEXT[],
  tokens INTEGER DEFAULT 100 CHECK (tokens >= 0),
  profile_complete BOOLEAN DEFAULT FALSE,
  google_id VARCHAR(255) UNIQUE,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT username_length CHECK (username IS NULL OR LENGTH(username) >= 3),
  CONSTRAINT full_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0)
);

-- Create suspensions table
CREATE TABLE IF NOT EXISTS suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  suspension_type VARCHAR(20) NOT NULL CHECK (suspension_type IN ('temporary', 'permanent')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by VARCHAR(255),

  -- Constraints
  CONSTRAINT reason_not_empty CHECK (LENGTH(TRIM(reason)) > 0),
  CONSTRAINT temporary_has_expiry CHECK (
    (suspension_type = 'permanent' AND expires_at IS NULL) OR
    (suspension_type = 'temporary' AND expires_at IS NOT NULL AND expires_at > created_at)
  )
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('nudity', 'minor', 'harassment', 'spam', 'other')),
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  ai_checked BOOLEAN DEFAULT FALSE,
  ai_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),

  -- Constraints
  CONSTRAINT cannot_report_self CHECK (reporter_user_id != reported_user_id)
);

-- ============================================================
-- INDEXES (Performance Optimization)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_user_id ON suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_expires_at ON suspensions(expires_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Age validation trigger (ensure user is 18+)
CREATE OR REPLACE FUNCTION validate_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dob IS NOT NULL THEN
    IF AGE(NEW.dob) < INTERVAL '18 years' THEN
      RAISE EXCEPTION 'User must be at least 18 years old';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_age_before_insert_or_update
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_age();

-- Automatically create user profile when auth.users record is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, tokens, profile_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    20, -- Starting bonus tokens
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Service role can do anything with users"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Suspensions table policies
CREATE POLICY "Users can view their own suspensions"
  ON suspensions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage suspensions"
  ON suspensions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Reports table policies
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users can view reports they created"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_user_id);

CREATE POLICY "Service role can manage reports"
  ON reports FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- UTILITY VIEWS
-- ============================================================

-- Active suspensions view
CREATE OR REPLACE VIEW active_suspensions AS
SELECT
  s.*,
  u.email,
  u.full_name
FROM suspensions s
JOIN users u ON s.user_id = u.id
WHERE
  s.suspension_type = 'permanent'
  OR (s.suspension_type = 'temporary' AND s.expires_at > NOW());

-- Pending reports view
CREATE OR REPLACE VIEW pending_reports AS
SELECT
  r.*,
  reporter.email AS reporter_email,
  reporter.full_name AS reporter_name,
  reported.email AS reported_email,
  reported.full_name AS reported_name
FROM reports r
JOIN users reporter ON r.reporter_user_id = reporter.id
JOIN users reported ON r.reported_user_id = reported.id
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;

-- User statistics view
CREATE OR REPLACE VIEW user_stats AS
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE profile_complete = true) AS completed_profiles,
  COUNT(*) FILTER (WHERE google_id IS NOT NULL) AS google_users,
  AVG(tokens) AS avg_tokens,
  SUM(tokens) AS total_tokens_in_circulation
FROM users;

-- ============================================================
-- COMMENTS (Documentation)
-- ============================================================

COMMENT ON TABLE users IS 'User profiles synced with auth.users - stores additional user data';
COMMENT ON TABLE suspensions IS 'User suspension records for moderation';
COMMENT ON TABLE reports IS 'User reports for content moderation with AI verification';
COMMENT ON COLUMN users.tokens IS 'Virtual currency for premium features (filters, etc.)';
COMMENT ON COLUMN users.age IS 'Formatted age string with DOB for display';
COMMENT ON COLUMN users.dob IS 'Actual date of birth for age verification';
COMMENT ON COLUMN reports.ai_checked IS 'Whether AI moderation has been run on this report';
COMMENT ON COLUMN reports.ai_result IS 'JSON result from AI moderation check';
