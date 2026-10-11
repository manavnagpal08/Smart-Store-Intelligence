# Smart Store Safety & Operations Intelligence System

An AI, Computer Vision, and Enterprise Backend retail operations and safety intelligence platform that analyzes CCTV video feeds to monitor store activity, track anonymous customer movement across configurable store zones, detect operational incidents, validate domain rules via a supporting Java OOP module, persist incidents in a relational database, and present real-time store operations on a modern React dashboard.

---

## 🚀 1. Project Overview

Retail stores rely on CCTV cameras for safety, queue management, and operational monitoring. The **Smart Store Safety & Operations Intelligence System** automates video feed analysis to detect operational conditions such as overcrowded aisles, long checkout queues, restricted-area entries, and aisle obstructions without human intervention.

> [!IMPORTANT]
> **Privacy-conscious architecture**: The included pipeline assigns anonymous track IDs and does not include facial-recognition models. Each operator remains responsible for camera placement, access controls, retention, notices, and compliance in the deployment jurisdiction.

---

## 🚩 2. Problem Statement

* **Human Supervision Limits**: Store managers cannot watch dozens of CCTV camera screens simultaneously.
* **Delayed Response Times**: Unnoticed checkout queue bottlenecks and entrance crowd spikes lead to poor customer experience and safety hazards.
* **Unauthorized Access**: Stockrooms and restricted staff areas are vulnerable to unauthorized entry.
* **Regulatory Compliance**: Retail intelligence systems must adhere strictly to privacy laws (such as GDPR) prohibiting facial profiling and personal identity logging.

---

## 💡 3. Proposed Solution

A modular, multi-tier intelligent store operations platform:
1. **Computer Vision (Python + YOLOv8 + ByteTrack)**: Detects and tracks anonymous people across polygonal store zones in real time.
2. **Alert & Store Intelligence (Python)**: Debounces detections, evaluates dwell persistence, and computes severity dynamically.
3. **Backend API (FastAPI + SQLAlchemy)**: Manages REST endpoints, event lifecycle state, and camera/zone registries.
4. **Business Validation (Java 21 OOP)**: Enforces enterprise domain rules and invariant constraints via a dedicated polymorphic validation engine.
5. **Database (MySQL / SQLite)**: Stores cameras, zones, validated events, and full status audit histories.
6. **Store Operations UI (React + TypeScript + Tailwind CSS)**: Displays live KPIs, CCTV stream overlays, interactive incident resolution workflows, and Recharts analytics.

---

## 🏗️ 4. System Architecture

```text
                    CCTV / Video Stream
                             │
                             ▼
                    ┌─────────────────┐
                    │ Python OpenCV   │
                    │ YOLO + Tracking │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Phase 2 Event   │
                    │ Intelligence    │
                    └────────┬────────┘
                             │
                             ▼
                        events.json
                             │
                             ▼
                    ┌─────────────────┐
                    │ Python FastAPI  │
                    │ Backend REST    │
                    └────────┬────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
             ┌─────────────┐   ┌─────────────┐
             │ Java OOP    │   │ MySQL 8.0+  │
             │ Business    │   │ Relational  │
             │ Validation  │   │ Database    │
             └─────────────┘   └──────┬──────┘
                                      │
                                      ▼
                    ┌─────────────────────────┐
                    │ Phase 4 React Dashboard │
                    │ (Vite + TS + Tailwind)  │
                    └─────────────────────────┘
```

---

## 🛠️ 5. Technology Stack

| Component | Technologies |
|---|---|
| **Computer Vision** | Python 3.13, OpenCV, YOLOv8 Nano (`yolov8n.pt`), ByteTrack, Shapely |
| **Store Intelligence** | Python 3.13, Rule Engine, Severity Calculator |
| **Backend REST API** | FastAPI, Uvicorn, Pydantic, SQLAlchemy |
| **Business Validation** | Java 21, Object-Oriented Design, JUnit 5 |
| **Relational Database** | MySQL 8.0+ or SQLite 3, selected explicitly by configuration |
| **Frontend Dashboard** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Axios, Lucide React |

---

## 🗺️ 6. Implementation Status

| Phase | Description | Status |
|---|---|---|
| **Vision and tracking** | YOLO detection, anonymous tracking, overlays, zone evaluation | Implemented; accuracy depends on model, camera, and calibration |
| **Incident intelligence** | Crowd, queue, restricted-area, obstruction and severity rules | Implemented and covered by automated tests |
| **Backend and storage** | REST API, event lifecycle, camera/zone registry, audit history | Implemented; production writes require an operator API key |
| **Java validation** | Supporting business-rule subprocess with Python fallback | Implemented; Java runtime and compiled classes must be deployed |
| **Operations dashboard** | Dashboard, alerts, analytics, camera registry and monitoring | Implemented; shows backend data without fabricated fallbacks |

---

## 🌟 7. Key Features

* **Anonymous Multi-Object Tracking**: Tracks patrons as `TRACK-001` with spatial centroid preservation.
* **Polygonal Zone Containment**: Accurately maps tracks into `ENTRANCE`, `AISLE-A`, `CHECKOUT-01`, and `STAFF-STORAGE`.
* **Multi-Factor Severity Engine**: Dynamically calculates `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` severity based on headcount and dwell time.
* **Java Business Rule Invariants**: Validates event structure regex (`EVT-YYYYMMDD-XXXX`), severity thresholds, and restricted zone rules.
* **Complete Incident Lifecycle**: Live transitions (`ACTIVE` $\to$ `ACKNOWLEDGED` $\to$ `RESOLVED`) with full audit history.
* **Interactive React Dashboard**: 6 dedicated operational views including executive KPI cards, live CCTV HUD overlays, and Recharts analytics.

---

## 📹 8. Dataset & Test Feeds

The bundled video and SQL seed file are development fixtures. They are disabled by default in the application. Set `ENABLE_SAMPLE_VIDEO=true` or `SEED_DEMO_DATA=true` only in a development environment.

---

## ⚙️ 9. Installation & Setup

### Prerequisites
* Python 3.10+ (tested with Python 3.13)
* Java JDK 17 or 21 (`javac`, `java`)
* Node.js v18+ and npm

### 1. Install Dependencies
```bash
# Python dependencies
pip install -r requirements.txt
pip install -r backend/requirements.txt

# Compile Java Validation Module
javac -d "java-module/bin" java-module/src/main/java/com/smartstore/model/*.java java-module/src/main/java/com/smartstore/exception/*.java java-module/src/main/java/com/smartstore/validation/*.java java-module/src/main/java/com/smartstore/Main.java

# Frontend dependencies
cd frontend
npm install
cd ..
```

---

## 🚀 10. Running the System

### Production configuration

Set these environment variables before starting a production deployment:

```env
ENVIRONMENT=production
DATABASE_URL=mysql+pymysql://USER:PASSWORD@HOST:3306/DATABASE
API_KEY=generate-a-long-random-secret
CORS_ORIGINS=https://your-dashboard.example
TRUSTED_HOSTS=your-api.example
DEBUG=false
SEED_DEMO_DATA=false
ENABLE_SAMPLE_VIDEO=false
```

The dashboard operator enters the API key under **Settings → Operator Write Access**. The browser keeps it only for the current tab session. Serve both frontend and API over HTTPS. Register cameras and zones through the protected API before opening live monitoring. Production API documentation is disabled.

### Step 1: Start the FastAPI Backend
```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```
* **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **System Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### Step 2: Start the React Dashboard
```bash
cd frontend
npm run dev
```
* **Store Dashboard UI**: [http://localhost:5173](http://localhost:5173)

### Step 3: Run the Computer Vision Pipeline
```bash
python run_store_intelligence.py --source "rtsp://camera-host/live" --save-video
```

---

## 🧪 11. Automated Testing

```bash
# 1. Run all 54 Python unit, integration, and E2E scenario tests
python -m pytest -v

# 2. Run Java OOP validation unit tests
java -cp "java-module/bin" com.smartstore.ValidationTest

# 3. Verify Frontend Production Build
cd frontend
npm run build
cd ..

# 4. Run System Performance & Health Verification
python scripts/verify_system_performance.py
```

---

## 📊 12. Performance

Performance depends on the deployed CPU/GPU, model, camera resolution, number of streams, database, and network. Measure the target environment with `python scripts/verify_system_performance.py`; do not treat development-machine results as a production capacity guarantee.

---

## ⚠️ 13. Known Limitations

* **Inference Speed**: Real-time 30 FPS processing requires GPU/CUDA acceleration (CPU currently yields 2-4 FPS).
* **Camera integration**: Register real camera stream sources before enabling monitoring. Production does not use the bundled sample video.
* **Aisle Obstruction**: Employs stationary track dwell heuristics rather than physical 3D object segmentation.
* **No Facial Recognition / Biometrics**: Intentionally omitted to guarantee full privacy compliance.

---

## 🔒 14. Privacy & Compliance

The included implementation is designed to minimize identity data:
* Uses randomized anonymous identifiers (`TRACK-001`, `TRACK-002`).
* Zero facial recognition or facial cropping models.
* The supplied models and schemas do not intentionally store biometric templates or names.
* Production operators must validate logs, snapshots, recordings, retention, access, notices, and applicable legal requirements.

---

## 🔮 15. Future Scope

* Multi-stream GPU hardware decoding via NVIDIA DeepStream / TensorRT.
* Slip, trip, and fall safety alerting using YOLOv8-Pose.
* Real-time automated cashier scheduling dispatch.
* Physical obstruction detection via 3D spatial occupancy grids.

---

## 🎬 16. Demo Presentation Workflow (3–5 Minutes)

1. **Introduction (0:00–0:30)**: Explain the problem of manual CCTV fatigue in retail store monitoring.
2. **Architecture (0:30–1:00)**: Walk through the 4-tier pipeline (Vision $\to$ Intelligence $\to$ FastAPI $\to$ Java Validation $\to$ Database $\to$ React).
3. **Live Monitoring (1:00–1:45)**: Open `/live-monitoring`, show camera feed switching, zone polygon overlays, and anonymous track bounding boxes.
4. **Triggering Incident (1:45–2:30)**: Run a configured camera or development fixture through the pipeline and show the resulting validated event.
5. **Dashboard & Lifecycle Resolution (2:30–3:30)**: Show the alert populating the `/dashboard` and `/alerts` pages. Click **Acknowledge**, then **Resolve**, and show the updated audit history.
6. **Analytics (3:30–4:30)**: View the `/analytics` page for hourly trends and zone safety scores.

---

## 📄 17. Detailed Documentation Links

* **Phase 1 Documentation**: [`docs/phase1_computer_vision.md`](file:///C:/Users/275680/Desktop/java%20project%20v2/docs/phase1_computer_vision.md)
* **Phase 2 Documentation**: [`docs/phase2_store_intelligence.md`](file:///C:/Users/275680/Desktop/java%20project%20v2/docs/phase2_store_intelligence.md)
* **Phase 3 Documentation**: [`docs/phase3_backend_database_java.md`](file:///C:/Users/275680/Desktop/java%20project%20v2/docs/phase3_backend_database_java.md)
* **Phase 4 Documentation**: [`docs/phase4_react_dashboard.md`](file:///C:/Users/275680/Desktop/java%20project%20v2/docs/phase4_react_dashboard.md)
* **Phase 5 Final Completion Report**: [`docs/final_project_completion_report.md`](file:///C:/Users/275680/Desktop/java%20project%20v2/docs/final_project_completion_report.md)
