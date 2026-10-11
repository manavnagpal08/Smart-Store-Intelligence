export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EventStatus = 'DETECTED' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type EventType =
  | 'CROWD_DENSITY'
  | 'QUEUE_CONGESTION'
  | 'RESTRICTED_AREA_ENTRY'
  | 'RESTRICTED_ENTRY'
  | 'AISLE_OBSTRUCTION'
  | 'WEAPON_DETECTED'
  | 'PHYSICAL_ALTERCATION'
  | 'THEFT_SUSPICIOUS'
  | 'SLIP_AND_FALL'
  | 'UNATTENDED_OBJECT'
  | 'EVIDENCE_SNAPSHOT';

export interface EventHistoryItem {
  history_id: number;
  event_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
  changed_by: string;
}

export interface StoreEvent {
  event_id: string;
  event_type: EventType | string;
  camera_id: string;
  zone_id?: string;
  track_id?: string | null;
  timestamp: string;
  severity: EventSeverity;
  status: EventStatus;
  description?: string;
  people_count?: number | null;
  snapshot_url?: string | null;
  snapshot_base64?: string | null;
  details?: {
    start_frame?: number;
    last_frame?: number;
    duration_frames?: number;
    snapshot_url?: string;
    auto_captured?: boolean;
    confidence?: number;
    weapon_type?: string;
    [key: string]: any;
  };
  resolved_at?: string | null;
  created_at?: string;
  updated_at?: string;
  history?: EventHistoryItem[];
}

export interface Camera {
  camera_id: string;
  camera_name: string;
  location?: string;
  stream_source?: string;
  status?: string;
  created_at?: string;
}

export interface Zone {
  zone_id: string;
  zone_name: string;
  zone_type: 'ENTRANCE' | 'AISLE' | 'CHECKOUT' | 'RESTRICTED' | string;
  camera_id?: string;
  description?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'error';
  service: string;
  database: 'connected' | 'disconnected' | 'degraded' | string;
  java_module?: string;
}

export interface ZoneOccupancy {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  people_count: number;
  status: 'Normal' | 'Moderate' | 'High' | 'Restricted Entry' | 'Congested';
}

export interface GuardUnit {
  id: string;
  name: string;
  badge: string;
  zone_assigned: string;
  status: 'PATROL' | 'RESPONDING' | 'STANDBY' | 'BREAK';
  battery: number;
  last_ping: string;
  assigned_incident_id?: string | null;
  phone: string;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  zone_id: string;
  category: 'OCCUPANCY' | 'DWELL_TIME' | 'WEAPONS' | 'VIOLENCE' | 'AFTER_HOURS';
  threshold_value: number;
  unit: string;
  severity: EventSeverity;
  auto_dispatch_guard: boolean;
  auto_pa_announcement: boolean;
  is_enabled: boolean;
}

export interface ForensicSnapshot {
  id: string;
  dataUrl: string;
  timestamp: string;
  cameraId: string;
  threatType?: string;
  confidence?: number;
  eventId?: string;
  zoneId?: string;
}

