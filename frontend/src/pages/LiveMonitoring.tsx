import React, { useState, useEffect, useRef } from 'react';
import {
  Camera as CameraIcon,
  Play,
  Pause,
  Layers,
  Users,
  Laptop,
  Download,
  RefreshCw,
  Globe,
  CheckCircle2,
  AlertCircle,
  ScanLine,
  ShieldAlert,
  Volume2,
  VolumeX,
  Grid,
  Maximize2,
  Image as ImageIcon,
  Trash2,
  X,
  ExternalLink,
  Shield,
  Activity,
  Flame,
  Footprints,
  Mic,
  Volume1,
  Lock,
  Radio,
  FileText,
  Swords,
  Crosshair,
  HeartPulse,
  ShieldCheck,
  AlertTriangle,
  Zap,
  ShoppingBag,
  BookOpen,
  Info,
  Sparkles
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiService } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { VoicePADispatcherModal } from '../components/common/VoicePADispatcherModal';
import { AuditDossierModal } from '../components/modals/AuditDossierModal';
import { formatDateTime, formatEventType } from '../utils/formatters';

interface SavedSnapshot {
  id: string;
  dataUrl: string;
  timestamp: string;
  cameraId: string;
  threatType?: string;
  confidence?: number;
}

interface TrackTrailPoint {
  x: number;
  y: number;
  time: number;
}

export const LiveMonitoring: React.FC = () => {
  const { cameras, events, setSelectedEvent } = useStore();
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-01');
  const [selectedSourceType, setSelectedSourceType] = useState<'browser_direct' | 'webcam' | 'rtsp'>('browser_direct');
  const [customRtspUrl, setCustomRtspUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'single' | 'quad'>('single');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVoiceDispatchEnabled, setIsVoiceDispatchEnabled] = useState<boolean>(true);
  const [isLockdownActive, setIsLockdownActive] = useState<boolean>(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [streamTime, setStreamTime] = useState<string>('');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [detectedPersonsCount, setDetectedPersonsCount] = useState<number>(0);
  const [detectedThreatsCount, setDetectedThreatsCount] = useState<number>(0);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [activeAbnormalAlert, setActiveAbnormalAlert] = useState<string | null>(null);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);
  const [savedSnapshots, setSavedSnapshots] = useState<SavedSnapshot[]>([]);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);

  // Trajectory history: track_id -> array of {x, y, time}
  const trackTrailsRef = useRef<Record<string, TrackTrailPoint[]>>({});
  const lastSpokenThreatRef = useRef<string>('');
  const lastSpeechTimeRef = useRef<number>(0);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamImgRef = useRef<HTMLImageElement>(null);
  const processingIntervalRef = useRef<any>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastThreatBeepTimeRef = useRef<number>(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setStreamTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Security Chime
  const playSecurityChime = () => {
    if (isAudioMuted) return;
    const now = Date.now();
    if (now - lastThreatBeepTimeRef.current < 4000) return; // Cooldown 4s
    lastThreatBeepTimeRef.current = now;

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Double-beep security tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1174, ctx.currentTime + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(587, ctx.currentTime + 0.3);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // Audio not permitted without interaction
    }
  };

  // Web Speech API Voice Dispatcher
  const speakSecurityAnnouncement = (text: string) => {
    if (!isVoiceDispatchEnabled || isAudioMuted) return;
    if (!('speechSynthesis' in window)) return;
    const now = Date.now();
    if (now - lastSpeechTimeRef.current < 5000 && lastSpokenThreatRef.current === text) return;
    lastSpeechTimeRef.current = now;
    lastSpokenThreatRef.current = text;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      // Speech synthesis error
    }
  };

  // Manage Browser Webcam Stream
  useEffect(() => {
    if (selectedSourceType === 'browser_direct') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [selectedSourceType]);

  const startWebcam = async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        await videoElementRef.current.play();
        setIsWebcamActive(true);
        startWebcamAnalysisLoop();
      }
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setWebcamError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser address bar.'
          : 'Could not access webcam hardware. Ensure no other application is using it.'
      );
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    if (videoElementRef.current && videoElementRef.current.srcObject) {
      const tracks = (videoElementRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoElementRef.current.srcObject = null;
    }
    if (overlayCanvasRef.current) {
      const ctx = overlayCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height);
    }
    setIsWebcamActive(false);
    setDetectedPersonsCount(0);
    setDetectedThreatsCount(0);
    setActiveAbnormalAlert(null);
    trackTrailsRef.current = {};
  };

  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState<boolean>(true);
  const autoCaptureEnabledRef = useRef<boolean>(true);
  const [showHardwareGuideModal, setShowHardwareGuideModal] = useState<boolean>(false);
  const lastAutoCaptureTimeRef = useRef<number>(0);
  const showZonesRef = useRef<boolean>(showZones);
  const showBBoxesRef = useRef<boolean>(showBBoxes);
  const showHeatmapRef = useRef<boolean>(showHeatmap);
  const showTrailsRef = useRef<boolean>(showTrails);

  useEffect(() => {
    showZonesRef.current = showZones;
  }, [showZones]);

  useEffect(() => {
    showBBoxesRef.current = showBBoxes;
  }, [showBBoxes]);

  useEffect(() => {
    showHeatmapRef.current = showHeatmap;
  }, [showHeatmap]);

  useEffect(() => {
    showTrailsRef.current = showTrails;
  }, [showTrails]);

  useEffect(() => {
    autoCaptureEnabledRef.current = autoCaptureEnabled;
  }, [autoCaptureEnabled]);

  const captureEvidenceSnapshot = (threatLabel: string = 'PERSON_DETECTED', conf: number = 0.95) => {
    const video = videoElementRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    let dataUrl = '';

    if (selectedSourceType === 'browser_direct' && video && video.videoWidth > 0) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = video.videoWidth;
      snapCanvas.height = video.videoHeight;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        // 1. Draw raw video feed
        ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
        // 2. Draw canvas overlays (bounding boxes, vectors, zones)
        if (overlayCanvas) {
          ctx.drawImage(overlayCanvas, 0, 0, snapCanvas.width, snapCanvas.height);
        }
        // 3. Render forensic security header stamp
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(12, 12, 320, 52);
        ctx.strokeStyle = threatLabel.includes('NONE') || threatLabel.includes('PERSON') ? '#0284c7' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, 320, 52);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`CAM: ${selectedCameraId} | ${threatLabel}`, 22, 32);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 22, 48);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`CONF: ${(conf * 100).toFixed(0)}% | MODEL DETECTION`, 22, 58);

        dataUrl = snapCanvas.toDataURL('image/jpeg', 0.92);
      }
    } else if (streamImgRef.current) {
      dataUrl = streamImgRef.current.src;
    }

    if (dataUrl) {
      const snapId = `snap_${Date.now()}`;
      const newSnapshot: SavedSnapshot = {
        id: snapId,
        dataUrl: dataUrl,
        timestamp: new Date().toLocaleString(),
        cameraId: selectedCameraId,
        threatType: threatLabel,
        confidence: conf,
      };

      setSavedSnapshots(prev => [newSnapshot, ...prev.slice(0, 49)]);
      setSnapshotSuccess(`Auto-Captured & Saved Threat Evidence: ${threatLabel}`);
      setTimeout(() => setSnapshotSuccess(null), 4000);

      // Persist snapshot to backend storage
      apiService.uploadSnapshot({
        image: dataUrl,
        event_id: `EVT-${Date.now()}`,
        camera_id: selectedCameraId,
        event_type: threatLabel.replace(/[\s\(\)%]/g, '_').toUpperCase(),
        severity: threatLabel.includes('WEAPON') || threatLabel.includes('FIGHT') ? 'CRITICAL' : 'HIGH',
        description: `Automated live threat snapshot for ${threatLabel} at ${selectedCameraId}`
      }).catch(err => console.warn('Snapshot upload to backend:', err));
    }
  };

  const startWebcamAnalysisLoop = () => {
    if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    processingIntervalRef.current = setInterval(async () => {
      const video = videoElementRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!video || !overlayCanvas || video.paused || video.videoWidth === 0 || isProcessingRef.current) return;

      isProcessingRef.current = true;
      try {
        const offscreen = offscreenCanvasRef.current!;
        const targetW = Math.min(960, video.videoWidth);
        const targetH = Math.round(targetW * (video.videoHeight / video.videoWidth));
        offscreen.width = targetW;
        offscreen.height = targetH;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;
        offCtx.drawImage(video, 0, 0, targetW, targetH);

        const result = await apiService.processBrowserFrame({
          image: offscreen.toDataURL('image/jpeg', 0.82),
          camera_id: selectedCameraId,
          show_zones: showZonesRef.current,
          show_bboxes: showBBoxesRef.current,
        });

        const tracks = Array.isArray(result.tracks) ? result.tracks : [];
        const weapons = Array.isArray(result.weapons) ? result.weapons : [];
        const abandoned = Array.isArray(result.abandoned_objects) ? result.abandoned_objects : [];
        const now = Date.now();
        const activeIds = new Set<string>();
        tracks.forEach(track => {
          activeIds.add(track.track_id);
          const points = trackTrailsRef.current[track.track_id] || [];
          points.push({ x: track.center[0], y: track.center[1], time: now });
          trackTrailsRef.current[track.track_id] = points.filter(point => now - point.time < 5000).slice(-30);
        });
        Object.keys(trackTrailsRef.current).forEach(trackId => {
          if (!activeIds.has(trackId)) delete trackTrailsRef.current[trackId];
        });

        setDetectedPersonsCount(result.people_count);
        setDetectedThreatsCount(result.threat_count || 0);
        setInferenceMs(typeof result.inference_ms === 'number' ? result.inference_ms : null);
        const abnormalEvents = Array.isArray(result.abnormal_events) ? result.abnormal_events : [];
        setActiveAbnormalAlert(abnormalEvents[0]?.description || null);

        const parentW = overlayCanvas.parentElement?.clientWidth || video.clientWidth;
        const parentH = overlayCanvas.parentElement?.clientHeight || video.clientHeight;
        if (overlayCanvas.width !== parentW || overlayCanvas.height !== parentH) {
          overlayCanvas.width = parentW;
          overlayCanvas.height = parentH;
        }
        const ctx = overlayCanvas.getContext('2d');
        if (ctx) {
          drawOverlaysOnCanvas(
            ctx,
            tracks,
            weapons,
            abandoned,
            result.frame_width || targetW,
            result.frame_height || targetH,
            overlayCanvas.width,
            overlayCanvas.height
          );
        }

        if (autoCaptureEnabledRef.current && (result.threat_count || 0) > 0 && now - lastAutoCaptureTimeRef.current > 7000) {
          lastAutoCaptureTimeRef.current = now;
          setTimeout(() => captureEvidenceSnapshot(abnormalEvents[0]?.event_type || 'DETECTED_THREAT', weapons[0]?.confidence || 0), 100);
        }
      } catch (error: any) {
        setWebcamError(error?.response?.data?.detail || error?.message || 'Live analysis request failed.');
        setDetectedPersonsCount(0);
        setDetectedThreatsCount(0);
        setInferenceMs(null);
      } finally {
        isProcessingRef.current = false;
      }
    }, 750);
  };

  const drawOverlaysOnCanvas = (
    ctx: CanvasRenderingContext2D,
    tracks: any[],
    weapons: any[],
    abandoned: any[],
    origW: number,
    origH: number,
    dispW: number,
    dispH: number
  ) => {
    ctx.clearRect(0, 0, dispW, dispH);

    const video = videoElementRef.current;
    let renderW = dispW;
    let renderH = dispH;
    let offsetX = 0;
    let offsetY = 0;

    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
      const videoRatio = video.videoWidth / video.videoHeight;
      const containerRatio = dispW / dispH;

      if (containerRatio > videoRatio) {
        renderH = dispH;
        renderW = renderH * videoRatio;
        offsetX = (dispW - renderW) / 2;
        offsetY = 0;
      } else {
        renderW = dispW;
        renderH = renderW / videoRatio;
        offsetX = 0;
        offsetY = (dispH - renderH) / 2;
      }
    }

    const scaleX = renderW / origW;
    const scaleY = renderH / origH;
    const trackColor = (trackId: string) => {
      const palette = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#db2777', '#4f46e5'];
      const hash = Array.from(trackId).reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 0);
      return palette[hash % palette.length];
    };

    // 1. Draw Zones (Subtle dashed security zones)
    if (showZonesRef.current) {
      // Entrance Zone
      ctx.strokeStyle = '#7e22ce';
      ctx.fillStyle = 'rgba(126, 34, 206, 0.05)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const ez = { x: offsetX + (renderW * 0.02), y: offsetY + (renderH * 0.12), w: renderW * 0.35, h: renderH * 0.76 };
      ctx.strokeRect(ez.x, ez.y, ez.w, ez.h);
      ctx.fillRect(ez.x, ez.y, ez.w, ez.h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#7e22ce';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('ZONE: ENTRANCE', ez.x + 8, ez.y + 18);

      // Checkout Zone
      ctx.strokeStyle = '#d97706';
      ctx.fillStyle = 'rgba(217, 119, 6, 0.05)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      const cz = { x: offsetX + (renderW * 0.63), y: offsetY + (renderH * 0.12), w: renderW * 0.35, h: renderH * 0.76 };
      ctx.strokeRect(cz.x, cz.y, cz.w, cz.h);
      ctx.fillRect(cz.x, cz.y, cz.w, cz.h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#d97706';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('ZONE: CHECKOUT-01', cz.x + 8, cz.y + 18);
    }

    // 2. Draw Live Spatial Heatmap (if enabled)
    if (showHeatmapRef.current && tracks) {
      tracks.forEach(tr => {
        if (tr.center) {
          const cx = offsetX + (tr.center[0] * scaleX);
          const cy = offsetY + (tr.center[1] * scaleY);
          const radius = 65 * scaleX;
          const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
          radGrad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
          radGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
          radGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
          ctx.fillStyle = radGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }

    // 3. Draw Trajectory Path Trails (if enabled)
    if (showTrailsRef.current) {
      Object.entries(trackTrailsRef.current).forEach(([tid, pts]) => {
        if (pts.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = trackColor(tid);
          ctx.lineWidth = 2.5;
          ctx.setLineDash([3, 3]);

          pts.forEach((pt, idx) => {
            const px = offsetX + (pt.x * scaleX);
            const py = offsetY + (pt.y * scaleY);
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.setLineDash([]);

          // Arrowhead at the latest point
          const lastPt = pts[pts.length - 1];
          const lx = offsetX + (lastPt.x * scaleX);
          const ly = offsetY + (lastPt.y * scaleY);
          ctx.beginPath();
          ctx.arc(lx, ly, 4, 0, 2 * Math.PI);
          ctx.fillStyle = trackColor(tid);
          ctx.fill();
        }
      });
    }

    // 4. Draw anonymous person tracks returned by the backend.
    if (showBBoxesRef.current && tracks) {
      tracks.forEach(tr => {
        const [x1, y1, x2, y2] = tr.bbox;
        const dx1 = offsetX + (x1 * scaleX);
        const dy1 = offsetY + (y1 * scaleY);
        const dw = (x2 - x1) * scaleX;
        const dh = (y2 - y1) * scaleY;

        const personColor = trackColor(tr.track_id);
        ctx.strokeStyle = personColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(dx1, dy1, dw, dh);

        const label = `${tr.track_id} (${Math.round(tr.confidence * 100)}%)`;
        const pillY = dy1 > (offsetY + 35) ? dy1 - 22 : dy1 + 4;
        ctx.fillStyle = personColor;
        ctx.fillRect(dx1, pillY, 130, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(label, dx1 + 5, pillY + 14);

        // Centroid Indicator
        if (tr.center) {
          const cx = offsetX + (tr.center[0] * scaleX);
          const cy = offsetY + (tr.center[1] * scaleY);
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = personColor;
          ctx.fill();
        }
      });
    }

    // 5. Draw Detected Weapons / Dangerous Objects
    if (showBBoxes && weapons) {
      weapons.forEach(w => {
        const [wx1, wy1, wx2, wy2] = w.bbox;
        const dwx1 = offsetX + (wx1 * scaleX);
        const dwy1 = offsetY + (wy1 * scaleY);
        const dww = (wx2 - wx1) * scaleX;
        const dwh = (wy2 - wy1) * scaleY;

        // Danger Red Box
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(dwx1, dwy1, dww, dwh);

        // Threat Header Pill
        const wlabel = `THREAT: ${w.threat_label || 'BLADE'} (${Math.round(w.confidence * 100)}%)`;
        const wpillY = dwy1 > (offsetY + 35) ? dwy1 - 22 : dwy1 + 4;
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(dwx1, wpillY, 180, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(wlabel, dwx1 + 6, wpillY + 14);
      });
    }

    // 6. Draw Abandoned / Unattended Objects
    if (showBBoxes && abandoned) {
      abandoned.forEach(ab => {
        const [ax1, ay1, ax2, ay2] = ab.bbox;
        const dax1 = offsetX + (ax1 * scaleX);
        const day1 = offsetY + (ay1 * scaleY);
        const daw = (ax2 - ax1) * scaleX;
        const dah = (ay2 - ay1) * scaleY;

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(dax1, day1, daw, dah);
        ctx.setLineDash([]);

        const alabel = `UNATTENDED: ${ab.object_type}`;
        const apillY = day1 > (offsetY + 35) ? day1 - 20 : day1 + 4;
        ctx.fillRect(dax1, apillY, 150, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(alabel, dax1 + 4, apillY + 13);
      });
    }
  };

  const getStreamSourceParam = (camId: string = selectedCameraId) => {
    if (selectedSourceType === 'webcam') return '0';
    if (selectedSourceType === 'rtsp' && customRtspUrl.trim()) return customRtspUrl.trim();
    return cameras.find(camera => camera.camera_id === camId)?.stream_source || '';
  };

  const streamUrl = apiService.getVideoStreamUrl(
    selectedCameraId,
    getStreamSourceParam(selectedCameraId),
    showZones,
    showBBoxes
  );

  const safeCameras = Array.isArray(cameras) ? cameras : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const activeCamera = safeCameras.find(c => c.camera_id === selectedCameraId) || {
    camera_id: selectedCameraId,
    camera_name: 'Unregistered camera',
    location: 'Location unavailable',
    status: 'ACTIVE',
  };

  const cameraEvents = safeEvents.filter(e => e.camera_id === selectedCameraId);

  const handleCaptureSnapshot = () => {
    let dataUrl = '';
    if (selectedSourceType === 'browser_direct' && videoElementRef.current) {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = videoElementRef.current.videoWidth;
      snapCanvas.height = videoElementRef.current.videoHeight;
      const ctx = snapCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElementRef.current, 0, 0);
        dataUrl = snapCanvas.toDataURL('image/jpeg');
      }
    } else if (streamImgRef.current) {
      dataUrl = streamImgRef.current.src;
    }

    if (dataUrl) {
      const newSnapshot: SavedSnapshot = {
        id: `snap_${Date.now()}`,
        dataUrl: dataUrl,
        timestamp: new Date().toLocaleString(),
        cameraId: selectedCameraId,
      };

      setSavedSnapshots(prev => [newSnapshot, ...prev]);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `cctv_snapshot_${selectedCameraId}_${Date.now()}.jpg`;
      link.click();
      setSnapshotSuccess('Snapshot saved to Gallery & Downloads!');
      setTimeout(() => setSnapshotSuccess(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Abnormal Activity Alert Banner if active */}
      {activeAbnormalAlert && (
        <div className="flex items-center justify-between rounded-2xl bg-rose-600 px-5 py-3 text-white shadow-md animate-pulse">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="h-5 w-5 text-white flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Security Emergency Alert</p>
              <p className="text-sm font-semibold">{activeAbnormalAlert}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveAbnormalAlert(null)}
            className="rounded-lg bg-white/20 p-1 hover:bg-white/30 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Source & Camera Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
        {/* Camera Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {safeCameras.map(camera => (
            <button
              key={camera.camera_id}
              onClick={() => {
                setSelectedCameraId(camera.camera_id);
                setStreamError(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                selectedCameraId === camera.camera_id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CameraIcon className="h-3.5 w-3.5" />
              <span>{camera.camera_id}</span>
            </button>
          ))}
        </div>

        {/* View Mode (Single vs Quad) & Video Feed Source Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                viewMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Single Focus</span>
            </button>
            <button
              onClick={() => setViewMode('quad')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                viewMode === 'quad'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Camera Matrix</span>
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              onClick={() => {
                setSelectedSourceType('browser_direct');
                setStreamError(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                selectedSourceType === 'browser_direct'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="h-3.5 w-3.5 text-blue-600" />
              <span>Laptop Webcam</span>
            </button>

            <button
              onClick={() => {
                setSelectedSourceType('rtsp');
                setStreamError(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                selectedSourceType === 'rtsp'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              <span>RTSP / IP Camera</span>
            </button>
          </div>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            title={isAudioMuted ? 'Unmute Security Chimes' : 'Mute Security Chimes'}
            className={`rounded-xl border p-2 text-xs transition-colors ${
              isAudioMuted
                ? 'border-slate-200 bg-slate-100 text-slate-400'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* RTSP Input Bar if RTSP Mode Selected */}
      {selectedSourceType === 'rtsp' && (
        <div className="flex items-center space-x-3 rounded-2xl bg-white p-3.5 shadow-xs border border-slate-200">
          <Globe className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <input
            type="text"
            placeholder="rtsp://admin:password@192.168.1.100:554/live/stream1"
            value={customRtspUrl}
            onChange={e => setCustomRtspUrl(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:border-brand-500"
          />
          <button
            onClick={() => setStreamError(false)}
            className="rounded-xl bg-brand-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-800 transition-colors"
          >
            Connect Stream
          </button>
        </div>
      )}

      {/* Main Monitoring Grid: Video Stream(s) (8 cols) + Camera Stream Feed (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Stream Player Container (8 cols) */}
        <div className="space-y-4 lg:col-span-8">
          {viewMode === 'quad' ? (
            /* Quad CCTV Matrix Grid (2x2) */
            <div className="grid grid-cols-2 gap-3 aspect-video w-full rounded-2xl bg-slate-950 p-2 border border-slate-800 shadow-md">
              {safeCameras.filter(camera => camera.stream_source).slice(0, 4).map(camera => (
                <div
                  key={camera.camera_id}
                  onClick={() => {
                    setSelectedCameraId(camera.camera_id);
                    setViewMode('single');
                  }}
                  className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 group cursor-pointer flex items-center justify-center"
                >
                  <img
                    src={apiService.getVideoStreamUrl(camera.camera_id, camera.stream_source!, showZones, showBBoxes)}
                    alt={`${camera.camera_name} live stream`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center space-x-1.5 rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] font-mono text-white backdrop-blur-xs border border-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{camera.camera_id}</span>
                  </div>
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-brand-700 px-2 py-1 text-[10px] font-semibold text-white">
                    Click to Enlarge
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Single Camera View Container */
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-900 shadow-md border border-slate-200 flex items-center justify-center">
              {/* Mode 1: Browser Direct Webcam Feed */}
              {selectedSourceType === 'browser_direct' ? (
                <div className="relative h-full w-full bg-slate-950 flex items-center justify-center">
                  {webcamError ? (
                    <div className="text-center p-8 space-y-3">
                      <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
                      <p className="text-sm font-semibold text-white">{webcamError}</p>
                      <button
                        onClick={startWebcam}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry Camera Permission
                      </button>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoElementRef}
                        playsInline
                        muted
                        autoPlay
                        className="h-full w-full object-contain"
                      />
                      <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 h-full w-full pointer-events-none"
                      />
                    </>
                  )}
                </div>
              ) : (
                /* Mode 2: CCTV Ingest or RTSP Stream */
                isPlaying && !streamError ? (
                  <img
                    ref={streamImgRef}
                    src={streamUrl}
                    alt={`${selectedCameraId} Live Stream`}
                    onError={() => setStreamError(true)}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                      <Pause className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {streamError ? 'Video Feed Unavailable' : 'Stream Paused'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {streamError
                        ? 'Check the configured camera source or use this browser camera.'
                        : 'Click Resume Stream to restart live video.'}
                    </p>
                    {streamError && (
                      <button
                        onClick={() => {
                          setStreamError(false);
                          setSelectedSourceType('browser_direct');
                          startWebcam();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Use Browser Camera
                      </button>
                    )}
                  </div>
                )
              )}

              {/* Top HUD Overlay */}
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center space-x-2 rounded-xl bg-slate-900/80 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-xs border border-white/10 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  <span className="font-bold text-red-400">LIVE</span>
                  <span className="text-slate-400">|</span>
                  <span className="font-semibold">
                    {selectedSourceType === 'browser_direct' ? 'Camera Feed' : activeCamera.camera_name}
                  </span>
                  <span className="text-slate-400">
                    [{selectedCameraId}]
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {detectedThreatsCount > 0 && (
                    <div className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white shadow-md animate-pulse">
                      Threat Detected ({detectedThreatsCount})
                    </div>
                  )}
                  <div className="rounded-xl bg-slate-900/80 px-3 py-1.5 text-xs font-mono text-white backdrop-blur-xs border border-white/10 shadow-sm">
                    {streamTime}
                  </div>
                </div>
              </div>

              {/* Bottom HUD Overlay */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="flex items-center space-x-2 rounded-xl bg-slate-900/80 px-3 py-1 text-[11px] font-mono text-slate-300 backdrop-blur-xs border border-white/10">
                  <Users className="h-3.5 w-3.5 text-brand-300" />
                  <span>
                    {selectedSourceType === 'browser_direct'
                      ? `${detectedPersonsCount} Person(s) Detected`
                      : 'YOLOv8 Threat Intelligence Active'}
                  </span>
                  {selectedSourceType === 'browser_direct' && (
                    <span className="text-slate-400">• unique color per tracked person</span>
                  )}
                </div>

                <div className="rounded-xl bg-slate-900/80 px-3 py-1 text-[11px] font-mono text-slate-300 backdrop-blur-xs border border-white/10">
                  {selectedSourceType === 'browser_direct'
                    ? `Real inference • 40%+ confidence${inferenceMs !== null ? ` • ${Math.round(inferenceMs)} ms` : ''}`
                    : 'Live processed stream'}
                </div>
              </div>
            </div>
          )}

          {/* Stream Control Deck & Tooling Triggers */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs"
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Resume'}</span>
              </button>

              <button
                onClick={() => setShowZones(!showZones)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  showZones
                    ? 'border-brand-300 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Zones</span>
              </button>

              <button
                onClick={() => setShowBBoxes(!showBBoxes)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  showBBoxes
                    ? 'border-brand-300 bg-brand-50 text-brand-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ScanLine className="h-3.5 w-3.5" />
                <span>Tracks</span>
              </button>

              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  showHeatmap
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-amber-600" />
                <span>Heatmap</span>
              </button>

              <button
                onClick={() => setShowTrails(!showTrails)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  showTrails
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Footprints className="h-3.5 w-3.5 text-emerald-600" />
                <span>Trails</span>
              </button>

              <button
                onClick={() => setShowVoiceSettingsModal(true)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isVoiceDispatchEnabled
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Mic className="h-3.5 w-3.5 text-blue-600" />
                <span>Local Voice</span>
              </button>

              <button
                onClick={() => setAutoCaptureEnabled(!autoCaptureEnabled)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  autoCaptureEnabled
                    ? 'border-blue-300 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              title="Automatically capture evidence when the model reports a supported threat"
              >
                <Sparkles className={`h-3.5 w-3.5 ${autoCaptureEnabled ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{autoCaptureEnabled ? 'Auto-Snapping: ON' : 'Auto-Snapping: OFF'}</span>
              </button>

              <button
                onClick={() => setShowHardwareGuideModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                <span>Camera Hardware Guide</span>
              </button>

              <button
                onClick={() => captureEvidenceSnapshot('MANUAL_SNAPSHOT', 1.0)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Capture Snapshot</span>
              </button>

              {savedSnapshots.length > 0 && (
                <button
                  onClick={() => setShowGalleryModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-slate-600" />
                  <span>Gallery ({savedSnapshots.length})</span>
                </button>
              )}
            </div>

            {/* Emergency Lockdown Action Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const nextState = !isLockdownActive;
                  setIsLockdownActive(nextState);
                  if (nextState) {
                    speakSecurityAnnouncement('Local operator alert enabled in this browser.');
                  }
                }}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                  isLockdownActive
                    ? 'bg-red-700 text-white animate-pulse'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{isLockdownActive ? 'LOCAL ALERT ACTIVE' : 'Enable Local Alert'}</span>
              </button>
            </div>

            {snapshotSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {snapshotSuccess}
              </span>
            )}
          </div>

          {/* Local browser alert; no physical access-control integration is configured. */}
          {isLockdownActive && (
            <div className="flex items-center justify-between rounded-2xl bg-red-700 px-5 py-3 text-white shadow-lg animate-pulse border-2 border-red-500">
              <div className="flex items-center space-x-3">
                <Lock className="h-6 w-6 text-white animate-bounce" />
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider">LOCAL OPERATOR ALERT ACTIVE</h4>
                  <p className="text-xs text-red-100">On-screen and audible warnings are active in this browser.</p>
                </div>
              </div>
              <button
                onClick={() => setIsLockdownActive(false)}
                className="rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-red-800 hover:bg-red-50 transition-colors"
              >
                Clear Local Alert
              </button>
            </div>
          )}

          {/* Measurements reported by the active browser camera analysis. */}
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Entrance Zone</span>
                <span className="font-mono text-blue-700 font-bold">
                  {selectedSourceType === 'browser_direct' ? detectedPersonsCount : 'Unavailable'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: selectedSourceType === 'browser_direct' ? `${Math.min(100, detectedPersonsCount * 10)}%` : '0%',
                  }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Live Camera Stream Feed (4 cols) */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  {selectedCameraId} Events Feed
                </h3>
                <p className="text-xs text-slate-500">Live incidents on this feed</p>
              </div>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 border border-brand-200 font-mono">
                {cameraEvents.length} Events
              </span>
            </div>

            {cameraEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                No active safety incidents on {selectedCameraId}.
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {cameraEvents.map(event => (
                  <div
                    key={event.event_id}
                    onClick={() => setSelectedEvent(event)}
                    className={`flex flex-col space-y-1.5 rounded-xl border p-3 hover:shadow-xs cursor-pointer transition-all ${
                      event.severity === 'CRITICAL'
                        ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <SeverityBadge severity={event.severity} size="sm" />
                      <StatusBadge status={event.status} size="sm" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 line-clamp-1">
                      {formatEventType(event.event_type)}
                    </p>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{event.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span>Zone: {event.zone_id || 'GENERAL'}</span>
                      <span>{formatDateTime(event.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Dispatcher PA Modal */}
      {showVoiceSettingsModal && (
        <VoicePADispatcherModal
          onClose={() => setShowVoiceSettingsModal(false)}
        />
      )}

      {/* Snapshot Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-brand-700" />
                  CCTV Snapshot Gallery
                </h3>
                <p className="text-xs text-slate-500">
                  {savedSnapshots.length} captured high-resolution CCTV frame(s)
                </p>
              </div>
              <button
                onClick={() => setShowGalleryModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto p-1 flex-1">
              {savedSnapshots.map(snap => (
                <div key={snap.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 group space-y-2">
                  <div className="relative aspect-video overflow-hidden bg-slate-950">
                    <img src={snap.dataUrl} alt={snap.id} className="h-full w-full object-cover" />
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-mono text-white">
                        {snap.cameraId}
                      </span>
                      {snap.threatType && (
                        <span className="rounded-md bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                          {snap.threatType.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2.5 pt-0 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">{snap.timestamp}</span>
                    <div className="flex items-center space-x-1">
                      <a
                        href={snap.dataUrl}
                        download={`evidence_${snap.threatType || 'cctv'}_${snap.id}.jpg`}
                        className="rounded-lg p-1 text-slate-600 hover:text-brand-700 hover:bg-slate-200"
                        title="Download Stamped Evidence"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => setSavedSnapshots(prev => prev.filter(s => s.id !== snap.id))}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-slate-200"
                        title="Delete Snapshot"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Real Hardware Camera Connection Guide Modal */}
      {showHardwareGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Real Camera & Hardware Feed Setup Guide
                </h3>
                <p className="text-xs text-slate-500">
                  Step-by-step production instructions to connect physical IP, CCTV, USB & Mobile cameras
                </p>
              </div>
              <button
                onClick={() => setShowHardwareGuideModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-1 flex-1 text-xs text-slate-700">
              {/* Method 1 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[10px] text-white">1</span>
                  <span>Laptop / USB Webcam Direct Hardware Feed</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Select <strong className="text-slate-900">"Laptop Webcam"</strong> from the top source selector bar. After camera permission is granted, frames are securely submitted to the configured backend detector. The monitor reports measured inference latency when results arrive.
                </p>
              </div>

              {/* Method 2 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">2</span>
                  <span>Commercial IP Camera / CCTV Ingest (RTSP / ONVIF)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Select <strong className="text-slate-900">"RTSP / IP Camera"</strong> and enter your camera's RTSP endpoint.
                </p>
                <div className="rounded-lg bg-slate-900 p-2 font-mono text-[11px] text-emerald-400">
                  rtsp://admin:YourPassword@192.168.1.100:554/h264Preview_01_main
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                  <div>• <strong>Hikvision:</strong> rtsp://admin:pass@ip:554/Streaming/Channels/101</div>
                  <div>• <strong>Dahua:</strong> rtsp://admin:pass@ip:554/cam/realmonitor?channel=1&subtype=0</div>
                  <div>• <strong>TP-Link Tapo:</strong> rtsp://admin:pass@ip:554/stream1</div>
                  <div>• <strong>Reolink / Axis:</strong> rtsp://admin:pass@ip:554/h264Preview_01_main</div>
                </div>
              </div>

              {/* Method 3 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] text-white">3</span>
                  <span>Use Smartphone as a Wireless Store Security Camera</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  1. Install free app <strong>"IP Webcam"</strong> (Android) or <strong>"DroidCam / Camo"</strong> (iOS/Android).<br/>
                  2. Start server in the app on your store Wi-Fi (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">http://192.168.1.50:8080/video</code> or RTSP).<br/>
                  3. Enter the URL into the RTSP / IP Camera input bar to stream directly into Smart Store Intelligence.
                </p>
              </div>

              {/* Method 4 */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">4</span>
                  <span>Automated Evidence Capture & Forensic Stamping</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  When <strong className="text-slate-900">"Auto-Snapping"</strong> is active, a model-detected threat is captured with its bounding boxes, camera ID, UTC timestamp, and confidence rating in the <strong>Gallery</strong>. A trained operator must review model detections before treating them as verified incidents. You can click <strong>Capture Snapshot</strong> anytime to save manual evidence.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-end">
              <button
                onClick={() => setShowHardwareGuideModal(false)}
                className="rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition-colors"
              >
                Got It, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
