// database.js - Database helper functions using Supabase
const supabase = require('./supabaseClient');

// ============================================================
// AUTHENTICATION FUNCTIONS (Supabase Auth)
// ============================================================

/**
 * Register new user with email/password using Supabase Auth
 */
async function registerUser(email, password, fullName, country) {
  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      console.error('Auth registration error:', authError);
      throw authError;
    }

    // The trigger will automatically create the profile in public.users
    // But we need to update it with additional info
    if (authData.user) {
      const { data: userData, error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          country: country,
          tokens: 20
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating user profile:', updateError);
        // Don't throw here - user is created, just profile update failed
      }

      return userData || authData.user;
    }

    return authData.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

/**
 * Sign in user with email/password using Supabase Auth
 */
async function signInUser(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }

    // Get full user profile
    if (data.user) {
      const profile = await getUserById(data.user.id);
      return { ...data, profile };
    }

    return data;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
  return true;
}

/**
 * Get current authenticated user session
 */
async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Get session error:', error);
    return null;
  }
  return session;
}

/**
 * Sign in with Google OAuth
 */
async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.APP_URL || 'http://localhost:3000'}/auth/callback`
    }
  });

  if (error) {
    console.error('Google sign in error:', error);
    throw error;
  }

  return data;
}

// ============================================================
// USER MANAGEMENT FUNCTIONS
// ============================================================

/**
 * Get user by email
 */
async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user by email:', error);
    return null;
  }
  return data;
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user by username:', error);
    return null;
  }
  return data;
}

/**
 * Get user by ID
 */
async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching user by ID:', error);
    return null;
  }
  return data;
}

/**
 * Get user by Google ID
 */
async function getUserByGoogleId(googleId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user by Google ID:', error);
    return null;
  }
  return data;
}

/**
 * Create new user
 */
async function createUser(userData) {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }
  return data;
}

/**
 * Update user
 */
async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }
  return data;
}

/**
 * Update user tokens
 */
async function updateUserTokens(userId, tokens) {
  const { data, error } = await supabase
    .from('users')
    .update({ tokens: tokens })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tokens:', error);
    throw error;
  }
  return data;
}

/**
 * Add tokens to user (increment)
 */
async function addTokensToUser(userId, amount) {
  // Get current user
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Calculate new token amount
  const newTokens = (user.tokens || 0) + amount;

  // Update tokens
  return await updateUserTokens(userId, newTokens);
}

/**
 * Deduct tokens from user (decrement)
 */
async function deductTokensFromUser(userId, amount) {
  // Get current user
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Calculate new token amount (don't go below 0)
  const newTokens = Math.max(0, (user.tokens || 0) - amount);

  // Update tokens
  return await updateUserTokens(userId, newTokens);
}

/**
 * Delete user
 */
async function deleteUser(userId) {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
  return true;
}

// Suspension Management Functions

/**
 * Get active suspension for a user
 */
async function getActiveSuspension(userId) {
  const { data, error } = await supabase
    .from('suspensions')
    .select('*')
    .eq('user_id', userId)
    .or('suspension_type.eq.permanent,expires_at.gt.' + new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching suspension:', error);
    return null;
  }
  return data;
}

/**
 * Create suspension
 */
async function createSuspension(suspensionData) {
  const { data, error } = await supabase
    .from('suspensions')
    .insert([suspensionData])
    .select()
    .single();

  if (error) {
    console.error('Error creating suspension:', error);
    throw error;
  }
  return data;
}

/**
 * Get all suspensions for a user
 */
async function getUserSuspensions(userId) {
  const { data, error } = await supabase
    .from('suspensions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user suspensions:', error);
    return [];
  }
  return data;
}

// Report Management Functions

/**
 * Create report
 */
async function createReport(reportData) {
  const { data, error } = await supabase
    .from('reports')
    .insert([reportData])
    .select()
    .single();

  if (error) {
    console.error('Error creating report:', error);
    throw error;
  }
  return data;
}

/**
 * Get reports for a user
 */
async function getReportsForUser(userId) {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('reported_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return data;
}

/**
 * Get all pending reports
 */
async function getPendingReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending reports:', error);
    return [];
  }
  return data;
}

/**
 * Update report status
 */
async function updateReportStatus(reportId, status, resolvedBy) {
  const updates = {
    status: status,
    resolved_at: new Date().toISOString(),
    resolved_by: resolvedBy
  };

  const { data, error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
  return data;
}

/**
 * Delete suspension (unban user)
 */
async function deleteSuspension(userId) {
  const { error } = await supabase
    .from('suspensions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting suspension:', error);
    throw error;
  }
  return true;
}

// Admin Functions

/**
 * Get admin user by email
 */
async function getAdminByEmail(email) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching admin:', error);
    return null;
  }
  return data;
}

/**
 * Update admin last login
 */
async function updateAdminLastLogin(adminId) {
  const { error } = await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', adminId);

  if (error) {
    console.error('Error updating admin last login:', error);
  }
}

/**
 * Log admin activity
 */
async function logAdminActivity(activityData) {
  const { error } = await supabase
    .from('admin_activity_logs')
    .insert([activityData]);

  if (error) {
    console.error('Error logging admin activity:', error);
  }
}

/**
 * Get all suspensions (with filters)
 */
async function getAllSuspensions(filters = {}) {
  let query = supabase
    .from('suspensions')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.type) {
    query = query.eq('suspension_type', filters.type);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching suspensions:', error);
    return [];
  }
  return data;
}

/**
 * Get all reports (with filters)
 */
async function getAllReports(filters = {}) {
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
  return data;
}

/**
 * Get all users (admin view)
 */
async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all users:', error);
    return [];
  }
  return data;
}

/**
 * Get analytics data
 */
async function getAnalytics() {
  try {
    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) console.error('Error fetching user count:', usersError);

    // Get total reports
    const { count: totalReports, error: reportsError } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true });

    if (reportsError) console.error('Error fetching reports count:', reportsError);

    // Get total suspensions
    const { count: totalSuspensions, error: suspensionsError } = await supabase
      .from('suspensions')
      .select('*', { count: 'exact', head: true });

    if (suspensionsError) console.error('Error fetching suspensions count:', suspensionsError);

    // Get permanent bans
    const { count: permanentBans, error: bansError } = await supabase
      .from('suspensions')
      .select('*', { count: 'exact', head: true })
      .eq('suspension_type', 'permanent');

    if (bansError) console.error('Error fetching permanent bans:', bansError);

    // Get pending reports
    const { count: pendingReports, error: pendingError } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) console.error('Error fetching pending reports:', pendingError);

    // Get users by gender
    const { data: genderStats } = await supabase
      .from('users')
      .select('gender');

    const genderBreakdown = {
      Male: 0,
      Female: 0,
      Other: 0
    };

    if (genderStats) {
      genderStats.forEach(user => {
        if (user.gender && genderBreakdown.hasOwnProperty(user.gender)) {
          genderBreakdown[user.gender]++;
        }
      });
    }

    // Get top countries
    const { data: countryData } = await supabase
      .from('users')
      .select('country');

    const countryCounts = {};
    if (countryData) {
      countryData.forEach(user => {
        if (user.country) {
          countryCounts[user.country] = (countryCounts[user.country] || 0) + 1;
        }
      });
    }

    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    return {
      totalUsers: totalUsers || 0,
      totalReports: totalReports || 0,
      totalSuspensions: totalSuspensions || 0,
      permanentBans: permanentBans || 0,
      pendingReports: pendingReports || 0,
      genderBreakdown,
      topCountries
    };
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return null;
  }
}

module.exports = {
  // Authentication functions
  registerUser,
  signInUser,
  signOutUser,
  getCurrentSession,
  signInWithGoogle,

  // User functions
  getUserByEmail,
  getUserByUsername,
  getUserById,
  getUserByGoogleId,
  createUser,
  updateUser,
  deleteUser,

  // Token functions
  updateUserTokens,
  addTokensToUser,
  deductTokensFromUser,

  // Suspension functions
  getActiveSuspension,
  createSuspension,
  getUserSuspensions,
  deleteSuspension,

  // Report functions
  createReport,
  getReportsForUser,
  getPendingReports,
  updateReportStatus,

  // Admin functions
  getAdminByEmail,
  updateAdminLastLogin,
  logAdminActivity,
  getAllSuspensions,
  getAllReports,
  getAllUsers,
  getAnalytics
};
