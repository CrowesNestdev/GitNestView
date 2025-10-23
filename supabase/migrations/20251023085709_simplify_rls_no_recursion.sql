/*
  # Simplify RLS policies to avoid recursion

  1. Changes
    - Remove all policies that check other rows in profiles table
    - Keep only simple self-referential policies
    - Super admin checks will be done in application layer

  2. Security
    - Users can view and update only their own profile
    - This is secure and prevents recursion
    - Super admin permissions will be handled by the app
*/

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "System can insert profiles" ON profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Service role bypass (for triggers and functions)
CREATE POLICY "Service role can do anything"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
