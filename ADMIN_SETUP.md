# WanTok Admin Panel - Complete Setup Guide

## Overview
The admin panel is now fully configured with secure authentication, comprehensive analytics, moderation tools, and user management features.

---

## Admin Credentials

**Email:** starzihack@gmail.com
**Password:** wapalin08
**Role:** super_admin

---

## What's Included

### 1. **Secure Authentication System**
- Dedicated admin login page at `/admin-login`
- Password hashing with bcrypt (cost factor 10)
- Session-based authentication (24-hour validity)
- Automatic session expiry and redirect
- Admin activity logging for security audit

### 2. **Analytics Dashboard**
The admin panel displays real-time statistics:
- **Total Users** - Count of registered users
- **Online Users** - Currently active users
- **Total Reports** - All user reports
- **Total Violations** - Moderation violations/suspensions
- **Suspended Users** - Currently suspended accounts
- **Permanent Bans** - Permanently banned users

Advanced analytics include:
- Gender breakdown (Male, Female, Other)
- Top 10 countries by user count
- Report status tracking
- Suspension type distribution

### 3. **Moderation Panel**
Complete tools for managing platform safety:

#### User Reports Tab
- View all user-submitted reports
- See reporter and reported user IDs
- Report reason and status
- AI check status
- Timestamp for each report
- Detailed JSON view of each report

#### Suspended Users Tab
- View all active suspensions
- User ID and username
- Suspension type (Temporary/Permanent)
- Suspension reason
- Creation and expiration dates
- **Unban functionality** - Remove suspensions with one click
- Detailed suspension history

#### All Users Tab
- Complete user database
- Username, full name, email
- Gender and country
- Token balance
- Account creation date
- **Manual ban functionality** - Ban users directly from admin panel
- Support for both temporary (7 days) and permanent bans

### 4. **Database Schema**
New tables added to Supabase:

#### admin_users Table
```sql
- id (UUID, primary key)
- email (unique, not null)
- password_hash (bcrypt hashed)
- full_name
- role (admin / super_admin)
- created_at
- last_login_at
- is_active (boolean)
```

#### admin_activity_logs Table
```sql
- id (UUID, primary key)
- admin_id (foreign key)
- action (varchar)
- target_type (varchar)
- target_id (UUID)
- details (JSONB)
- ip_address
- created_at
```

### 5. **Admin API Endpoints**

#### POST /api/admin/login
- Authenticates admin users
- Validates credentials against database
- Updates last login timestamp
- Logs login activity
- Returns admin session data

#### GET /api/admin/analytics
- Returns comprehensive analytics data
- Includes user statistics
- Report and suspension counts
- Gender breakdown
- Top countries

#### GET /api/admin/suspensions
- Returns all suspensions
- Optional filter by type (temporary/permanent)
- Ordered by creation date

#### GET /api/admin/all-reports
- Returns all reports (not just pending)
- Optional filter by status
- Ordered by creation date

#### GET /api/admin/all-users
- Returns complete user list
- Ordered by registration date
- Excludes sensitive data

#### POST /api/admin/unban
- Removes suspension for specified user
- Deletes from suspensions table
- Immediate effect

---

## Setup Instructions

### Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase-schema-migration.sql` from your project
4. Copy the entire SQL script
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute the script

This will:
- Create `admin_users` table
- Create `admin_activity_logs` table
- Add indexes for performance
- Enable Row Level Security (RLS)
- Insert your default admin user (starzihack@gmail.com)

### Step 2: Verify Admin User Creation

1. In Supabase Dashboard, go to **Table Editor**
2. Select `admin_users` table
3. Verify your admin account exists:
   - Email: starzihack@gmail.com
   - Role: super_admin
   - is_active: true

### Step 3: Access Admin Panel

1. Start your server (if not already running):
   ```bash
   node server.js
   ```

2. Open your browser and go to:
   ```
   http://localhost:3000/admin-login
   ```

3. Login with:
   - **Email:** starzihack@gmail.com
   - **Password:** wapalin08

4. You'll be redirected to the admin dashboard at:
   ```
   http://localhost:3000/admin
   ```

### Step 4: Verify Everything Works

Test the following features:

**✅ Authentication**
- Login with admin credentials
- Verify redirect to dashboard
- Try accessing /admin without login (should redirect to login page)
- Logout and verify session cleared

**✅ Analytics**
- Check all stat cards display correctly
- Verify online user count updates
- Review gender and country breakdowns

**✅ Moderation**
- View user reports
- Check suspended users list
- Test ban functionality on a test user
- Test unban functionality
- Verify changes reflect immediately

**✅ User Management**
- Browse all users
- View user details in modal
- Check token balances
- Verify account creation dates

---

## Security Features

### Password Security
- Bcrypt hashing with cost factor 10
- Password never stored in plaintext
- Password never returned in API responses

### Session Management
- 24-hour session expiry
- Stored in sessionStorage (cleared on browser close)
- Automatic expiry checking on each page load
- Redirect to login on expired session

### Activity Logging
- All admin logins logged with IP address
- Action tracking for audit trail
- Timestamp for each activity

### Row Level Security (RLS)
- Admin tables only accessible via service role
- Client-side direct access blocked
- All queries go through authenticated server endpoints

### API Protection
- All admin endpoints require server-side authentication
- Input validation on all endpoints
- Error handling prevents information leakage

---

## Features Overview

### Real-time Updates
- Dashboard auto-refreshes every 30 seconds
- Manual refresh button on each section
- Online user count updates live

### User-Friendly Interface
- Beautiful gradient design
- Responsive layout (works on mobile)
- Tab-based navigation
- Modal popups for detailed views
- Loading states and animations
- Empty states with helpful messages

### Advanced Analytics
Accessible via `/api/admin/analytics`:
- Total users count
- Total reports count
- Total suspensions count
- Permanent bans count
- Pending reports count
- Gender distribution
- Top 10 countries

---

## Production Deployment Notes

### Before Deploying:

1. **Change Session Secret** (server.js line 16):
   ```javascript
   secret: 'wantok-secret-key-change-in-production'
   ```
   Replace with a strong random string.

2. **Enable HTTPS** (server.js line 20):
   ```javascript
   secure: false, // Set to true in production with HTTPS
   ```
   Change to `true` when deploying with SSL.

3. **Update CORS Settings** if needed (for production domain).

4. **Environment Variables**:
   - Ensure `SUPABASE_URL` is set
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set
   - Set `PORT` if needed (default: 3000)

5. **Verify Database**:
   - All tables created
   - RLS policies enabled
   - Admin user exists
   - Indexes created

---

## Troubleshooting

### Can't Login to Admin Panel

**Problem:** "Invalid credentials" error
**Solution:**
1. Verify admin user exists in Supabase `admin_users` table
2. Check email is exactly: `starzihack@gmail.com`
3. Verify password hash was inserted correctly
4. Check server logs for detailed error messages

**Problem:** Redirects to login immediately after logging in
**Solution:**
1. Check browser console for errors
2. Verify sessionStorage is enabled in browser
3. Clear browser cache and try again

### Data Not Loading

**Problem:** Dashboard shows "No users found" or empty stats
**Solution:**
1. Check server is running and connected to Supabase
2. Verify Supabase credentials in `.env` file
3. Check browser network tab for failed API calls
4. Verify database tables have data

**Problem:** "Failed to fetch analytics" error
**Solution:**
1. Check Supabase service role key is valid
2. Verify RLS policies allow service role access
3. Check server logs for database errors

### Ban/Unban Not Working

**Problem:** Ban button doesn't work
**Solution:**
1. Check browser console for errors
2. Verify `/api/moderation-violation` endpoint is working
3. Check suspension was created in database

**Problem:** Unban button doesn't work
**Solution:**
1. Verify `/api/admin/unban` endpoint is working
2. Check suspension was deleted from database
3. Refresh page to see updated list

---

## Adding More Admin Users

If you want to add more administrators:

1. Generate a bcrypt hash for the new password:
   ```javascript
   const bcrypt = require('bcrypt');
   bcrypt.hash('newpassword', 10, (err, hash) => {
     console.log(hash);
   });
   ```

2. Insert new admin in Supabase SQL Editor:
   ```sql
   INSERT INTO admin_users (email, password_hash, full_name, role, is_active)
   VALUES (
     'newemail@example.com',
     'PASTE_BCRYPT_HASH_HERE',
     'Admin Name',
     'admin',
     TRUE
   );
   ```

3. New admin can now login at `/admin-login`

---

## Admin Roles

- **admin**: Standard admin access, can view and moderate
- **super_admin**: Full access (your current account)

Currently both roles have same permissions. You can extend this in the future by adding role checks in the API endpoints.

---

## Quick Links

- **Admin Login:** http://localhost:3000/admin-login
- **Admin Dashboard:** http://localhost:3000/admin (requires login)
- **Supabase Dashboard:** Your Supabase project URL

---

## Summary

You now have a production-ready admin panel with:
✅ Secure authentication system
✅ Comprehensive analytics dashboard
✅ Full moderation tools (reports, suspensions, bans)
✅ User management interface
✅ Activity logging and audit trail
✅ Real-time updates
✅ Beautiful, responsive UI
✅ Database-backed with Supabase

The admin panel is ready for production deployment!
