export type UserRole = "admin" | "safety_officer" | "fleet_manager" | "viewer";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export type DriverStatus = "active" | "inactive" | "suspended";

export interface Driver {
  id: number;
  driver_code: string;
  full_name: string;
  license_number: string;
  status: DriverStatus;
  phone?: string;
  email?: string;
  avatar_url?: string;
  safety_score: number;
  total_trips: number;
  total_hours: number;
  created_at: string;
  updated_at: string;
  embeddings_count?: number;
}

export type SessionStatus = "active" | "completed" | "aborted";

export interface DrivingSession {
  id: number;
  session_id: string;
  driver_id?: number;
  vehicle_id?: number;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  total_events: number;
  high_risk_events: number;
  avg_risk_score: number;
  max_risk_score: number;
  safety_rating: string;
  status: SessionStatus;
  notes?: string;
  driver?: Driver;
  events?: DetectionEvent[];
  alerts?: AlertItem[];
  risk_scores?: RiskScoreItem[];
}

export type EventSeverity = "info" | "warning" | "high" | "critical";

export type EventType =
  | "driver_recognized"
  | "unknown_driver"
  | "face_lost"
  | "multiple_faces"
  | "eyes_closing"
  | "prolonged_eye_closure"
  | "drowsiness"
  | "yawning"
  | "head_distraction"
  | "phone_detected"
  | "phone_usage"
  | "attention_restored";

export interface DetectionEvent {
  id: number;
  session_id: number;
  driver_id?: number;
  event_type: EventType;
  severity: EventSeverity;
  confidence: number;
  duration_seconds: number;
  start_time: string;
  end_time?: string;
  details?: Record<string, any>;
}

export interface AlertItem {
  id: number;
  session_id: number;
  event_id?: number;
  alert_type: string;
  severity: EventSeverity;
  title: string;
  message: string;
  sound_alert: boolean;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
}

export interface RiskScoreItem {
  id?: number;
  session_id?: number;
  timestamp: string;
  overall_risk: number;
  category: "low" | "moderate" | "high" | "critical";
  contributors: Array<{
    type: string;
    weight: number;
    contribution_points: number;
  }>;
}

export interface TelemetryFrame {
  type: string;
  mode: string;
  timestamp: number;
  frame_index: number;
  driver: {
    id: number | null;
    name: string;
    code: string | null;
    confidence: number;
    is_authorized: boolean;
    status: string;
  };
  attention_state: string;
  drowsiness_state: string;
  yawn_state: string;
  phone_state: string;
  risk: {
    score: number;
    category: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    contributors: Array<{
      type: string;
      weight: number;
      contribution_points: number;
    }>;
  };
  telemetry: {
    ear: number;
    mar: number;
    head_pose: {
      pitch: number;
      yaw: number;
      roll: number;
      direction: string;
    };
  };
  boxes: {
    face: { x: number; y: number; w: number; h: number } | null;
  };
  system: {
    status: string;
    fps: number;
    latency_ms: number;
  };
  events: Array<any>;
  alerts: Array<any>;
}

export interface OverviewAnalytics {
  overview: {
    total_drivers: number;
    active_drivers: number;
    total_sessions: number;
    total_driving_hours: number;
    current_active_sessions: number;
    total_safety_events: number;
    high_risk_events: number;
    average_risk_score: number;
    safety_trend_percentage: number;
  };
  event_distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  risk_trend: Array<{
    timestamp: string;
    risk_score: number;
    session_id?: string;
  }>;
  driver_rankings: Array<{
    id: number;
    driver_code: string;
    full_name: string;
    safety_score: number;
    total_events: number;
    rating: string;
  }>;
  drowsiness_trend: Array<any>;
  distraction_trend: Array<any>;
  phone_use_trend: Array<any>;
}

export interface SafetyReport {
  report_id: string;
  generated_at: string;
  executive_summary: string;
  driver_information: Record<string, any>;
  session_information: Record<string, any>;
  risk_summary: Record<string, any>;
  event_summary: Record<string, any>;
  risk_timeline: Array<{ timestamp: string; risk_score: number; category: string }>;
  drowsiness_analysis: Record<string, any>;
  distraction_analysis: Record<string, any>;
  phone_usage_analysis: Record<string, any>;
  recommendations: string[];
  technical_notes: string;
  download_url?: string;
}

// --- SAFEDRIVE 2.0 ENTERPRISE EXTENSIONS ---

export interface Organization {
  id: number;
  name: string;
  slug: string;
  plan_tier: string;
  is_active: boolean;
  contact_email?: string;
  max_vehicles: number;
  fleets_count?: number;
  vehicles_count?: number;
  created_at: string;
}

export interface Fleet {
  id: number;
  organization_id: number;
  name: string;
  region: string;
  description?: string;
  vehicles_count?: number;
  created_at: string;
}

export interface Vehicle {
  id: number;
  fleet_id: number;
  vehicle_code: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  vin?: string;
  status: "active" | "maintenance" | "inactive";
  mileage: number;
  current_risk_score: number;
  current_speed: number;
  acceleration: number;
  hard_braking: boolean;
  gps_lat: number;
  gps_lng: number;
  heading: number;
  created_at: string;
}

export interface BehavioralProfile {
  drowsiness_index: number;
  distraction_index: number;
  phone_usage_index: number;
  aggressive_driving_index: number;
  attention_level: number;
  fleet_percentile: number;
  risk_history_30d: Array<{ date: string; score: number }>;
  biometric_consent_given: boolean;
  privacy_status: string;
}

export interface ModelRegistryItem {
  id: number;
  name: string;
  display_name: string;
  model_type: string;
  version: string;
  framework: string;
  accuracy: number;
  latency_ms: number;
  fps: number;
  status: "active" | "staging" | "deprecated";
  drift_detected: boolean;
  input_resolution: string;
  total_inferences: number;
  last_updated: string;
}

export interface MLOpsHealth {
  system_status: string;
  total_models: number;
  active_models: number;
  avg_latency_ms: number;
  avg_fps: number;
  drift_alerts: number;
}

export interface PrivacySettings {
  video_retention_days: number;
  telemetry_retention_days: number;
  evidence_retention_days: number;
  store_raw_biometrics: boolean;
  pseudonymize_exports: boolean;
  gdpr_compliance_mode: boolean;
}

export interface CopilotResponse {
  query: string;
  intent: string;
  grounded_summary: string;
  data: any;
  citations_count: number;
}

export interface ExtendedDetectionEvent extends DetectionEvent {
  evidence_frame_url?: string;
  evidence_status?: string;
  evidence_factors?: Record<string, any>;
  risk_contribution?: number;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  model_name?: string;
  model_version?: string;
}

export interface VehicleTelemetry {
  speed_kmh: number;
  acceleration_mps2: number;
  brake_pedal_pct: number;
  hard_braking: boolean;
  steering_angle_deg: number;
  gps_lat: number;
  gps_lng: number;
  heading_deg: number;
}

export interface ExtendedTelemetryFrame extends TelemetryFrame {
  attention_score?: number;
  contributing_factors?: string[];
  vehicle_telemetry?: VehicleTelemetry;
  multi_level_risk?: {
    current_risk: number;
    session_risk: number;
    driver_risk: number;
    fleet_percentile: number;
  };
  evidence_triggered?: boolean;
}
