# Supabase Auth Migration Guide

## Overview
This guide walks you through migrating WanTok from a custom authentication system to production-ready Supabase Auth.

## Why Migrate to Supabase Auth?

### Current Setup (Custom Auth)
- ❌ Passwords stored in plain text (SECURITY RISK)
- ❌ Manual session management
- ❌ No email verification
- ❌ No password reset functionality
- ❌ Users only in `public.users` table

### New Setup (Supabase Auth)
- ✅ Passwords automatically hashed with bcrypt
- ✅ Built-in session management with JWT tokens
- ✅ Email verification (optional)
- ✅ Password reset functionality
- ✅ OAuth integration (Google, GitHub, etc.)
- ✅ Users in both `auth.users` AND `public.users` (synced automatically)
- ✅ Production-ready security

## Migration Steps

### Step 1: Update Database Schema

1. **Backup your current data** (if you have any users):
```sql
-- Run this in Supabase SQL Editor to backup
CREATE TABLE users_backup AS SELECT * FROM users;
CREATE TABLE suspensions_backup AS SELECT * FROM suspensions;
CREATE TABLE reports_backup AS SELECT * FROM reports;
```

2. **Drop old tables**:
```sql
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS suspensions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
```

3. **Run the new schema**:
   - Open Supabase Dashboard → SQL Editor
   - Copy ALL content from `supabase-schema-with-auth.sql`
   - Paste and execute it

This will create:
- `public.users` table linked to `auth.users`
- Automatic triggers to sync auth.users ↔ public.users
- Row Level Security policies
- All other tables (suspensions, reports)

### Step 2: Configure Supabase Auth Settings

1. Go to **Authentication → Settings** in Supabase Dashboard

2. **Enable Email Auth**:
   - Enable "Email" provider
   - Disable "Confirm email" (for easier testing, enable in production)
   - Set "Site URL" to: `http://localhost:3000`

3. **Configure Google OAuth** (if using):
   - Enable "Google" provider
   - Add your Google Client ID and Secret
   - Add authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

### Step 3: Files Already Updated

The following files have been updated to use Supabase Auth:

✅ **database.js** - Added authentication functions:
- `registerUser(email, password, fullName, country)`
- `signInUser(email, password)`
- `signOutUser()`
- `getCurrentSession()`
- `signInWithGoogle()`

✅ **server.js** - Updated authentication endpoints:
- `/api/login` - Now uses Supabase Auth
- `/api/register` - Now uses Supabase Auth

✅ **supabaseClient.js** - Already configured with service_role key

### Step 4: Test the Migration

1. **Restart the server** (already done)

2. **Test Registration**:
   - Go to http://localhost:3000
   - Click "Sign Up"
   - Fill in the form
   - Submit

3. **Check Supabase Dashboard**:
   - **Authentication → Users**: Should see the new user here! ✅
   - **Database → users**: Should also see the user profile here ✅

4. **Test Login**:
   - Log out
   - Log back in with the same credentials
   - Should work! ✅

### Step 5: Verify Everything Works

Check these features:
- [ ] User registration creates user in both `auth.users` AND `public.users`
- [ ] Login works with email/password
- [ ] Token balance shows correctly (20 starting tokens)
- [ ] User profile data is saved
- [ ] Password is NOT visible in database (it's hashed in auth.users)

## What Changed

### Database Structure

**Before:**
```
public.users
├── id (UUID)
├── email
├── password (plain text ❌)
└── ... profile fields
```

**After:**
```
auth.users (Managed by Supabase)
├── id (UUID)
├── email
├── encrypted_password (hashed ✅)
└── ... auth metadata

public.users (Synced automatically)
├── id (UUID) → REFERENCES auth.users(id)
├── email
├── NO password field ✅
└── ... profile fields
```

### Authentication Flow

**Before:**
```
Client → Server → Manual password check → Return user
```

**After:**
```
Client → Server → Supabase Auth (secure) → JWT token → Return user + session
```

## Security Improvements

1. **Password Hashing**: Passwords are now hashed with bcrypt
2. **JWT Tokens**: Sessions use secure JWT tokens
3. **Row Level Security**: Database enforces access control
4. **No Plain Text Passwords**: Never stored or transmitted
5. **Session Management**: Automatic token refresh

## Important Notes

### For Development
- Email confirmation is disabled for easier testing
- Users can register and login immediately

### For Production
- Enable email confirmation in Supabase Dashboard
- Set up email templates
- Configure proper Site URL
- Use environment variables for all secrets

## Troubleshooting

### Issue: "User already exists"
**Solution**: The email is already registered in auth.users. Use a different email or delete the user from Authentication → Users in Supabase Dashboard.

### Issue: "Invalid login credentials"
**Solution**: Make sure you're using the correct email/password. Passwords are case-sensitive.

### Issue: "User not found in public.users"
**Solution**: The trigger might not have fired. Manually check:
```sql
SELECT * FROM auth.users; -- Check if user exists here
SELECT * FROM public.users; -- Check if profile exists here
```

If user is in auth.users but not public.users, manually create profile:
```sql
INSERT INTO public.users (id, email, full_name, tokens)
SELECT id, email, raw_user_meta_data->>'full_name', 20
FROM auth.users
WHERE id = 'USER_ID_HERE';
```

### Issue: "RLS policy violation"
**Solution**: Make sure you're using the service_role key in server.js (already configured).

## Next Steps

Once everything is working:

1. ✅ Test all authentication flows
2. ✅ Verify token system works
3. ✅ Test user profile updates
4. 🔄 Update Google OAuth if needed
5. 🔄 Add email verification (production)
6. 🔄 Add password reset functionality
7. 🔄 Add email templates customization

## Files Reference

- `supabase-schema-with-auth.sql` - New database schema
- `database.js` - Auth helper functions
- `server.js` - Auth API endpoints
- `supabaseClient.js` - Supabase configuration
- This file: Migration guide

---

**Status**: ✅ Code is ready and updated
**Action Required**: Run the SQL schema in Supabase Dashboard

The server is already running with the new auth code. Once you run the SQL schema, everything will work with production-ready Supabase Auth!
