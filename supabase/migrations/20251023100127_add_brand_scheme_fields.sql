/*
  # Add Missing Brand Scheme Fields

  1. Changes to `brand_schemes` table
    - Add `background_start` (text) - Starting color for gradient background
    - Add `background_end` (text) - Ending color for gradient background
    - Add `text_color` (text) - Text color for display
    - Add `border_color` (text) - Border/accent color for display
    - Add `description` (text) - Optional description of the brand scheme

  2. Security
    - No changes to RLS policies needed (already configured)
*/

-- Add new fields to brand_schemes table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_schemes' AND column_name = 'background_start'
  ) THEN
    ALTER TABLE brand_schemes ADD COLUMN background_start text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_schemes' AND column_name = 'background_end'
  ) THEN
    ALTER TABLE brand_schemes ADD COLUMN background_end text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_schemes' AND column_name = 'text_color'
  ) THEN
    ALTER TABLE brand_schemes ADD COLUMN text_color text DEFAULT '#ffffff';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_schemes' AND column_name = 'border_color'
  ) THEN
    ALTER TABLE brand_schemes ADD COLUMN border_color text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brand_schemes' AND column_name = 'description'
  ) THEN
    ALTER TABLE brand_schemes ADD COLUMN description text;
  END IF;
END $$;