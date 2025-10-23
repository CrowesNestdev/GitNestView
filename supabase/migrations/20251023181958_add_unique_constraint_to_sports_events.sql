/*
  # Add unique constraint to prevent duplicate sports events

  1. Changes
    - Remove existing duplicate events before adding constraint
    - Add unique constraint on (company_id, title, start_time, home_team, away_team)
    - This ensures the same event cannot be added multiple times
  
  2. Notes
    - Keeps only the oldest record for each duplicate set
    - The constraint will prevent future duplicates at the database level
*/

-- First, delete duplicates keeping only the oldest record for each unique combination
DELETE FROM sports_events
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM sports_events
  GROUP BY company_id, title, start_time, home_team, away_team
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE sports_events
ADD CONSTRAINT sports_events_unique_event 
UNIQUE (company_id, title, start_time, home_team, away_team);