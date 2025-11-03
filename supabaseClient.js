// supabaseClient.js - Supabase configuration and client setup
const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://szznudacasvidunapcor.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6em51ZGFjYXN2aWR1bmFwY29yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MDY5MTcsImV4cCI6MjA3Njk4MjkxN30.4XxAaDdAmZa2HoFW6udCJWluK1b2NMSA5LaQoKi6aDQ';

// For backend/server use, we need the service_role key to bypass RLS
// IMPORTANT: Keep this secret! Never expose to client-side code
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6em51ZGFjYXN2aWR1bmFwY29yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQwNjkxNywiZXhwIjoyMDc2OTgyOTE3fQ.A8PParkq6vk2fg7ffRQxGWBvuw1sMiSqGpoT1UIagjA';

// Create Supabase client with service role for backend operations
// Note: service_role key bypasses Row Level Security - only use server-side!
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = supabase;
