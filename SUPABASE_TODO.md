# Supabase Setup - Action Required

## ⚠️ IMPORTANT: You Need To Do This Before the Admin Panel Works

The admin system is fully built and ready, but you need to add the admin tables to your Supabase database first.

---

## What You Need To Do

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New Query"**

### Step 2: Run the Migration Script

1. Open the file `supabase-schema-migration.sql` in your project
2. **Copy the ENTIRE contents** of the file
3. Paste it into the Supabase SQL Editor
4. Click the **"Run"** button (or press Ctrl+Enter)

The script will:
- ✅ Create admin_users table
- ✅ Create admin_activity_logs table
- ✅ Add indexes for fast queries
- ✅ Enable Row Level Security (RLS)
- ✅ Create your admin account automatically

### Step 3: Verify It Worked

After running the script:

1. Go to **"Table Editor"** in Supabase
2. You should see two new tables:
   - `admin_users`
   - `admin_activity_logs`
3. Click on `admin_users` table
4. You should see one row with:
   - email: `starzihack@gmail.com`
   - role: `super_admin`
   - is_active: `true`

---

## What's New in the Database

### Admin Users Table
Stores administrator accounts with secure password hashing.

**Fields:**
- `id` - Unique admin ID
- `email` - Admin email (starzihack@gmail.com)
- `password_hash` - Bcrypt hashed password
- `full_name` - Admin's name
- `role` - admin or super_admin
- `created_at` - Account creation date
- `last_login_at` - Last login timestamp
- `is_active` - Account status

### Admin Activity Logs Table
Tracks all admin actions for security audit.

**Fields:**
- `id` - Unique log ID
- `admin_id` - Which admin performed the action
- `action` - What they did (login, ban, unban, etc.)
- `target_type` - Type of target (user, report, etc.)
- `target_id` - ID of the affected item
- `details` - JSON with additional info
- `ip_address` - IP address of the admin
- `created_at` - When the action occurred

---

## Your Admin Credentials

After running the migration, you can login with:

**Login URL:** http://localhost:3000/admin-login

**Email:** starzihack@gmail.com
**Password:** wapalin08

---

## If Something Goes Wrong

### "Relation already exists" error
This means the tables were already created. The script is safe to run multiple times because it drops existing tables first.

### "Permission denied" error
Make sure you're using the SQL Editor in your Supabase dashboard, not trying to run it elsewhere.

### Can't see the new tables
1. Refresh your Supabase dashboard
2. Check you're looking at the correct project
3. Verify the SQL script ran without errors

### Admin login fails
1. Make sure the SQL script completed successfully
2. Check the `admin_users` table has your account
3. Verify the email is exactly: `starzihack@gmail.com`

---

## After Setup

Once you've run the SQL script, everything else is ready:

✅ Admin login page: `/admin-login`
✅ Admin dashboard: `/admin`
✅ Analytics with user stats
✅ Report management
✅ Suspension management
✅ User management with ban/unban
✅ Real-time updates
✅ Activity logging

Just run the SQL script and you're good to go!
