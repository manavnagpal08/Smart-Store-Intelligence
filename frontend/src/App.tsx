import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { Layout } from './components/layout/Layout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

const Dashboard = lazy(() => import('./pages/Dashboard').then(module => ({ default: module.Dashboard })));
const LiveMonitoring = lazy(() => import('./pages/LiveMonitoring').then(module => ({ default: module.LiveMonitoring })));
const Alerts = lazy(() => import('./pages/Alerts').then(module => ({ default: module.Alerts })));
const EvidenceGallery = lazy(() => import('./pages/EvidenceGallery').then(module => ({ default: module.EvidenceGallery })));
const GuardDispatch = lazy(() => import('./pages/GuardDispatch').then(module => ({ default: module.GuardDispatch })));
const LossPrevention = lazy(() => import('./pages/LossPrevention').then(module => ({ default: module.LossPrevention })));
const Cameras = lazy(() => import('./pages/Cameras').then(module => ({ default: module.Cameras })));
const ZonePolicies = lazy(() => import('./pages/ZonePolicies').then(module => ({ default: module.ZonePolicies })));
const Analytics = lazy(() => import('./pages/Analytics').then(module => ({ default: module.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then(module => ({ default: module.Settings })));
const Landing = lazy(() => import('./pages/Landing').then(module => ({ default: module.Landing })));
const ActivityTimeline = lazy(() => import('./pages/ActivityTimeline').then(module => ({ default: module.ActivityTimeline })));
const SystemStatus = lazy(() => import('./pages/SystemStatus').then(module => ({ default: module.SystemStatus })));

const OperationsApp: React.FC = () => (
  <StoreProvider>
    <Layout />
  </StoreProvider>
);

export const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading application…" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<OperationsApp />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="live-monitoring" element={<LiveMonitoring />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="evidence" element={<EvidenceGallery />} />
          <Route path="dispatch" element={<GuardDispatch />} />
          <Route path="loss-prevention" element={<LossPrevention />} />
          <Route path="cameras" element={<Cameras />} />
          <Route path="zone-policies" element={<ZonePolicies />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="activity" element={<ActivityTimeline />} />
          <Route path="system-status" element={<SystemStatus />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;

