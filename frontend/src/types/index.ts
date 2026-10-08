export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type EventStatus = 'DETECTED' | 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
export type EventType = 'CROWD_DENSITY' | 'QUEUE_CONGESTION' | 'RESTRICTED_AREA_ENTRY' | 'AISLE_OBSTRUCTION';

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
  details?: {
    start_frame?: number;
    last_frame?: number;
    duration_frames?: number;
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
