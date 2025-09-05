// CO-SAFE Connect Type Definitions

export interface COReading {
  timestamp: number
  value: number // ppm
  status: 'safe' | 'warning' | 'critical'
}

export interface DeviceStatus {
  connected: boolean
  battery: number | null // percentage
  filterHealth: number // percentage 
  lastUpdate: number | null // timestamp
  deviceId?: string
  name?: string
}

export interface AlertThresholds {
  warning: number // ppm
  critical: number // ppm
}

export interface COAlert {
  id: string
  timestamp: number
  level: 'info' | 'warning' | 'critical' | 'emergency'
  title: string
  message?: string
  acknowledged?: boolean
  deviceId?: string
}

export interface AppSettings {
  audibleAlarms: boolean
  emergencyContact: string
  units: 'ppm' // Future: could support other units
  thresholds: AlertThresholds
  muteAlarms: boolean
  darkMode?: boolean
  notifications: boolean
}

export interface HistoryDataPoint {
  timestamp: number
  value: number
}

export interface ChartViewport {
  startTime: number
  endTime: number
  zoomLevel: number
}

export interface AppState {
  // Device & connection
  device: DeviceStatus
  
  // Current readings
  currentReading: COReading | null
  
  // Historical data
  history: HistoryDataPoint[]
  
  // Alerts
  alerts: COAlert[]
  activeAlerts: COAlert[]
  
  // Settings
  settings: AppSettings
  
  // UI state
  activeTab: 'dashboard' | 'alerts' | 'analytics' | 'settings'
  chartViewport: ChartViewport
  emergencyBannerVisible: boolean
  
  // App state
  isSimulating: boolean
  isOnline: boolean
  lastSyncTime: number | null
}

export interface GaugeProps {
  value: number
  min?: number
  max?: number
  thresholds: AlertThresholds
  size?: number
  animated?: boolean
}

export interface ChartProps {
  data: HistoryDataPoint[]
  viewport?: ChartViewport
  thresholds: AlertThresholds
  width?: number
  height?: number
  interactive?: boolean
  className?: string
}

// Component Props Types
export interface COGaugeProps {
  reading: COReading | null
  thresholds: AlertThresholds
  className?: string
}

export interface AlertBannerProps {
  alert: COAlert | null
  onMute: () => void
  onCall: () => void
  visible: boolean
}

export interface StatusPillProps {
  connected: boolean
  status: string
  className?: string
}

export interface DeviceCardProps {
  device: DeviceStatus
  onConnect: () => void
  onCalibrate: () => void
  onDisconnect: () => void
}

export interface SettingsFormProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
  onReset: () => void
}

export interface TabBarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

// Action Types for State Management
export type COSafeAction =
  | { type: 'UPDATE_READING'; payload: COReading }
  | { type: 'ADD_ALERT'; payload: COAlert }
  | { type: 'ACKNOWLEDGE_ALERT'; payload: string }
  | { type: 'UPDATE_DEVICE_STATUS'; payload: Partial<DeviceStatus> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'TOGGLE_SIMULATION'; payload: boolean }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'EXPORT_DATA' }
  | { type: 'SET_CHART_VIEWPORT'; payload: ChartViewport }
  | { type: 'SET_EMERGENCY_BANNER'; payload: boolean }
  | { type: 'MUTE_ALARMS'; payload: boolean }

// Utility Types
export type COStatus = 'safe' | 'warning' | 'critical'
export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency'
export type TabName = 'dashboard' | 'alerts' | 'analytics' | 'settings'

// Constants
export const CO_THRESHOLDS = {
  DEFAULT_WARNING: 25,
  DEFAULT_CRITICAL: 50,
  MIN_WARNING: 10,
  MAX_WARNING: 50,
  MIN_CRITICAL: 30,
  MAX_CRITICAL: 100,
} as const

export const CHART_CONFIG = {
  MAX_HISTORY_POINTS: 5000,
  UPDATE_INTERVAL: 1500, // milliseconds
  CHART_HEIGHT: 400,
  CHART_ASPECT_RATIO: 16 / 9,
} as const

export const DEVICE_CONFIG = {
  CONNECTION_TIMEOUT: 10000, // milliseconds
  BATTERY_LOW_THRESHOLD: 20, // percentage
  FILTER_REPLACE_THRESHOLD: 10, // percentage
} as const