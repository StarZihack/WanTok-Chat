-- WanTok Database Schema for Supabase (Production-Ready)
-- Run this SQL in your Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

-- Create users table with proper constraints and validation
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255), -- Nullable for Google OAuth users
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
  CONSTRAINT full_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0),
  CONSTRAINT password_or_google CHECK (password IS NOT NULL OR google_id IS NOT NULL)
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
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_username VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(255),

  -- Constraints
  CONSTRAINT reason_not_empty CHECK (LENGTH(TRIM(reason)) > 0),
  CONSTRAINT no_self_report CHECK (reporter_id IS NULL OR reporter_id != reported_user_id),
  CONSTRAINT resolved_requires_resolver CHECK (
    (status = 'pending' AND resolved_at IS NULL AND resolved_by IS NULL) OR
    (status != 'pending' AND resolved_at IS NOT NULL)
  )
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(profile_complete);

CREATE INDEX IF NOT EXISTS idx_suspensions_user_id ON suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_suspensions_expires_at ON suspensions(expires_at);
CREATE INDEX IF NOT EXISTS idx_suspensions_type ON suspensions(suspension_type);
CREATE INDEX IF NOT EXISTS idx_suspensions_created_at ON suspensions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to validate age (must be 18+)
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

-- Trigger to validate age before insert/update
CREATE TRIGGER validate_user_age
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_age();

-- Function to clean expired suspensions
CREATE OR REPLACE FUNCTION clean_expired_suspensions()
RETURNS void AS $$
BEGIN
  DELETE FROM suspensions
  WHERE suspension_type = 'temporary'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow service role full access to users" ON users;
DROP POLICY IF EXISTS "Allow service role full access to suspensions" ON suspensions;
DROP POLICY IF EXISTS "Allow service role full access to reports" ON reports;

-- Users table policies - Allow service role full access (for backend API)
CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow anon role to insert (for registration)
CREATE POLICY "Anyone can register"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Suspensions table policies
CREATE POLICY "Service role can manage suspensions"
  ON suspensions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Reports table policies
CREATE POLICY "Service role can manage reports"
  ON reports FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- UTILITY VIEWS (Optional - for analytics/monitoring)
-- ============================================================

-- View for active suspensions
CREATE OR REPLACE VIEW active_suspensions AS
SELECT
  s.*,
  u.email,
  u.full_name
FROM suspensions s
JOIN users u ON s.user_id = u.id
WHERE
  s.suspension_type = 'permanent' OR
  (s.suspension_type = 'temporary' AND s.expires_at > NOW())
ORDER BY s.created_at DESC;

-- View for pending reports
CREATE OR REPLACE VIEW pending_reports AS
SELECT
  r.*,
  reporter.email as reporter_email,
  reporter.full_name as reporter_name,
  reported.email as reported_email,
  reported.full_name as reported_name
FROM reports r
LEFT JOIN users reporter ON r.reporter_id = reporter.id
JOIN users reported ON r.reported_user_id = reported.id
WHERE r.status = 'pending'
ORDER BY r.created_at DESC;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE users IS 'Stores all user account information including authentication and profile data';
COMMENT ON TABLE suspensions IS 'Tracks user suspensions and bans with expiration dates';
COMMENT ON TABLE reports IS 'Stores user-generated moderation reports';

COMMENT ON COLUMN users.age IS 'Formatted age string including DOB for display purposes';
COMMENT ON COLUMN users.tokens IS 'Virtual currency/credits for platform features';
COMMENT ON COLUMN users.profile_complete IS 'Indicates if user has completed age verification and profile setup';
COMMENT ON COLUMN suspensions.suspension_type IS 'Either temporary (with expiry) or permanent';
COMMENT ON COLUMN reports.status IS 'Report lifecycle: pending -> reviewed -> resolved/dismissed';
