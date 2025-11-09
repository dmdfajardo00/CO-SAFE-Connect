-- ============================================
-- Add MOSFET Status Column to co_readings
-- Matches Sir Francis' Arduino Code Schema
-- ============================================

-- Add mosfet_status column to track alarm/ventilation device state
ALTER TABLE co_readings
ADD COLUMN mosfet_status BOOLEAN DEFAULT FALSE;

-- Add index for mosfet_status (useful for filtering alarm activations)
CREATE INDEX idx_co_readings_mosfet_status ON co_readings(mosfet_status);

-- Composite index for querying alarm events with device and time
CREATE INDEX idx_co_readings_device_mosfet_created ON co_readings(device_id, mosfet_status, created_at DESC)
WHERE mosfet_status = TRUE;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Usage Notes:
-- - mosfet_status tracks when MOSFET activates (Arduino line 98-103)
-- - TRUE = alarm/ventilation ON (CO > 200 ppm threshold)
-- - FALSE = device OFF (normal operation)
-- - Partial index optimizes queries for active alarms only
