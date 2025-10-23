/*
  # Create Sports Data Sources Table

  ## Purpose
  This table stores URLs of websites that contain sports schedule data.
  Users can add trusted sources, and the system will use these for all future sports event searches.

  ## Tables Created
  
  ### `sports_data_sources`
  Stores URLs and metadata for sports schedule websites
  
  **Columns:**
  - `id` (uuid, primary key) - Unique identifier
  - `company_id` (uuid, foreign key) - Links to companies table
  - `url` (text, required) - The website URL to scrape
  - `name` (text, required) - Friendly name for the source
  - `description` (text, optional) - Description of what this source provides
  - `is_active` (boolean) - Whether this source should be used in searches
  - `last_scraped_at` (timestamptz) - When this source was last used
  - `scrape_count` (integer) - How many times this source has been scraped
  - `created_at` (timestamptz) - When the source was added
  - `updated_at` (timestamptz) - Last modification time

  ## Security
  - RLS enabled on the table
  - Admins can manage sources for their company
  - Super admins can manage all sources
  - Company users can view their company's sources
  - Public cannot access this data (scraping is backend-only)
*/

-- Create the sports_data_sources table
CREATE TABLE IF NOT EXISTS sports_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  last_scraped_at timestamptz,
  scrape_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE sports_data_sources ENABLE ROW LEVEL SECURITY;

-- Admins can manage sources for their company
CREATE POLICY "Admins can insert sources"
  ON sports_data_sources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR is_super_admin = true)
    )
    OR (
      SELECT is_super_admin FROM profiles WHERE id = auth.uid()
    ) = true
  );

CREATE POLICY "Admins can update sources"
  ON sports_data_sources
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR is_super_admin = true)
    )
    OR (
      SELECT is_super_admin FROM profiles WHERE id = auth.uid()
    ) = true
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR is_super_admin = true)
    )
    OR (
      SELECT is_super_admin FROM profiles WHERE id = auth.uid()
    ) = true
  );

CREATE POLICY "Admins can delete sources"
  ON sports_data_sources
  FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR is_super_admin = true)
    )
    OR (
      SELECT is_super_admin FROM profiles WHERE id = auth.uid()
    ) = true
  );

-- Company users can view their sources
CREATE POLICY "Company users can view sources"
  ON sports_data_sources
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR (
      SELECT is_super_admin FROM profiles WHERE id = auth.uid()
    ) = true
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sports_data_sources_company_id 
  ON sports_data_sources(company_id);

CREATE INDEX IF NOT EXISTS idx_sports_data_sources_is_active 
  ON sports_data_sources(company_id, is_active);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sports_data_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sports_data_sources_updated_at
  BEFORE UPDATE ON sports_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_sports_data_sources_updated_at();