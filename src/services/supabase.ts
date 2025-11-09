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
          ai_analysis: string | null;
        };
        Insert: {
          session_id?: string;
          device_id: string;
          user_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          notes?: string | null;
          ai_analysis?: string | null;
        };
        Update: {
          session_id?: string;
          device_id?: string;
          user_id?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          notes?: string | null;
          ai_analysis?: string | null;
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
  // RPC functions return arrays, so get the first result
  return data?.[0] || null;
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

/**
 * Update AI analysis for a session
 */
export async function updateSessionAnalysis(sessionId: string, analysis: string) {
  const { data, error } = await supabase
    .from('sessions')
    .update({ ai_analysis: analysis })
    .eq('session_id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Start a monitoring session and send command to hardware
 * Includes error recovery and constraint checking
 */
export async function startMonitoringSession(deviceId: string) {
  // Check for existing active session first
  const existingSession = await getActiveSession(deviceId);
  if (existingSession) {
    throw new Error('DEVICE_IN_USE: Another session is already active on this device. Please stop the existing session first.');
  }

  try {
    // Create new session with heartbeat
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        device_id: deviceId,
        started_at: new Date().toISOString(),
        ended_at: null,
        last_heartbeat: new Date().toISOString()
      })
      .select()
      .single();

    if (sessionError) {
      // Handle specific error types
      if (sessionError.code === '23505') {
        throw new Error('DEVICE_IN_USE: Another session is already active.');
      }
      throw sessionError;
    }

    if (!session) throw new Error('Failed to create session');

    // Send START command to hardware with retry logic
    let commandSent = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      const { error: commandError } = await supabase
        .from('device_commands')
        .insert({
          device_id: deviceId,
          command: `START_SESSION:${session.session_id}`,
          executed: false
        });

      if (!commandError) {
        commandSent = true;
        break;
      }

      console.warn(`Command send attempt ${attempt + 1} failed:`, commandError);

      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }

    if (!commandSent) {
      // Rollback session creation if command failed
      console.error('Rolling back session due to command failure');
      await supabase.from('sessions').delete().eq('session_id', session.session_id);
      throw new Error('COMMAND_FAILED: Failed to send start command to hardware after 3 attempts. Please check your connection.');
    }

    console.log('✅ Monitoring session started:', session.session_id);
    return session;
  } catch (error: any) {
    // Re-throw with enhanced error messages
    if (error.message?.startsWith('DEVICE_IN_USE') || error.message?.startsWith('COMMAND_FAILED')) {
      throw error; // Already formatted
    }
    throw new Error(`Failed to start session: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Stop a monitoring session and send command to hardware
 */
export async function stopMonitoringSession(sessionId: string, deviceId: string) {
  // End the session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .update({
      ended_at: new Date().toISOString()
    })
    .eq('session_id', sessionId)
    .select()
    .single();

  if (sessionError) throw sessionError;

  // Send STOP command to hardware via device_commands
  const { error: commandError } = await supabase
    .from('device_commands')
    .insert({
      device_id: deviceId,
      command: 'STOP_SESSION',
      executed: false
    });

  if (commandError) {
    console.error('Failed to send stop command to hardware:', commandError);
  }

  console.log('✅ Monitoring session stopped:', sessionId);
  return session;
}

/**
 * Get active monitoring session for a device
 */
export async function getActiveSession(deviceId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('device_id', deviceId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Mark a device command as executed
 */
export async function markCommandExecuted(commandId: number) {
  const { error } = await supabase
    .from('device_commands')
    .update({
      executed: true,
      executed_at: new Date().toISOString()
    })
    .eq('id', commandId);

  if (error) throw error;
}

/**
 * Update session heartbeat to keep it alive
 */
export async function updateSessionHeartbeat(sessionId: string) {
  const { error } = await supabase
    .from('sessions')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('session_id', sessionId);

  if (error) {
    console.error('Failed to update heartbeat:', error);
  }
}
