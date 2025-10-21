-- ============================================
-- CO-SAFE Database Schema
-- PostgreSQL + Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Users table (optional for multi-user support)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table
CREATE TABLE devices (
    device_id TEXT PRIMARY KEY,
    device_name TEXT,
    vehicle_model TEXT,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    notes TEXT
);

-- CO Readings table (main sensor data)
CREATE TABLE co_readings (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    co_level FLOAT NOT NULL,
    status TEXT CHECK (status IN ('safe', 'warning', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device Commands table (app -> hardware control)
CREATE TABLE device_commands (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    executed BOOLEAN DEFAULT FALSE,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Indexes for co_readings (most queried table)
CREATE INDEX idx_co_readings_session ON co_readings(session_id);
CREATE INDEX idx_co_readings_device ON co_readings(device_id);
CREATE INDEX idx_co_readings_created_at ON co_readings(created_at DESC);
CREATE INDEX idx_co_readings_device_created ON co_readings(device_id, created_at DESC);

-- Indexes for sessions
CREATE INDEX idx_sessions_device ON sessions(device_id);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);

-- Indexes for device_commands
CREATE INDEX idx_commands_device ON device_commands(device_id);
CREATE INDEX idx_commands_executed ON device_commands(executed, created_at DESC);
CREATE INDEX idx_commands_device_pending ON device_commands(device_id, executed) WHERE executed = FALSE;

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Devices policies (allow public read for demo, restrict write)
CREATE POLICY "Anyone can view devices"
    ON devices FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Devices can insert themselves"
    ON devices FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Devices can update themselves"
    ON devices FOR UPDATE
    TO anon, authenticated
    USING (true);

-- Sessions policies
CREATE POLICY "Anyone can view sessions"
    ON sessions FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Anyone can create sessions"
    ON sessions FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
    ON sessions FOR UPDATE
    TO anon, authenticated
    USING (true);

-- CO Readings policies (main sensor data)
CREATE POLICY "Anyone can view co_readings"
    ON co_readings FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Devices can insert readings"
    ON co_readings FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Device Commands policies
CREATE POLICY "Anyone can view commands"
    ON device_commands FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "Anyone can insert commands"
    ON device_commands FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Devices can update command status"
    ON device_commands FOR UPDATE
    TO anon, authenticated
    USING (true);

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Function: Update device last_active timestamp
CREATE OR REPLACE FUNCTION update_device_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE devices
    SET last_active = NEW.created_at
    WHERE device_id = NEW.device_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update device last_active on new reading
CREATE TRIGGER trigger_update_device_last_active
    AFTER INSERT ON co_readings
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_active();

-- Function: Auto-determine CO status based on level
CREATE OR REPLACE FUNCTION determine_co_status(co_level FLOAT)
RETURNS TEXT AS $$
BEGIN
    IF co_level >= 50 THEN
        RETURN 'critical';
    ELSIF co_level >= 25 THEN
        RETURN 'warning';
    ELSE
        RETURN 'safe';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Get current session for device
CREATE OR REPLACE FUNCTION get_current_session(p_device_id TEXT)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    SELECT session_id INTO v_session_id
    FROM sessions
    WHERE device_id = p_device_id
      AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Start new monitoring session
CREATE OR REPLACE FUNCTION start_session(
    p_device_id TEXT,
    p_user_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- End any existing open sessions for this device
    UPDATE sessions
    SET ended_at = NOW()
    WHERE device_id = p_device_id
      AND ended_at IS NULL;
    
    -- Create new session
    INSERT INTO sessions (device_id, user_id, notes)
    VALUES (p_device_id, p_user_id, p_notes)
    RETURNING session_id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function: End monitoring session
CREATE OR REPLACE FUNCTION end_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE sessions
    SET ended_at = NOW()
    WHERE session_id = p_session_id
      AND ended_at IS NULL;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Get pending commands for device
CREATE OR REPLACE FUNCTION get_pending_commands(p_device_id TEXT)
RETURNS TABLE (
    id BIGINT,
    command TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT dc.id, dc.command, dc.created_at
    FROM device_commands dc
    WHERE dc.device_id = p_device_id
      AND dc.executed = FALSE
    ORDER BY dc.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark command as executed
CREATE OR REPLACE FUNCTION mark_command_executed(p_command_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE device_commands
    SET executed = TRUE,
        executed_at = NOW()
    WHERE id = p_command_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Get session statistics
CREATE OR REPLACE FUNCTION get_session_stats(p_session_id UUID)
RETURNS TABLE (
    total_readings BIGINT,
    avg_co_level FLOAT,
    max_co_level FLOAT,
    min_co_level FLOAT,
    duration_minutes INTEGER,
    critical_count BIGINT,
    warning_count BIGINT,
    safe_count BIGINT
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
        COUNT(*) FILTER (WHERE cr.status = 'safe')::BIGINT as safe_count
    FROM sessions s
    LEFT JOIN co_readings cr ON cr.session_id = s.session_id
    WHERE s.session_id = p_session_id
    GROUP BY s.session_id, s.started_at, s.ended_at;
END;
$$ LANGUAGE plpgsql;

-- Function: Clean old commands (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_commands()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM device_commands
    WHERE executed = TRUE
      AND created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. SEED DATA (Optional - for testing)
-- ============================================

-- Insert sample device
INSERT INTO devices (device_id, device_name, vehicle_model)
VALUES ('CO-SAFE-001', 'Main Sensor', 'Toyota Corolla 2020')
ON CONFLICT (device_id) DO NOTHING;

-- ============================================
-- 6. VIEWS (for easier queries)
-- ============================================

-- View: Latest readings per device
CREATE OR REPLACE VIEW latest_readings AS
SELECT DISTINCT ON (device_id)
    device_id,
    co_level,
    status,
    created_at
FROM co_readings
ORDER BY device_id, created_at DESC;

-- View: Active sessions
CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.session_id,
    s.device_id,
    d.device_name,
    s.started_at,
    COUNT(cr.id) as reading_count,
    AVG(cr.co_level) as avg_co_level
FROM sessions s
JOIN devices d ON d.device_id = s.device_id
LEFT JOIN co_readings cr ON cr.session_id = s.session_id
WHERE s.ended_at IS NULL
GROUP BY s.session_id, s.device_id, d.device_name, s.started_at;

-- ============================================
-- SCRIPT COMPLETE
-- ============================================

-- Grant necessary permissions (Supabase handles this automatically)
-- But for reference:
-- GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;