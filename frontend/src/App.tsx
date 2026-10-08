import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { Alerts } from './pages/Alerts';
import { Cameras } from './pages/Cameras';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <StoreProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="live-monitoring" element={<LiveMonitoring />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </StoreProvider>
  );
};

export default App;
