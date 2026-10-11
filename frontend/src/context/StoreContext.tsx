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

// Keep legacy, low-confidence model outputs in the audit database without
// presenting them as operational incidents under the current production policy.
const meetsOperationalConfidencePolicy = (event: StoreEvent): boolean => {
  if (event.event_type === 'SLIP_AND_FALL') {
    return event.details?.transition_verified === true;
  }
  if (event.event_type !== 'WEAPON_DETECTED') return true;
  const confidence = event.details?.confidence;
  const threatType = event.details?.threat_type;
  const supportedThreatTypes = new Set(['KNIFE', 'SCISSORS', 'BAT']);
  return (
    typeof confidence === 'number' &&
    confidence >= 0.45 &&
    typeof threatType === 'string' &&
    supportedThreatTypes.has(threatType)
  );
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [activeEvents, setActiveEvents] = useState<StoreEvent[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(() => {
    const saved = window.localStorage.getItem('smartstore.refreshInterval');
    const parsed = saved === null ? 5000 : Number(saved);
    return [0, 5000, 15000, 30000, 60000].includes(parsed) ? parsed : 5000;
  });
  const [selectedEvent, setSelectedEvent] = useState<StoreEvent | null>(null);

  const fetchData = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [healthData, eventsData, activeEventsData, camerasData, zonesData] = await Promise.all([
        apiService.getHealth(),
        apiService.getEvents({ limit: 100 }),
        apiService.getActiveEvents(50),
        apiService.getCameras(),
        apiService.getZones(),
      ]);

      setHealth(healthData);
      setEvents(eventsData.filter(meetsOperationalConfidencePolicy));
      setActiveEvents(activeEventsData.filter(meetsOperationalConfidencePolicy));
      setCameras(camerasData);
      setZones(zonesData);
      setLastUpdated(new Date());
    } catch (err: any) {
      setHealth(null);
      setError(err?.response?.data?.detail || err?.message || 'Unable to load live store data.');
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

  useEffect(() => {
    window.localStorage.setItem('smartstore.refreshInterval', String(refreshInterval));
  }, [refreshInterval]);

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
