import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  name: string | null
  created_at: string
}

export interface Device {
  device_id: string
  device_name: string | null
  vehicle_model: string | null
  last_active: string | null
  created_at: string
}

export interface Session {
  session_id: string
  device_id: string
  user_id: string | null
  started_at: string
  ended_at: string | null
  notes: string | null
}

export interface COReading {
  id: number
  session_id: string | null
  device_id: string
  co_level: number
  status: 'safe' | 'warning' | 'critical'
  created_at: string
}
