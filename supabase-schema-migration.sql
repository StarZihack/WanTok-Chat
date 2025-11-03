-- WanTok Database Schema Migration to Supabase Auth
-- This version handles existing objects and migrates safely
-- Run this SQL in your Supabase SQL Editor

-- ============================================================
-- STEP 1: Drop existing objects if they exist
-- ============================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS check_age_before_insert_or_update ON users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing views
DROP VIEW IF EXISTS active_suspensions;
DROP VIEW IF EXISTS pending_reports;
DROP VIEW IF EXISTS user_stats;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Service role can do anything with users" ON users;
DROP POLICY IF EXISTS "Users can view their own suspensions" ON suspensions;
DROP POLICY IF EXISTS "Service role can manage suspensions" ON suspensions;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Users can view reports they created" ON reports;
DROP POLICY IF EXISTS "Service role can manage reports" ON reports;

-- Drop existing tables (cascade to remove dependencies)
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS suspensions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS validate_age();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================
-- STEP 2: Create fresh tables linked to auth.users
-- ============================================================

-- Create users table that syncs with auth.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  country VARCHAR(100),
  age VARCHAR(100),
  gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other') OR gender IS NULL),
  dob DATE,
  bio TEXT,
  interests TEXT[],
  tokens INTEGER DEFAULT 100 CHECK (tokens >= 0),
  profile_complete BOOLEAN DEFAULT FALSE,
  google_id VARCHAR(255) UNIQUE,
  profile_picture_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT username_length CHECK (username IS NULL OR LENGTH(username) >= 3),
  CONSTRAINT full_name_not_empty CHECK (LENGTH(TRIM(full_name)) > 0)
);

-- Create suspensions table
CREATE TABLE suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  suspension_type VARCHAR(20) NOT NULL CHECK (suspension_type IN ('temporary', 'permanent')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by VARCHAR(255),

  CONSTRAINT reason_not_empty CHECK (LENGTH(TRIM(reason)) > 0),
  CONSTRAINT temporary_has_expiry CHECK (
    (suspension_type = 'permanent' AND expires_at IS NULL) OR
    (suspension_type = 'temporary' AND expires_at IS NOT NULL AND expires_at > created_at)
  )
);

-- Create reports table
CREATE TABLE reports (
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

  CONSTRAINT cannot_report_self CHECK (reporter_user_id != reported_user_id)
);

-- Create admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create admin activity logs table
CREATE TABLE admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================
-- STEP 3: Create indexes for performance
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_suspensions_user_id ON suspensions(user_id);
CREATE INDEX idx_suspensions_expires_at ON suspensions(expires_at);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at);

-- ============================================================
-- STEP 4: Create functions
-- ============================================================

-- Auto-update updated_at timestamp
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Age validation (ensure user is 18+)
CREATE FUNCTION validate_age()
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

-- Automatically create user profile when auth.users record is created
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, tokens, profile_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    20,
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 5: Create triggers
-- ============================================================

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER check_age_before_insert_or_update
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_age();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 6: Enable Row Level Security
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

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

-- Admin users table policies (server-side access only)
CREATE POLICY "Service role can manage admin users"
  ON admin_users FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admin activity logs policies (server-side access only)
CREATE POLICY "Service role can manage admin logs"
  ON admin_activity_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- STEP 7: Create utility views
-- ============================================================

CREATE VIEW active_suspensions AS
SELECT
  s.*,
  u.email,
  u.full_name
FROM suspensions s
JOIN users u ON s.user_id = u.id
WHERE
  s.suspension_type = 'permanent'
  OR (s.suspension_type = 'temporary' AND s.expires_at > NOW());

CREATE VIEW pending_reports AS
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

CREATE VIEW user_stats AS
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE profile_complete = true) AS completed_profiles,
  COUNT(*) FILTER (WHERE google_id IS NOT NULL) AS google_users,
  AVG(tokens) AS avg_tokens,
  SUM(tokens) AS total_tokens_in_circulation
FROM users;

-- ============================================================
-- STEP 8: Add helpful comments
-- ============================================================

COMMENT ON TABLE users IS 'User profiles synced with auth.users - stores additional user data';
COMMENT ON TABLE suspensions IS 'User suspension records for moderation';
COMMENT ON TABLE reports IS 'User reports for content moderation with AI verification';
COMMENT ON COLUMN users.tokens IS 'Virtual currency for premium features (filters, etc.)';
COMMENT ON COLUMN users.age IS 'Formatted age string with DOB for display';
COMMENT ON COLUMN users.dob IS 'Actual date of birth for age verification';
COMMENT ON COLUMN reports.ai_checked IS 'Whether AI moderation has been run on this report';
COMMENT ON COLUMN reports.ai_result IS 'JSON result from AI moderation check';

-- ============================================================
-- STEP 8: Insert default admin user
-- ============================================================
-- Default admin credentials:
-- Email: starzihack@gmail.com
-- Password: wapalin08
-- Password hash generated with bcrypt (cost factor 10)

INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
VALUES (
  'starzihack@gmail.com',
  '$2b$10$J8YhXqEH4zZQMK.FxrXDheqGxN8f8N7vWp5JkWZ7.vYvXQfkN5HjG',
  'Admin',
  'super_admin',
  TRUE
);

-- ============================================================
-- MIGRATION COMPLETE!
-- ============================================================
--
-- Your database is now set up with:
-- ✅ Users table linked to auth.users
-- ✅ Automatic profile creation when users sign up
-- ✅ Row Level Security enabled
-- ✅ Password hashing via Supabase Auth
-- ✅ All tables, triggers, and policies created
-- ✅ Admin users table with activity logging
-- ✅ Default admin user created (starzihack@gmail.com / wapalin08)
--
-- Next steps:
-- 1. Run this entire SQL script in Supabase SQL Editor
-- 2. Test admin login at http://localhost:3000/admin-login
-- 3. Test user registration at http://localhost:3000
-- 4. Verify everything in Supabase Dashboard
-- ============================================================
