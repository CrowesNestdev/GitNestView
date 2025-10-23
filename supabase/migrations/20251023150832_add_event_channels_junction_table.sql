/*
  # Add event_channels junction table

  ## Overview
  This migration creates a many-to-many relationship between sports_events and channels,
  allowing a single event to be shown on multiple channels.

  ## Changes

  1. New Tables
    - `event_channels`
      - `id` (uuid, primary key)
      - `event_id` (uuid, references sports_events, not null)
      - `channel_id` (uuid, references channels, not null)
      - `created_at` (timestamptz, default now())
      - Unique constraint on (event_id, channel_id)

  2. Data Migration
    - Migrate existing sports_events.channel_id data to event_channels table
    - Keep the channel_id column for backwards compatibility during transition

  3. Security
    - Enable RLS on event_channels table
    - Add policy for company users to view their company's event channel associations

  ## Notes
  - The existing channel_id column in sports_events is kept for backwards compatibility
  - New code should use the event_channels table instead
  - Consider removing channel_id column in a future migration after full transition
*/

-- Create event_channels junction table
CREATE TABLE IF NOT EXISTS event_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES sports_events ON DELETE CASCADE NOT NULL,
  channel_id uuid REFERENCES channels ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(event_id, channel_id)
);

-- Migrate existing data from sports_events.channel_id to event_channels
INSERT INTO event_channels (event_id, channel_id)
SELECT id, channel_id
FROM sports_events
WHERE channel_id IS NOT NULL
ON CONFLICT (event_id, channel_id) DO NOTHING;

-- Enable RLS
ALTER TABLE event_channels ENABLE ROW LEVEL SECURITY;

-- Policy: Company users can view their company's event channel associations
CREATE POLICY "Users can view company event channels"
  ON event_channels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sports_events se
      JOIN profiles p ON p.company_id = se.company_id
      WHERE se.id = event_channels.event_id
      AND p.id = auth.uid()
    )
  );

-- Policy: Company admins can insert event channel associations
CREATE POLICY "Admins can insert event channels"
  ON event_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sports_events se
      JOIN profiles p ON p.company_id = se.company_id
      WHERE se.id = event_channels.event_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Company admins can delete event channel associations
CREATE POLICY "Admins can delete event channels"
  ON event_channels
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sports_events se
      JOIN profiles p ON p.company_id = se.company_id
      WHERE se.id = event_channels.event_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_channels_event_id ON event_channels(event_id);
CREATE INDEX IF NOT EXISTS idx_event_channels_channel_id ON event_channels(channel_id);
