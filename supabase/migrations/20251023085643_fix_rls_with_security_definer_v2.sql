/*
  # Fix RLS recursion with security definer function

  1. Changes
    - Create a security definer function to check user role without triggering RLS
    - Update policies to use this function
    - This breaks the recursion cycle

  2. Security
    - Function is secure and only checks the authenticated user's own role
    - Cannot be used to check other users' roles
*/

-- Create a security definer function that bypasses RLS to check the current user's role
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;

-- Recreate policies using the security definer function
CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (current_user_is_super_admin() = true);

CREATE POLICY "Super admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (current_user_is_super_admin() = true)
  WITH CHECK (current_user_is_super_admin() = true);
