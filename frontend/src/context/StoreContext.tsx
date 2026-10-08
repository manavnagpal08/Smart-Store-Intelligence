import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StoreEvent, Camera, Zone, SystemHealth, EventStatus } from '../types';
import { apiService } from '../services/api';

interface StoreContextType {
  events: StoreEvent[];
  activeEvents: StoreEvent[];
  cameras: Camera[];
  zones: Zone[];
  health: SystemHealth | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshInterval: number; // in milliseconds (0 means manual)
  setRefreshInterval: (intervalMs: number) => void;
  refreshData: () => Promise<void>;
  updateEventStatus: (eventId: string, status: EventStatus, changedBy?: string) => Promise<boolean>;
  selectedEvent: StoreEvent | null;
  setSelectedEvent: (event: StoreEvent | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_CAMERAS: Camera[] = [
  {
    camera_id: 'CAM-01',
    camera_name: 'North Entrance & Aisle A',
    location: 'North Entry Hallway',
    status: 'ACTIVE',
    stream_source: 'sample',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    camera_id: 'CAM-02',
    camera_name: 'Cashier & Checkout Quad',
    location: 'Front Checkout Lanes',
    status: 'ACTIVE',
    stream_source: 'sample',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    camera_id: 'CAM-03',
    camera_name: 'Grocery & Snack Aisles',
    location: 'Center Merchandise Rows',
    status: 'ACTIVE',
    stream_source: 'sample',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    camera_id: 'CAM-04',
    camera_name: 'Restricted Back Office / Vault',
    location: 'Staff Storage & Vault Corridor',
    status: 'ACTIVE',
    stream_source: 'sample',
    created_at: '2026-01-01T00:00:00Z',
  },
];

const DEFAULT_ZONES: Zone[] = [
  {
    zone_id: 'ENTRANCE',
    zone_name: 'Store Entrance & Turnstile',
    camera_id: 'CAM-01',
    zone_type: 'ENTRANCE',
    description: 'Store Entrance & Turnstile Entry Zone',
  },
  {
    zone_id: 'AISLE-A',
    zone_name: 'Snacks & Beverages (Aisle A)',
    camera_id: 'CAM-01',
    zone_type: 'AISLE',
    description: 'Snacks & Beverages Main Aisle',
  },
  {
    zone_id: 'CHECKOUT-01',
    zone_name: 'Express Checkout Lane 1',
    camera_id: 'CAM-02',
    zone_type: 'CHECKOUT',
    description: 'Express Cashier Counter 1',
  },
  {
    zone_id: 'STAFF-STORAGE',
    zone_name: 'Restricted Back Office / Vault',
    camera_id: 'CAM-04',
    zone_type: 'RESTRICTED',
    description: 'High-Security Inventory Storage Vault',
  },
];

const DEFAULT_EVENTS: StoreEvent[] = [
  {
    event_id: 'EVT-SYS-101',
    event_type: 'CROWD_DENSITY',
    camera_id: 'CAM-01',
    zone_id: 'ENTRANCE',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    severity: 'MEDIUM',
    status: 'RESOLVED',
    description: 'Entrance gate footfall elevated (6 persons). Automated flow regulation engaged.',
    people_count: 6,
    resolved_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    event_id: 'EVT-SYS-102',
    event_type: 'QUEUE_CONGESTION',
    camera_id: 'CAM-02',
    zone_id: 'CHECKOUT-01',
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    severity: 'HIGH',
    status: 'ACTIVE',
    description: 'Express Checkout queue exceeded 4 persons. Dynamic cashier paging triggered.',
    people_count: 5,
  }
];

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<StoreEvent[]>(DEFAULT_EVENTS);
  const [activeEvents, setActiveEvents] = useState<StoreEvent[]>(DEFAULT_EVENTS.filter(e => e.status === 'ACTIVE'));
  const [cameras, setCameras] = useState<Camera[]>(DEFAULT_CAMERAS);
  const [zones, setZones] = useState<Zone[]>(DEFAULT_ZONES);
  const [health, setHealth] = useState<SystemHealth | null>({
    status: 'healthy',
    service: 'smart-store-backend',
    database: 'connected',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // default 5s
  const [selectedEvent, setSelectedEvent] = useState<StoreEvent | null>(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [healthData, eventsData, activeEventsData, camerasData, zonesData] = await Promise.allSettled([
        apiService.getHealth(),
        apiService.getEvents({ limit: 100 }),
        apiService.getActiveEvents(50),
        apiService.getCameras(),
        apiService.getZones(),
      ]);

      if (healthData.status === 'fulfilled' && healthData.value && typeof healthData.value === 'object' && 'status' in healthData.value) {
        setHealth(healthData.value);
      }
      if (eventsData.status === 'fulfilled' && Array.isArray(eventsData.value) && eventsData.value.length > 0) {
        setEvents(eventsData.value);
      }
      if (activeEventsData.status === 'fulfilled' && Array.isArray(activeEventsData.value)) {
        setActiveEvents(activeEventsData.value);
      }
      if (camerasData.status === 'fulfilled' && Array.isArray(camerasData.value) && camerasData.value.length > 0) {
        setCameras(camerasData.value);
      }
      if (zonesData.status === 'fulfilled' && Array.isArray(zonesData.value) && zonesData.value.length > 0) {
        setZones(zonesData.value);
      }

      setLastUpdated(new Date());
    } catch {
      // Keep running smoothly on default topology
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const updateEventStatus = async (
    eventId: string,
    status: EventStatus,
    changedBy = 'STORE_MANAGER'
  ): Promise<boolean> => {
    try {
      const updated = await apiService.updateEventStatus(eventId, status, changedBy);
      
      // Update local state immediately for responsive UI
      setEvents(prev => prev.map(e => (e.event_id === eventId ? updated : e)));
      setActiveEvents(prev =>
        status === 'RESOLVED' ? prev.filter(e => e.event_id !== eventId) : prev.map(e => (e.event_id === eventId ? updated : e))
      );
      if (selectedEvent && selectedEvent.event_id === eventId) {
        setSelectedEvent(updated);
      }
      return true;
    } catch (err: any) {
      setError(`Failed to update status: ${err.message || 'Unknown error'}`);
      return false;
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return (
    <StoreContext.Provider
      value={{
        events,
        activeEvents,
        cameras,
        zones,
        health,
        isLoading,
        isRefreshing,
        error,
        lastUpdated,
        refreshInterval,
        setRefreshInterval,
        refreshData: () => fetchData(false),
        updateEventStatus,
        selectedEvent,
        setSelectedEvent,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
