/*
  # Add is_hidden field to sports_events

  1. Changes
    - Add `is_hidden` boolean column to `sports_events` table
    - Default to false (events are visible by default)

  2. Purpose
    - Allow admins to hide events without deleting them
    - Hidden events can be toggled on/off in the calendar view
*/

-- Add is_hidden column to sports_events table
ALTER TABLE sports_events 
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
