-- Fix Admin Password
-- Run this in Supabase SQL Editor to update/create the admin user

-- First, delete existing admin if exists
DELETE FROM admin_users WHERE email = 'starzihack@gmail.com';

-- Insert admin with correct password hash for "wapalin08"
INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
VALUES (
  'starzihack@gmail.com',
  '$2b$10$5WdMF3D7wg0y/Jy/yoG.jO9bT45k/mP8R57pYVxqm5U0GEB4i4Jm2',
  'Admin',
  'super_admin',
  TRUE
);

-- Verify the admin was created
SELECT email, full_name, role, is_active, created_at FROM admin_users WHERE email = 'starzihack@gmail.com';
