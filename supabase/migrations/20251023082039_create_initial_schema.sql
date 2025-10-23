/*
  # Initial Database Schema for Nest View Multi-Site Manager

  ## Overview
  This migration creates the complete database schema for a multi-tenant sports venue management system
  with role-based access control (Super Admin, Admin, User).

  ## New Tables

  ### 1. `profiles`
  User profile data linked to auth.users
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `full_name` (text)
  - `company_id` (uuid, references companies)
  - `site_id` (uuid, references sites) - for regular users
  - `role` (text) - 'super_admin', 'admin', or 'user'
  - `is_super_admin` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `companies`
  Organizations that manage multiple sites
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `max_sites` (integer, default 5)
  - `contact_email` (text)
  - `contact_phone` (text)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `sites`
  Physical locations (venues/bars)
  - `id` (uuid, primary key)
  - `company_id` (uuid, references companies, not null)
  - `name` (text, not null)
  - `location` (text)
  - `timezone` (text, default 'UTC')
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `channels`
  TV channels available for sports content
  - `id` (uuid, primary key)
  - `company_id` (uuid, references companies, not null)
  - `name` (text, not null)
  - `logo_url` (text)
  - `channel_number` (text)
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `sports_events`
  Sports calendar events
  - `id` (uuid, primary key)
  - `company_id` (uuid, references companies, not null)
  - `title` (text, not null)
  - `sport_type` (text)
  - `league` (text)
  - `home_team` (text)
  - `away_team` (text)
  - `start_time` (timestamptz, not null)
  - `end_time` (timestamptz)
  - `channel_id` (uuid, references channels)
  - `description` (text)
  - `is_featured` (boolean, default false)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. `site_events`
  Junction table linking events to specific sites
  - `id` (uuid, primary key)
  - `site_id` (uuid, references sites, not null)
  - `event_id` (uuid, references sports_events, not null)
  - `is_visible` (boolean, default true)
  - `created_at` (timestamptz)

  ### 7. `brand_schemes`
  Branding configurations for sites
  - `id` (uuid, primary key)
  - `company_id` (uuid, references companies, not null)
  - `name` (text, not null)
  - `primary_color` (text)
  - `secondary_color` (text)
  - `logo_url` (text)
  - `is_default` (boolean, default false)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. `site_brand_schemes`
  Links brand schemes to sites
  - `id` (uuid, primary key)
  - `site_id` (uuid, references sites, not null)
  - `brand_scheme_id` (uuid, references brand_schemes, not null)
  - `created_at` (timestamptz)

  ## Security

  ### Row Level Security (RLS)
  All tables have RLS enabled with restrictive policies:

  1. **profiles**: Users can view their own profile; admins can view company users
  2. **companies**: Super admins can view all; admins can view their own company
  3. **sites**: Company admins and assigned users can view their company's sites
  4. **channels**: Company users can view their company's channels
  5. **sports_events**: Company users can view their company's events
  6. **site_events**: Users can view events for their assigned site
  7. **brand_schemes**: Company users can view their company's brand schemes
  8. **site_brand_schemes**: Company users can view their company's site branding

  ## Notes
  - All timestamps use `timestamptz` with default `now()`
  - Foreign keys use CASCADE on delete where appropriate
  - Indexes added for common query patterns
  - Super admins bypass most RLS restrictions via policies
*/

-- Create companies table first (no dependencies)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  max_sites integer DEFAULT 5 NOT NULL,
  contact_email text,
  contact_phone text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  company_id uuid REFERENCES companies ON DELETE SET NULL,
  site_id uuid,
  role text DEFAULT 'user' NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
  is_super_admin boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  location text,
  timezone text DEFAULT 'UTC' NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add foreign key for profiles.site_id now that sites exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_site_id_fkey'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_site_id_fkey 
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  logo_url text,
  channel_number text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create sports_events table
CREATE TABLE IF NOT EXISTS sports_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  sport_type text,
  league text,
  home_team text,
  away_team text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  channel_id uuid REFERENCES channels ON DELETE SET NULL,
  description text,
  is_featured boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create site_events junction table
CREATE TABLE IF NOT EXISTS site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites ON DELETE CASCADE NOT NULL,
  event_id uuid REFERENCES sports_events ON DELETE CASCADE NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(site_id, event_id)
);

-- Create brand_schemes table
CREATE TABLE IF NOT EXISTS brand_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  primary_color text,
  secondary_color text,
  logo_url text,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create site_brand_schemes junction table
CREATE TABLE IF NOT EXISTS site_brand_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES sites ON DELETE CASCADE NOT NULL,
  brand_scheme_id uuid REFERENCES brand_schemes ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(site_id, brand_scheme_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_site_id ON profiles(site_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_sites_company_id ON sites(company_id);
CREATE INDEX IF NOT EXISTS idx_channels_company_id ON channels(company_id);
CREATE INDEX IF NOT EXISTS idx_sports_events_company_id ON sports_events(company_id);
CREATE INDEX IF NOT EXISTS idx_sports_events_start_time ON sports_events(start_time);
CREATE INDEX IF NOT EXISTS idx_site_events_site_id ON site_events(site_id);
CREATE INDEX IF NOT EXISTS idx_site_events_event_id ON site_events(event_id);
CREATE INDEX IF NOT EXISTS idx_brand_schemes_company_id ON brand_schemes(company_id);

-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_brand_schemes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view company users"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can update company users"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for companies
CREATE POLICY "Super admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Admins can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Super admins can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Super admins can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true)
  WITH CHECK ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true);

CREATE POLICY "Super admins can delete companies"
  ON companies FOR DELETE
  TO authenticated
  USING ((SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true);

-- RLS Policies for sites
CREATE POLICY "Company users can view their sites"
  ON sites FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can insert sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can update sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can delete sites"
  ON sites FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- RLS Policies for channels
CREATE POLICY "Company users can view channels"
  ON channels FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage channels"
  ON channels FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- RLS Policies for sports_events
CREATE POLICY "Company users can view events"
  ON sports_events FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage events"
  ON sports_events FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- RLS Policies for site_events
CREATE POLICY "Users can view site events"
  ON site_events FOR SELECT
  TO authenticated
  USING (
    site_id IN (
      SELECT site_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM sites WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage site events"
  ON site_events FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT id FROM sites WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
      )
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
      )
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- RLS Policies for brand_schemes
CREATE POLICY "Company users can view brand schemes"
  ON brand_schemes FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage brand schemes"
  ON brand_schemes FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- RLS Policies for site_brand_schemes
CREATE POLICY "Users can view site brand schemes"
  ON site_brand_schemes FOR SELECT
  TO authenticated
  USING (
    site_id IN (
      SELECT site_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM sites WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

CREATE POLICY "Admins can manage site brand schemes"
  ON site_brand_schemes FOR ALL
  TO authenticated
  USING (
    site_id IN (
      SELECT id FROM sites WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
      )
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  )
  WITH CHECK (
    site_id IN (
      SELECT id FROM sites WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true)
      )
    )
    OR (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sports_events_updated_at BEFORE UPDATE ON sports_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_schemes_updated_at BEFORE UPDATE ON brand_schemes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();