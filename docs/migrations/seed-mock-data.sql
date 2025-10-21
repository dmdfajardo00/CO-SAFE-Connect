-- ============================================
-- CO-SAFE Mock Data Seed Script
-- PostgreSQL + Supabase
-- ============================================

-- Insert one test user
INSERT INTO users (id, email, name, created_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'test@cosafe.com',
    'Test Driver',
    NOW() - INTERVAL '30 days'
)
ON CONFLICT (email) DO NOTHING;

-- Insert one device
INSERT INTO devices (device_id, device_name, vehicle_model, last_active, created_at)
VALUES (
    'CO-SAFE-001',
    '2024 Honda Civic',
    'Honda Civic 2024',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '30 days'
)
ON CONFLICT (device_id) DO NOTHING;

-- ============================================
-- Session 1: Recent session with mixed readings
-- ============================================

-- Create Session 1 (Active session from 2 hours ago)
INSERT INTO sessions (session_id, device_id, user_id, started_at, ended_at, notes)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'CO-SAFE-001',
    '550e8400-e29b-41d4-a716-446655440000',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '30 minutes',
    'Morning commute - detected elevated CO levels'
);

-- Insert readings for Session 1 (simulating 2-hour drive with a spike)
-- Safe readings (0-10 ppm)
INSERT INTO co_readings (session_id, device_id, co_level, status, created_at)
SELECT
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'CO-SAFE-001',
    5 + random() * 10,
    'safe',
    NOW() - INTERVAL '2 hours' + (interval '2 minutes' * generate_series)
FROM generate_series(1, 30);

-- Warning spike (25-40 ppm)
INSERT INTO co_readings (session_id, device_id, co_level, status, created_at)
SELECT
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'CO-SAFE-001',
    25 + random() * 15,
    'warning',
    NOW() - INTERVAL '1 hour' + (interval '1 minute' * generate_series)
FROM generate_series(1, 15);

-- Critical spike (50-70 ppm)
INSERT INTO co_readings (session_id, device_id, co_level, status, created_at)
VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CO-SAFE-001', 52.3, 'critical', NOW() - INTERVAL '55 minutes'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CO-SAFE-001', 58.7, 'critical', NOW() - INTERVAL '53 minutes'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CO-SAFE-001', 65.2, 'critical', NOW() - INTERVAL '51 minutes'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'CO-SAFE-001', 61.4, 'critical', NOW() - INTERVAL '49 minutes');

-- Return to safe (5-15 ppm)
INSERT INTO co_readings (session_id, device_id, co_level, status, created_at)
SELECT
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'CO-SAFE-001',
    5 + random() * 10,
    'safe',
    NOW() - INTERVAL '45 minutes' + (interval '1 minute' * generate_series)
FROM generate_series(1, 15);

-- ============================================
-- Session 2: Older session - all safe readings
-- ============================================

-- Create Session 2 (Completed session from 5 days ago)
INSERT INTO sessions (session_id, device_id, user_id, started_at, ended_at, notes)
VALUES (
    'b1ffcc88-8d1b-4ef9-ac7e-7cc0ce491b22',
    'CO-SAFE-001',
    '550e8400-e29b-41d4-a716-446655440000',
    NOW() - INTERVAL '5 days' - INTERVAL '1 hour',
    NOW() - INTERVAL '5 days',
    'Evening drive - all readings normal'
);

-- Insert safe readings for Session 2 (1-hour drive, all safe)
INSERT INTO co_readings (session_id, device_id, co_level, status, created_at)
SELECT
    'b1ffcc88-8d1b-4ef9-ac7e-7cc0ce491b22',
    'CO-SAFE-001',
    3 + random() * 8,
    'safe',
    NOW() - INTERVAL '5 days' - INTERVAL '1 hour' + (interval '2 minutes' * generate_series)
FROM generate_series(1, 30);

-- ============================================
-- Sample Device Commands
-- ============================================

-- Insert some device commands (for testing app -> hardware communication)
INSERT INTO device_commands (device_id, command, executed, executed_at, created_at)
VALUES
    ('CO-SAFE-001', 'START_MONITORING', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours 5 minutes'),
    ('CO-SAFE-001', 'CALIBRATE_SENSOR', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day 1 minute'),
    ('CO-SAFE-001', 'STOP_MONITORING', true, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '35 minutes'),
    ('CO-SAFE-001', 'GET_STATUS', false, NULL, NOW() - INTERVAL '5 minutes');

-- ============================================
-- Verify Data
-- ============================================

-- Show summary
SELECT
    'Users' as table_name,
    COUNT(*)::text as count
FROM users
UNION ALL
SELECT
    'Devices',
    COUNT(*)::text
FROM devices
UNION ALL
SELECT
    'Sessions',
    COUNT(*)::text
FROM sessions
UNION ALL
SELECT
    'CO Readings',
    COUNT(*)::text
FROM co_readings
UNION ALL
SELECT
    'Device Commands',
    COUNT(*)::text
FROM device_commands;

-- Show session stats
SELECT * FROM get_session_stats('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
SELECT * FROM get_session_stats('b1ffcc88-8d1b-4ef9-ac7e-7cc0ce491b22');

-- ============================================
-- SEED COMPLETE
-- ============================================
