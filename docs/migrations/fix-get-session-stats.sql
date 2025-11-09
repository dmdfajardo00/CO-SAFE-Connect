-- Migration: Fix get_session_stats function to include mosfet_alarm_count
-- Created: 2025-01-09
-- Description: Updates the get_session_stats RPC function to return mosfet alarm count

-- Drop the existing function
DROP FUNCTION IF EXISTS get_session_stats(UUID);

-- Recreate with mosfet_alarm_count included
CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS TABLE (
    total_readings BIGINT,
    avg_co_level FLOAT,
    max_co_level FLOAT,
    min_co_level FLOAT,
    duration_minutes INTEGER,
    critical_count BIGINT,
    warning_count BIGINT,
    safe_count BIGINT,
    mosfet_alarm_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_readings,
        AVG(cr.co_level)::FLOAT as avg_co_level,
        MAX(cr.co_level)::FLOAT as max_co_level,
        MIN(cr.co_level)::FLOAT as min_co_level,
        EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))::INTEGER / 60 as duration_minutes,
        COUNT(*) FILTER (WHERE cr.status = 'critical')::BIGINT as critical_count,
        COUNT(*) FILTER (WHERE cr.status = 'warning')::BIGINT as warning_count,
        COUNT(*) FILTER (WHERE cr.status = 'safe')::BIGINT as safe_count,
        COUNT(*) FILTER (WHERE cr.mosfet_status = TRUE)::BIGINT as mosfet_alarm_count
    FROM sessions s
    LEFT JOIN co_readings cr ON cr.session_id = s.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.started_at, s.ended_at;
END;
$$ LANGUAGE plpgsql;
