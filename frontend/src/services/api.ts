import axios from 'axios';
import { StoreEvent, Camera, Zone, SystemHealth, EventStatus } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => {
    // If Vercel rewrote /api to index.html, response.data will be HTML text
    if (typeof response.data === 'string' && (response.data.includes('<!doctype html') || response.data.includes('<html') || response.data.includes('<head>'))) {
      return Promise.reject(new Error('API returned HTML document instead of JSON (backend endpoint unavailable)'));
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export const apiService = {
  // Health
  async getHealth(): Promise<SystemHealth> {
    const response = await apiClient.get<SystemHealth>('/health');
    return response.data;
  },

  // Events
  async getEvents(params?: {
    status?: string;
    severity?: string;
    event_type?: string;
    camera_id?: string;
    zone_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<StoreEvent[]> {
    const response = await apiClient.get<StoreEvent[]>('/events', { params });
    return response.data;
  },

  async getActiveEvents(limit: number = 100): Promise<StoreEvent[]> {
    const response = await apiClient.get<StoreEvent[]>('/events/active', { params: { limit } });
    return response.data;
  },

  async getEvent(eventId: string): Promise<StoreEvent> {
    const response = await apiClient.get<StoreEvent>(`/events/${encodeURIComponent(eventId)}`);
    return response.data;
  },

  async updateEventStatus(
    eventId: string,
    status: EventStatus,
    changedBy: string = 'STORE_MANAGER'
  ): Promise<StoreEvent> {
    const response = await apiClient.patch<StoreEvent>(`/events/${encodeURIComponent(eventId)}/status`, {
      status,
      changed_by: changedBy,
    });
    return response.data;
  },

  async createEvent(eventData: Partial<StoreEvent>): Promise<StoreEvent> {
    const response = await apiClient.post<StoreEvent>('/events', eventData);
    return response.data;
  },

  // Cameras
  async getCameras(status?: string): Promise<Camera[]> {
    const response = await apiClient.get<Camera[]>('/cameras', { params: { status } });
    return response.data;
  },

  async getCamera(cameraId: string): Promise<Camera> {
    const response = await apiClient.get<Camera>(`/cameras/${encodeURIComponent(cameraId)}`);
    return response.data;
  },

  // Zones
  async getZones(params?: { camera_id?: string; zone_type?: string }): Promise<Zone[]> {
    const response = await apiClient.get<Zone[]>('/zones', { params });
    return response.data;
  },

  async getZone(zoneId: string): Promise<Zone> {
    const response = await apiClient.get<Zone>(`/zones/${encodeURIComponent(zoneId)}`);
    return response.data;
  },

  // Video Streaming & Webcam
  getVideoStreamUrl(cameraId: string, source: string = 'sample', showZones: boolean = true, showBBoxes: boolean = true): string {
    const base = API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin + API_BASE_URL;
    return `${base}/video/stream/${encodeURIComponent(cameraId)}?source=${encodeURIComponent(source)}&show_zones=${showZones}&show_bboxes=${showBBoxes}&t=${Date.now()}`;
  },

  async getVideoSources(): Promise<{ sources: Array<{ id: string; name: string; source: string; type: string; is_default: boolean; description: string }> }> {
    const response = await apiClient.get('/video/sources');
    return response.data;
  },

  async processBrowserFrame(payload: {
    image: string;
    camera_id?: string;
    show_zones?: boolean;
    show_bboxes?: boolean;
  }): Promise<{
    camera_id: string;
    timestamp: string;
    people_count: number;
    tracks: Array<{ track_id: string; bbox: number[]; confidence: number; center: number[]; zone_id?: string }>;
    weapons?: Array<{ threat_type: string; threat_label: string; bbox: number[]; confidence: number; center: number[] }>;
    abandoned_objects?: Array<{ object_type: string; bbox: number[]; confidence: number; center: number[] }>;
    abnormal_events?: Array<any>;
    threat_count?: number;
    zone_counts: Record<string, number>;
    frame_width?: number;
    frame_height?: number;
    annotated_image?: string;
  }> {
    const response = await apiClient.post('/video/process_browser_frame', payload);
    return response.data;
  }
};
