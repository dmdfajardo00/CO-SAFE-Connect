-- ============================================================================
-- Enable Supabase Realtime for device_commands table
-- ============================================================================
-- This adds the device_commands table to the supabase_realtime publication,
-- allowing Arduino to receive INSERT events via WebSocket
-- ============================================================================

-- Add device_commands to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE device_commands;

-- Verify it was added (optional check)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
