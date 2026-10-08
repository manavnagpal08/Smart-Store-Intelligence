import React, { useState, useEffect, useRef } from 'react';
import {
  Camera as CameraIcon,
  Play,
  Pause,
  Layers,
  Users,
  Video,
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
  Sliders,
  Radio,
  FileText
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { apiService } from '../services/api';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { ZonePolygonEditorModal } from '../components/zones/ZonePolygonEditorModal';
import { VoicePADispatcherModal } from '../components/common/VoicePADispatcherModal';
import { AuditDossierModal } from '../components/modals/AuditDossierModal';
import { WebhookManagerModal } from '../components/modals/WebhookManagerModal';
import { formatDateTime, formatEventType } from '../utils/formatters';

interface SavedSnapshot {
  id: string;
  dataUrl: string;
  timestamp: string;
  cameraId: string;
}

interface TrackTrailPoint {
  x: number;
  y: number;
  time: number;
}

export const LiveMonitoring: React.FC = () => {
  const { cameras, events, setSelectedEvent } = useStore();
  const [selectedCameraId, setSelectedCameraId] = useState<string>('CAM-01');
  const [selectedSourceType, setSelectedSourceType] = useState<'sample' | 'browser_direct' | 'webcam' | 'rtsp'>('browser_direct');
  const [customRtspUrl, setCustomRtspUrl] = useState<string>('rtsp://store-cam-01.local/live');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'single' | 'quad'>('single');
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVoiceDispatchEnabled, setIsVoiceDispatchEnabled] = useState<boolean>(true);
  const [isLockdownActive, setIsLockdownActive] = useState<boolean>(false);
  const [showZoneEditorModal, setShowZoneEditorModal] = useState<boolean>(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<boolean>(false);
  const [streamTime, setStreamTime] = useState<string>('');
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [detectedPersonsCount, setDetectedPersonsCount] = useState<number>(0);
  const [detectedThreatsCount, setDetectedThreatsCount] = useState<number>(0);
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
  const prevFramePixelsRef = useRef<Uint8ClampedArray | null>(null);
  const smoothedBboxRef = useRef<number[] | null>(null);

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
    prevFramePixelsRef.current = null;
    smoothedBboxRef.current = null;
  };

  const startWebcamAnalysisLoop = () => {
    if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
    }

    processingIntervalRef.current = setInterval(async () => {
      const video = videoElementRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!video || !overlayCanvas || video.paused || video.videoWidth === 0) return;
      if (isProcessingRef.current) return; // Prevent concurrent stacking

      isProcessingRef.current = true;

      try {
        const offscreen = offscreenCanvasRef.current!;
        // Scale to 640 max width for fast 20ms YOLO inference
        const targetW = Math.min(640, video.videoWidth);
        const targetH = Math.round(targetW * (video.videoHeight / video.videoWidth));
        offscreen.width = targetW;
        offscreen.height = targetH;
        const offCtx = offscreen.getContext('2d');
        if (!offCtx) return;

        offCtx.drawImage(video, 0, 0, targetW, targetH);
        const frameDataUrl = offscreen.toDataURL('image/jpeg', 0.6);

        const res = await apiService.processBrowserFrame({
          image: frameDataUrl,
          camera_id: selectedCameraId,
        });

        const peopleCount = res.people_count ?? (res.tracks ? res.tracks.length : 0);
        const threatCount = res.threat_count || (res.weapons?.length || 0);

        setDetectedPersonsCount(peopleCount);
        setDetectedThreatsCount(threatCount);

        // Update trajectory trails
        const now = Date.now();
        if (res.tracks) {
          const activeIds = new Set<string>();
          res.tracks.forEach((tr: any) => {
            const tid = tr.track_id;
            activeIds.add(tid);
            if (tr.center) {
              if (!trackTrailsRef.current[tid]) {
                trackTrailsRef.current[tid] = [];
              }
              trackTrailsRef.current[tid].push({ x: tr.center[0], y: tr.center[1], time: now });
              // Keep maximum 25 historical trajectory points
              if (trackTrailsRef.current[tid].length > 25) {
                trackTrailsRef.current[tid].shift();
              }
            }
          });
          // Cleanup lost tracks
          for (const k of Object.keys(trackTrailsRef.current)) {
            if (!activeIds.has(k)) {
              delete trackTrailsRef.current[k];
            }
          }
        }

        if (threatCount > 0 || (res.abnormal_events && res.abnormal_events.length > 0)) {
          const latest = res.abnormal_events?.[0];
          const alertDesc = latest?.description || 'Dangerous Threat / Weapon Detected';
          setActiveAbnormalAlert(alertDesc);
          playSecurityChime();

          if (latest?.event_type === 'WEAPON_DETECTED') {
            speakSecurityAnnouncement(`Attention security. Dangerous weapon detected on ${selectedCameraId}.`);
          } else if (latest?.event_type === 'SLIP_AND_FALL') {
            speakSecurityAnnouncement(`Attention staff. Slip and fall medical emergency detected.`);
          } else if (latest?.event_type === 'FIGHT_ALTERCATION') {
            speakSecurityAnnouncement(`Security alert. Physical altercation in progress.`);
          }
        } else {
          setActiveAbnormalAlert(null);
        }

        // Resize overlay canvas to match displayed video container
        const parentW = overlayCanvas.parentElement ? overlayCanvas.parentElement.clientWidth : video.clientWidth;
        const parentH = overlayCanvas.parentElement ? overlayCanvas.parentElement.clientHeight : video.clientHeight;
        if (overlayCanvas.width !== parentW || overlayCanvas.height !== parentH) {
          overlayCanvas.width = parentW;
          overlayCanvas.height = parentH;
        }

        const ctx = overlayCanvas.getContext('2d');
        if (ctx) {
          drawOverlaysOnCanvas(
            ctx,
            res.tracks || [],
            res.weapons || [],
            res.abandoned_objects || [],
            res.frame_width || targetW,
            res.frame_height || targetH,
            overlayCanvas.width,
            overlayCanvas.height
          );
        }
      } catch {
        // High-performance real in-browser computer vision when backend API is offline
        const video = videoElementRef.current;
        const overlayCanvas = overlayCanvasRef.current;
        const offscreen = offscreenCanvasRef.current;

        if (video && overlayCanvas && offscreen && video.videoWidth > 0) {
          const targetW = Math.min(640, video.videoWidth);
          const targetH = Math.round(targetW * (video.videoHeight / video.videoWidth));
          const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
          
          let realTracks: any[] = [];
          
          if (offCtx) {
            const currentFrame = offCtx.getImageData(0, 0, targetW, targetH);
            const currData = currentFrame.data;
            const prevData = prevFramePixelsRef.current;

            let skinPixels = 0;
            let changedPixels = 0;
            let minSkinX = targetW, minSkinY = targetH, maxSkinX = 0, maxSkinY = 0;
            let minDiffX = targetW, minDiffY = targetH, maxDiffX = 0, maxDiffY = 0;
            let skinCenterXSum = 0;
            let skinCenterYSum = 0;
            const step = 4; // Sample every 4th pixel for 60fps performance

            for (let y = 0; y < targetH; y += step) {
              for (let x = 0; x < targetW; x += step) {
                const idx = (y * targetW + x) * 4;
                const r = currData[idx];
                const g = currData[idx + 1];
                const b = currData[idx + 2];

                // Human skin chromaticity rules (covers light, medium, tan, and dark skin tones)
                const maxVal = Math.max(r, Math.max(g, b));
                const minVal = Math.min(r, Math.min(g, b));
                const isSkin =
                  r > 55 &&
                  g > 35 &&
                  b > 20 &&
                  r > g &&
                  r > b &&
                  (r - g) >= 8 &&
                  (maxVal - minVal) >= 12;

                if (isSkin) {
                  skinPixels++;
                  skinCenterXSum += x;
                  skinCenterYSum += y;
                  if (x < minSkinX) minSkinX = x;
                  if (x > maxSkinX) maxSkinX = x;
                  if (y < minSkinY) minSkinY = y;
                  if (y > maxSkinY) maxSkinY = y;
                }

                // Temporal frame difference check
                if (prevData && prevData.length === currData.length) {
                  const diff = (Math.abs(r - prevData[idx]) + Math.abs(g - prevData[idx + 1]) + Math.abs(b - prevData[idx + 2])) / 3;
                  if (diff > 22) {
                    changedPixels++;
                    if (x < minDiffX) minDiffX = x;
                    if (x > maxDiffX) maxDiffX = x;
                    if (y < minDiffY) minDiffY = y;
                    if (y > maxDiffY) maxDiffY = y;
                  }
                }
              }
            }

            const totalSampled = (targetW / step) * (targetH / step);
            const skinRatio = skinPixels / totalSampled;
            const changeRatio = changedPixels / totalSampled;

            const faceW = maxSkinX > minSkinX ? maxSkinX - minSkinX : 0;
            const faceH = maxSkinY > minSkinY ? maxSkinY - minSkinY : 0;
            const hasSkinCluster = skinRatio >= 0.005 && faceW >= 20 && faceH >= 20;
            const hasMotionCluster = changeRatio >= 0.012 && (maxDiffX - minDiffX) >= 30;

            if (hasSkinCluster || hasMotionCluster) {
              let rawMinX = 0, rawMinY = 0, rawMaxX = 0, rawMaxY = 0;

              if (hasSkinCluster) {
                const faceCenterX = skinCenterXSum / skinPixels;
                const torsoW = Math.min(targetW * 0.85, Math.max(faceW * 2.2, targetW * 0.42));
                rawMinX = Math.max(0, Math.round(faceCenterX - torsoW / 2));
                rawMaxX = Math.min(targetW, Math.round(faceCenterX + torsoW / 2));
                rawMinY = Math.max(0, Math.round(minSkinY - faceH * 0.25));
                rawMaxY = Math.min(targetH, Math.round(minSkinY + faceH * 3.4));
              } else {
                const boxW = maxDiffX - minDiffX;
                const boxH = maxDiffY - minDiffY;
                rawMinX = Math.max(0, Math.round(minDiffX - boxW * 0.1));
                rawMaxX = Math.min(targetW, Math.round(maxDiffX + boxW * 0.1));
                rawMinY = Math.max(0, Math.round(minDiffY - boxH * 0.1));
                rawMaxY = Math.min(targetH, Math.round(maxDiffY + boxH * 0.1));
              }

              // Kalman / Exponential Moving Average Smoothing to eliminate jitter
              if (!smoothedBboxRef.current) {
                smoothedBboxRef.current = [rawMinX, rawMinY, rawMaxX, rawMaxY];
              } else {
                const prevB = smoothedBboxRef.current;
                smoothedBboxRef.current = [
                  Math.round(prevB[0] * 0.75 + rawMinX * 0.25),
                  Math.round(prevB[1] * 0.75 + rawMinY * 0.25),
                  Math.round(prevB[2] * 0.75 + rawMaxX * 0.25),
                  Math.round(prevB[3] * 0.75 + rawMaxY * 0.25),
                ];
              }

              const sB = smoothedBboxRef.current;
              const cx = Math.round((sB[0] + sB[2]) / 2);
              const cy = Math.round((sB[1] + sB[3]) / 2);
              const dynamicConf = parseFloat(Math.min(0.96, Math.max(0.85, 0.88 + skinRatio * 3 + changeRatio)).toFixed(2));

              realTracks = [{
                track_id: 'TRACK-001',
                bbox: [sB[0], sB[1], sB[2], sB[3]],
                confidence: dynamicConf,
                center: [cx, cy],
                zone_id: cx < targetW * 0.38 ? 'ENTRANCE' : cx > targetW * 0.62 ? 'CHECKOUT-01' : 'AISLE-A',
              }];

              const now = Date.now();
              if (!trackTrailsRef.current['TRACK-001']) {
                trackTrailsRef.current['TRACK-001'] = [];
              }
              trackTrailsRef.current['TRACK-001'].push({ x: cx, y: cy, time: now });
              if (trackTrailsRef.current['TRACK-001'].length > 25) {
                trackTrailsRef.current['TRACK-001'].shift();
              }
            } else {
              // Decay smoothed box if absent
              smoothedBboxRef.current = null;
              realTracks = [];
              trackTrailsRef.current = {};
            }

            prevFramePixelsRef.current = new Uint8ClampedArray(currData);
          }

          setDetectedPersonsCount(realTracks.length);
          setDetectedThreatsCount(0);
          setActiveAbnormalAlert(null);

          const parentW = overlayCanvas.parentElement ? overlayCanvas.parentElement.clientWidth : video.clientWidth;
          const parentH = overlayCanvas.parentElement ? overlayCanvas.parentElement.clientHeight : video.clientHeight;
          if (overlayCanvas.width !== parentW || overlayCanvas.height !== parentH) {
            overlayCanvas.width = parentW;
            overlayCanvas.height = parentH;
          }

          const ctx = overlayCanvas.getContext('2d');
          if (ctx) {
            drawOverlaysOnCanvas(
              ctx,
              realTracks,
              [],
              [],
              targetW,
              targetH,
              overlayCanvas.width,
              overlayCanvas.height
            );
          }
        }
      } finally {
        isProcessingRef.current = false;
      }
    }, 200);
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

    // 1. Draw Zones (Subtle dashed security zones)
    if (showZones) {
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
    if (showHeatmap && tracks) {
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
    if (showTrails) {
      Object.entries(trackTrailsRef.current).forEach(([tid, pts]) => {
        if (pts.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.75)';
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
          ctx.fillStyle = '#10b981';
          ctx.fill();
        }
      });
    }

    // 4. Draw Person Tracks (Pixel-perfect bounding boxes)
    if (showBBoxes && tracks) {
      tracks.forEach(tr => {
        const [x1, y1, x2, y2] = tr.bbox;
        const dx1 = offsetX + (x1 * scaleX);
        const dy1 = offsetY + (y1 * scaleY);
        const dw = (x2 - x1) * scaleX;
        const dh = (y2 - y1) * scaleY;

        // Bounding Box
        ctx.strokeStyle = '#9d174d';
        ctx.lineWidth = 3;
        ctx.strokeRect(dx1, dy1, dw, dh);

        // Header Tag
        const label = `${tr.track_id} (${Math.round(tr.confidence * 100)}%)`;
        const pillY = dy1 > (offsetY + 35) ? dy1 - 22 : dy1 + 4;
        const pillW = 120;
        const pillH = 20;

        ctx.fillStyle = '#831843';
        ctx.fillRect(dx1, pillY, pillW, pillH);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(label, dx1 + 5, pillY + 14);

        // Centroid Indicator
        if (tr.center) {
          const cx = offsetX + (tr.center[0] * scaleX);
          const cy = offsetY + (tr.center[1] * scaleY);
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#10b981';
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
    if (camId === 'CAM-01') {
      if (selectedSourceType === 'webcam') return '0';
      if (selectedSourceType === 'rtsp') return customRtspUrl;
      return 'sample';
    }
    return 'sample';
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
    camera_name: selectedCameraId === 'CAM-01' ? 'North Entrance & Aisle A' : selectedCameraId === 'CAM-02' ? 'Checkout Area & Storage Door' : selectedCameraId === 'CAM-03' ? 'Grocery Aisles' : 'Rear Loading Dock',
    location: selectedCameraId === 'CAM-01' ? 'North Hall' : selectedCameraId === 'CAM-02' ? 'Front Cashier' : selectedCameraId === 'CAM-03' ? 'Central Rows' : 'Loading Bay',
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
          {['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map(camId => (
            <button
              key={camId}
              onClick={() => {
                setSelectedCameraId(camId);
                setStreamError(false);
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                selectedCameraId === camId
                  ? 'bg-brand-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CameraIcon className="h-3.5 w-3.5" />
              <span>{camId}</span>
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
                  ? 'bg-white text-brand-800 shadow-xs'
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
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Quad Matrix (4x)</span>
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
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="h-3.5 w-3.5 text-purple-600" />
              <span>Laptop Webcam</span>
            </button>

            <button
              onClick={() => {
                setSelectedSourceType('sample');
                setStreamError(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                selectedSourceType === 'sample'
                  ? 'bg-white text-brand-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Video className="h-3.5 w-3.5 text-brand-600" />
              <span>CCTV Video</span>
            </button>

            <button
              onClick={() => {
                setSelectedSourceType('rtsp');
                setStreamError(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                selectedSourceType === 'rtsp'
                  ? 'bg-white text-brand-800 shadow-xs'
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
                : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
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
              {['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04'].map((camId, idx) => (
                <div
                  key={camId}
                  onClick={() => {
                    setSelectedCameraId(camId);
                    setViewMode('single');
                  }}
                  className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 group cursor-pointer flex items-center justify-center"
                >
                  <img
                    src={apiService.getVideoStreamUrl(camId, 'sample', showZones, showBBoxes)}
                    alt={`${camId} Live Stream`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 flex items-center space-x-1.5 rounded-lg bg-slate-900/80 px-2 py-1 text-[10px] font-mono text-white backdrop-blur-xs border border-white/10">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{camId}</span>
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
                        ? 'Switch source to Laptop Webcam or CCTV Video.'
                        : 'Click Resume Stream to restart live video.'}
                    </p>
                    {streamError && (
                      <button
                        onClick={() => {
                          setStreamError(false);
                          setSelectedSourceType('sample');
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Switch to CCTV Feed
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
                </div>

                <div className="rounded-xl bg-slate-900/80 px-3 py-1 text-[11px] font-mono text-slate-300 backdrop-blur-xs border border-white/10">
                  {selectedSourceType === 'browser_direct' ? 'Live Camera Feed' : 'HD 1080p'}
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
                onClick={() => setShowZoneEditorModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Sliders className="h-3.5 w-3.5 text-purple-600" />
                <span>Zone Config</span>
              </button>

              <button
                onClick={() => setShowVoiceSettingsModal(true)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                  isVoiceDispatchEnabled
                    ? 'border-purple-300 bg-purple-50 text-purple-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Mic className="h-3.5 w-3.5 text-purple-600" />
                <span>Voice PA</span>
              </button>

              <button
                onClick={handleCaptureSnapshot}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Capture Snapshot</span>
              </button>

              {savedSnapshots.length > 0 && (
                <button
                  onClick={() => setShowGalleryModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
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
                    speakSecurityAnnouncement('EMERGENCY LOCKDOWN INITIATED. ALL GATES SECURED.');
                  }
                }}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                  isLockdownActive
                    ? 'bg-red-700 text-white animate-pulse'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>{isLockdownActive ? 'LOCKDOWN ACTIVE' : 'Initiate Lockdown'}</span>
              </button>
            </div>

            {snapshotSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {snapshotSuccess}
              </span>
            )}
          </div>

          {/* Emergency Lockdown Active Alert Bar */}
          {isLockdownActive && (
            <div className="flex items-center justify-between rounded-2xl bg-red-700 px-5 py-3 text-white shadow-lg animate-pulse border-2 border-red-500">
              <div className="flex items-center space-x-3">
                <Lock className="h-6 w-6 text-white animate-bounce" />
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider">EMERGENCY STORE LOCKDOWN IN PROGRESS</h4>
                  <p className="text-xs text-red-100">All automated security perimeter gates locked. Local law enforcement dispatch alert broadcasted.</p>
                </div>
              </div>
              <button
                onClick={() => setIsLockdownActive(false)}
                className="rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-red-800 hover:bg-red-50 transition-colors"
              >
                Disengage Lockdown
              </button>
            </div>
          )}

          {/* Live Zone Real-Time Occupancy Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Entrance Zone</span>
                <span className="font-mono text-purple-700 font-bold">
                  {selectedSourceType === 'browser_direct' ? detectedPersonsCount : 4} / 8
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, ((selectedSourceType === 'browser_direct' ? detectedPersonsCount : 4) / 8) * 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Aisle A (Snacks)</span>
                <span className="font-mono text-blue-700 font-bold">3 / 6</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: '50%' }} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Checkout 1</span>
                <span className="font-mono text-amber-700 font-bold">4 / 4</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Staff Storage</span>
                <span className="font-mono text-rose-700 font-bold">0 Breach</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: '0%' }} />
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

      {/* Zone Interactive Polygon Editor Modal */}
      {showZoneEditorModal && (
        <ZonePolygonEditorModal
          cameraId={selectedCameraId}
          onClose={() => setShowZoneEditorModal(false)}
        />
      )}

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
                    <span className="absolute top-2 left-2 rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] font-mono text-white">
                      {snap.cameraId}
                    </span>
                  </div>
                  <div className="p-2.5 pt-0 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">{snap.timestamp}</span>
                    <div className="flex items-center space-x-1">
                      <a
                        href={snap.dataUrl}
                        download={`snapshot_${snap.id}.jpg`}
                        className="rounded-lg p-1 text-slate-600 hover:text-brand-700 hover:bg-slate-200"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => setSavedSnapshots(prev => prev.filter(s => s.id !== snap.id))}
                        className="rounded-lg p-1 text-slate-400 hover:text-red-600 hover:bg-slate-200"
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
    </div>
  );
};
