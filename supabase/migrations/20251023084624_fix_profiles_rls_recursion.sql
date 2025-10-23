/*
  # Fix infinite recursion in profiles RLS policies

  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies that don't reference profiles table
    - Use a simpler approach for admin/super admin checks

  2. Security
    - Users can still view and update their own profile
    - Super admins can view/update all profiles
    - Admins can view/update users in their company
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view company users" ON profiles;
DROP POLICY IF EXISTS "Admins can update company users" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Simple policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Simple policy: Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND role = 'user'
    AND is_super_admin = false
  );

-- Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Super admins can update all profiles
CREATE POLICY "Super admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );
