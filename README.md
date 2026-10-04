# SafeDrive AI — Intelligent Driver Monitoring & Road Safety Platform

[![CI Pipeline](https://github.com/safedrive-ai/safedrive-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/safedrive-ai/safedrive-platform/actions)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Important Research & Portfolio Notice:**
> SafeDrive AI is an advanced research and engineering portfolio prototype demonstrating real-time computer vision, multi-signal sensor fusion, and fleet safety telemetry. It does **not** claim to be an automotive functional safety compliance system certified under ISO 26262 or UN ECE DDAW regulations.

---

## 1. Project Overview & Problem Statement

Commercial vehicle collisions and fleet incidents are overwhelmingly precipitated by driver inattention, cognitive fatigue, microsleep episodes, and handheld mobile device distraction. Traditional single-frame or single-model detectors trigger high rates of false positives—annoying drivers with spurious alarms or missing progressive fatigue onset.

**SafeDrive AI** solves this with a **Multi-Signal Event Fusion Engine**. Rather than relying on isolated video frames, the platform tracks continuous temporal signals across facial geometry, head pose orientation, eye blink frequency, mouth aspect ratio, and object proximity. Instantaneous risk scores are computed using non-linear compounding hazard weights with automated cooldowns, deduplication, and enterprise audit trails.

---

## 2. High-Level Architecture

```
                                      +-----------------------------------+
                                      |        SafeDrive AI Client        |
                                      |   Next.js 14 + Tailwind + HUD     |
                                      +-----------------+-----------------+
                                                        |
                                           HTTPS / REST | WebSocket Stream
                                                        v
                                      +-----------------+-----------------+
                                      |          Nginx Gateway            |
                                      |      Reverse Proxy / SSL Term     |
                                      +--------+------------------+-------+
                                               |                  |
                                     REST APIs |                  | WS Frame Stream
                                               v                  v
+-----------------------------------------------------------------------------------------+
|                                    FastAPI Backend                                      |
|                                                                                         |
|  +--------------------+  +----------------------+  +---------------------------------+  |
|  | Auth (JWT / RBAC)  |  | Sessions & Reporting |  |   Modular AI Vision Pipeline    |  |
|  | Refresh Rotation   |  | ReportLab PDF Engine |  |                                 |  |
|  +--------------------+  +----------------------+  |  1. FaceLandmark (EAR, MAR)     |  |
|                                                    |  2. HeadPose (solvePnP 3D)      |  |
|                                                    |  3. FaceRecognition (128D Cos)  |  |
|                                                    |  4. ObjectDetection (YOLO Phone)|  |
|                                                    |  5. Tracking (Occupancy / Lost) |  |
|                                                    |  6. EventFusion (State Machine) |  |
|                                                    |  7. RiskEngine (0-100 Gauge)    |  |
|                                                    |  8. AlertEngine (Cooldowns)     |  |
|                                                    +----------------+----------------+  |
+---------------------------------------------------------------------|-------------------+
                                                                      |
                                    +---------------------------------+-------------------+
                                    |                                                     |
                                    v                                                     v
                     +------------------------------+                      +-------------------------------+
                     |    PostgreSQL 16 Database    |                      |         Redis 7 Cache         |
                     |  Users, Drivers, Embeddings  |                      |    PubSub, Alert Cooldowns,   |
                     |  Sessions, Events, Alerts    |                      |     Temporary State Buffer    |
                     +------------------------------+                      +-------------------------------+
```

---

## 3. Core Features & Capabilities

- **Real-Time Live Driver Console (`/live-monitor`):**
  - Live video stream HUD with dynamic face landmark bounding boxes and gaze vector overlay
  - Instantaneous behavioral states: `AttentionState`, `DrowsinessState`, `PhoneState`
  - Real-time circular SVG Risk Meter (0–100) with mathematical contributor breakdown
  - Synthesized Web Audio API alarms with urgency tones (Warning, High, Critical)
  - Explicit, clearly designated **DEMO MODE** for deterministic 75s simulation playback
- **Facial Landmark & Fatigue Estimation:**
  - Eye Aspect Ratio (EAR) temporal tracking for prolonged eye closure and microsleep
  - Mouth Aspect Ratio (MAR) temporal tracking for yawn initiation, confirmation, and cessation
  - 3D Head Pose orientation via `cv2.solvePnP` (Pitch, Yaw, Roll) to isolate mirror checks from sustained road distraction
- **Biometric Identity Verification:**
  - 128D mathematical embedding projection without storing unencrypted raw facial imagery
  - Cosine similarity matching against enrolled fleet operator profiles
  - Automatic detection of `UNKNOWN_DRIVER` or multi-occupant vehicle cabin anomalies
- **Handheld Mobile Phone Detection:**
  - YOLO object detection with spatial proximity filtering (hand-to-face and steering envelope)
  - Temporal persistence gating: `PHONE_DETECTED` $\rightarrow$ `POSSIBLE_PHONE_USAGE` $\rightarrow$ `CONFIRMED_PHONE_USAGE`
- **Multi-Signal Risk Scoring Engine:**
  - Instantaneous weighted score with non-linear compounding multiplier for simultaneous hazards
  - Output categorized into `LOW` (0–30), `MODERATE` (31–60), `HIGH` (61–80), and `CRITICAL` (81–100)
- **Executive Audit Reports (`/reports`):**
  - Generates downloadable, publication-grade PDF documents powered by ReportLab
  - Full risk trajectories, incident telemetry breakdowns, and actionable fleet safety recommendations
- **Enterprise Security & Compliance:**
  - Role-Based Access Control (RBAC): `ADMIN`, `SAFETY_OFFICER`, `FLEET_MANAGER`, `VIEWER`
  - Refresh token rotation with cryptographic SHA-256 hash persistence
  - Immutable audit trail (`/audit-logs`) recording every operator action

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion |
| **Backend** | Python 3.12, FastAPI, Pydantic v2 Settings, SQLAlchemy 2.0, Alembic, ReportLab |
| **AI & Vision** | OpenCV 4.9, MediaPipe, Ultralytics YOLOv8, NumPy, SciPy (solvePnP) |
| **Database & Cache** | PostgreSQL 16 (production), Redis 7 (caching/cooldowns), SQLite (local test fallback) |
| **Realtime** | WebSocket protocol with heartbeat ping/pong and automatic client reconnection |
| **DevOps & Containers** | Docker, Docker Compose, Nginx, GitHub Actions CI |

---

## 5. Required Pages & Information Architecture

| Route | Functionality |
|---|---|
| `/login` | Enterprise login with one-click demo role fill (Admin, Safety Officer, Fleet Manager) |
| `/register` | Operator account registration with assigned role |
| `/dashboard` | High-level fleet KPIs, risk trajectories, hazard breakdown, and driver rankings |
| `/live-monitor` | Telemetry HUD, camera/demo toggle, risk meter, and live alert ticker |
| `/drivers` | Fleet operator directory with search, status filters, and enrollment modal |
| `/drivers/[id]` | Individual driver dossier, historical trips, and biometric sample enrollment |
| `/sessions` | Driving session directory with start/stop trip controls |
| `/sessions/[id]` | Chronological forensic event timeline (08:42:10 recognized, 08:46:21 distracted, etc.) |
| `/events` | Searchable event catalog with severity badges and telemetry inspection modal |
| `/analytics` | Deep-dive behavioral charts (distraction vectors, phone usage, circadian trends) |
| `/reports` | Executive audit summaries with one-click downloadable ReportLab PDF reports |
| `/settings` | Configurable AI thresholds (EAR, MAR, Head Yaw, Phone confidence, Cooldowns) |
| `/admin` | User RBAC management, operator account activation, and engine status |
| `/audit-logs` | Immutable security audit trail with client IPs and payload details |

---

## 6. Pre-Seeded Sample Data & Canonical Demo Session

Upon first launch, SafeDrive AI automatically seeds enterprise demo records matching prompt specification:

### Default Operator Credentials:
- **Administrator:** `admin@safedrive.ai` / `Admin@123`
- **Safety Officer:** `safety@safedrive.ai` / `Safety@123`
- **Fleet Manager:** `fleet@safedrive.ai` / `Fleet@123`

### Canonical 42-Minute Sample Session (Section 33):
- **Driver:** John Doe (`DRV-001`)
- **Duration:** 42 minutes (2,520 seconds)
- **Drowsiness Incidents:** 2 (prolonged eye closure peak at 82/100 risk)
- **Distraction Incidents:** 7 (looking right, left, and downward)
- **Phone Usage Incidents:** 3 (handheld interaction in driver envelope)
- **Yawning Incidents:** 4 (circadian fatigue indicators)
- **Unknown Driver Flags:** 0 (authorized biometric match)
- **Average Risk Score:** 34.0 / 100
- **Maximum Risk Score:** 82.0 / 100

---

## 7. Getting Started

### Prerequisites:
- Docker and Docker Compose (recommended), OR
- Python 3.12+ and Node.js 18+ (for local bare-metal execution)

### Option A: Run with Docker Compose (Single Command)

```bash
# 1. Clone repository
git clone https://github.com/safedrive-ai/safedrive-platform.git
cd safedrive-platform

# 2. Copy environment template
cp .env.example .env

# 3. Start all services (PostgreSQL, Redis, Backend, Frontend, Nginx)
docker compose up --build
```

Access the application:
- **Web Application:** [http://localhost](http://localhost) (via Nginx port 80) or [http://localhost:3000](http://localhost:3000)
- **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Option B: Local Bare-Metal Development

#### 1. Start Backend:
```bash
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt email-validator

# Run database migrations (or automatic SQLite fallback in local mode)
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Start Frontend:
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 8. Running the Test Suite

SafeDrive AI comes with comprehensive automated tests covering authentication, risk scoring, state machines, and API endpoints:

```bash
# Run backend pytest suite
cd backend
PYTHONPATH=. venv/bin/pytest tests/ -v
```

### Test Coverage Highlights:
- `test_auth.py`: Bcrypt password hashing, JWT generation, token decoding, and token revocation
- `test_risk_scoring.py`: Categorization (LOW, MODERATE, HIGH, CRITICAL), compounding hazards, and contributor breakdown
- `test_drowsiness.py`: Full state machine (`EYES_OPEN` $\rightarrow$ `EYES_CLOSING` $\rightarrow$ `POSSIBLE_DROWSINESS` $\rightarrow$ `DROWSINESS` $\rightarrow$ `ALERTED` $\rightarrow$ `RECOVERED`)
- `test_head_pose.py`: Glance filtering vs. sustained distraction triggering
- `test_alert_engine.py`: Cooldown gating, deduplication, and sound alert payload generation
- `test_websocket.py`: Real-time telemetry streaming and heartbeat ping/pong
- `test_api_endpoints.py`: End-to-end integration tests for auth, drivers, sessions, analytics, and PDF generation

---

## 9. Biometric Privacy & Data Protection

Because the system interacts with facial geometry:
1. **Volatile Vectorization:** Video frames are immediately projected into normalized 128D mathematical vectors in memory. Raw imagery is discarded unless explicitly enabled by an administrator.
2. **Revocation & Deletion:** Biometric embedding vectors can be deleted at any time via the Driver Profile interface (`DELETE /api/drivers/{id}`).
3. **No Centralized Cloud Leakage:** All inference runs on-premise or within the customer's isolated container boundary.

---

## 10. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
