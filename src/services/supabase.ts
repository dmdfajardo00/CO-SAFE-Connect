import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables or fallback to hardcoded values
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://naadaumxaglqzucacexb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWRhdW14YWdscXp1Y2FjZXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMzYwMzcsImV4cCI6MjA3NjYxMjAzN30.0ie3FXkPOaZxQfsx4c4GIBo9aMwj_RRSWQOdPRJ0bc';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database types matching schema
export interface Database {
  public: {
    Tables: {
      devices: {
        Row: {
          device_id: string;
          device_name: string | null;
          vehicle_model: string | null;
          last_active: string | null;
          created_at: string | null;
        };
        Insert: {
          device_id: string;
          device_name?: string | null;
          vehicle_model?: string | null;
          last_active?: string | null;
          created_at?: string | null;
        };
        Update: {
          device_id?: string;
          device_name?: string | null;
          vehicle_model?: string | null;
          last_active?: string | null;
          created_at?: string | null;
        };
      };
      sessions: {
        Row: {
          session_id: string;
          device_id: string;
          user_id: string | null;
          started_at: string | null;
          ended_at: string | null;
          notes: string | null;
        };
        Insert: {
          session_id?: string;
          device_id: string;
          user_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          notes?: string | null;
        };
        Update: {
          session_id?: string;
          device_id?: string;
          user_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          notes?: string | null;
        };
      };
      co_readings: {
        Row: {
          id: number;
          session_id: string | null;
          device_id: string;
          co_level: number;
          status: 'safe' | 'warning' | 'critical' | null;
          mosfet_status: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          session_id?: string | null;
          device_id: string;
          co_level: number;
          status?: 'safe' | 'warning' | 'critical' | null;
          mosfet_status?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          session_id?: string | null;
          device_id?: string;
          co_level?: number;
          status?: 'safe' | 'warning' | 'critical' | null;
          mosfet_status?: boolean | null;
          created_at?: string | null;
        };
      };
    };
  };
}

// Typed Supabase client
export type TypedSupabaseClient = ReturnType<typeof createClient<Database>>;

// Helper functions for common queries

/**
 * Fetch latest CO readings for a device
 */
export async function getLatestReadings(deviceId: string, limit = 50) {
  const { data, error } = await supabase
    .from('co_readings')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Fetch all sessions
 */
export async function getSessions(deviceId?: string) {
  let query = supabase
    .from('sessions')
    .select('*')
    .order('started_at', { ascending: false });

  if (deviceId) {
    query = query.eq('device_id', deviceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Fetch CO readings for a specific session
 */
export async function getSessionReadings(sessionId: string) {
  const { data, error } = await supabase
    .from('co_readings')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get session statistics
 */
export async function getSessionStats(sessionId: string) {
  const { data, error } = await supabase
    .rpc('get_session_stats', { p_session_id: sessionId });

  if (error) throw error;
  return data;
}

/**
 * Subscribe to real-time CO readings
 */
export function subscribeToReadings(
  deviceId: string,
  callback: (reading: Database['public']['Tables']['co_readings']['Row']) => void
) {
  return supabase
    .channel(`co_readings:${deviceId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'co_readings',
        filter: `device_id=eq.${deviceId}`,
      },
      (payload) => {
        callback(payload.new as Database['public']['Tables']['co_readings']['Row']);
      }
    )
    .subscribe();
}

/**
 * Start a new monitoring session
 */
export async function startSession(deviceId: string, notes?: string) {
  const { data, error } = await supabase
    .rpc('start_session', {
      p_device_id: deviceId,
      p_notes: notes || null,
    });

  if (error) throw error;
  return data;
}

/**
 * End a monitoring session
 */
export async function endSession(sessionId: string) {
  const { data, error } = await supabase
    .rpc('end_session', {
      p_session_id: sessionId,
    });

  if (error) throw error;
  return data;
}
