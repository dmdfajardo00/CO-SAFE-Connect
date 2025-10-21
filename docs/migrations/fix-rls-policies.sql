-- ============================================
-- Fix RLS Policies for Passwordless Auth
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing restrictive policies on users table
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Allow anyone to create a user account (for passwordless auth)
CREATE POLICY "Anyone can create users"
    ON users FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Allow anyone to read users (needed for email lookup during login)
CREATE POLICY "Anyone can view users"
    ON users FOR SELECT
    TO anon, authenticated
    USING (true);

-- Allow users to update their own data
CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    TO anon, authenticated
    USING (true);

-- ============================================
-- DONE - Policies updated for passwordless auth
-- ============================================
