import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertModal } from '../alerts/AlertModal';
import { useStore } from '../../context/StoreContext';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Store Safety Operations Dashboard', subtitle: 'Real-time retail computer vision intelligence overview' },
  '/dashboard': { title: 'Store Safety Operations Dashboard', subtitle: 'Real-time retail computer vision intelligence overview' },
  '/live-monitoring': { title: 'Live CCTV Monitoring & Stream Overlay', subtitle: 'CCTV video analysis with bounding boxes & safety zones' },
  '/alerts': { title: 'Alerts & Incident Management', subtitle: 'Audit log, severity classification & alert lifecycle resolution' },
  '/cameras': { title: 'Camera & Zone Infrastructure', subtitle: 'Camera streams, coverage maps & zone occupancy thresholds' },
  '/analytics': { title: 'Operations & Safety Analytics', subtitle: 'Historical incident trends, crowding patterns & zone metrics' },
  '/settings': { title: 'System & Engine Settings', subtitle: 'FastAPI backend endpoints, polling intervals & diagnostics' },
};

export const Layout: React.FC = () => {
  const location = useLocation();
  const { selectedEvent, setSelectedEvent, updateEventStatus } = useStore();

  const currentRoute = routeTitles[location.pathname] || {
    title: 'Store Safety Operations',
    subtitle: 'Enterprise Retail Intelligence',
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <Header title={currentRoute.title} subtitle={currentRoute.subtitle} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Global Alert Details Modal */}
      {selectedEvent && (
        <AlertModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdateStatus={updateEventStatus}
        />
      )}
    </div>
  );
};
