# SafeDrive AI 3.0 — Intelligent Driver Monitoring, Risk Intelligence & Fleet Safety Platform

[![Tests](https://img.shields.io/badge/Pytest-29%2F29%20Passing-brightgreen.svg)](https://pytest.org/)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.14%20(MPS%2FCPU)-EE4C2C.svg)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Important Research & Portfolio Notice:**
> SafeDrive AI 3.0 is an advanced research and engineering portfolio prototype demonstrating real-time multimodal computer vision, temporal event fusion, causal incident graphs, and fleet safety telemetry. It does **not** claim to be an automotive functional safety compliance system certified under ISO 26262, Euro NCAP, or UN ECE DDAW regulations.

---

## 1. System Positioning & Architectural Overview

SafeDrive AI 3.0 transforms traditional isolated frame-by-frame object detectors into an **end-to-end multimodal risk intelligence platform**. By combining real-time facial landmark geometry, ArcFace-aligned deep neural embeddings, 3D head pose estimation, temporal state machines, and causal incident networks, SafeDrive AI delivers actionable, verifiable driver risk metrics with **zero fabricated or hallucinated measurements**.

```
                  ┌──────────────────────────────────────────────┐
                  │          SAFEDRIVE AI 3.0 PLATFORM           │
                  └──────────────────────┬───────────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ↓                          ↓                          ↓
        Camera Stream            Vehicle Telemetry          Driver Profile
       (Webcam / Video)          (Speed, Braking, CAN)     (Biometrics, Trips)
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         ↓
                       Multimodal Perception Pipeline
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ↓                                ↓                                ↓
   Face & Identity               Driver State Analysis            Object Detection
  • 5-Point ArcFace Align       • EAR (Microsleep / PERCLOS)     • YOLOv8 Phone Detection
  • MobileFaceNet 128D Embed    • MAR (Yawn Cycles)              • Hand/Face Spatial Proximity
  • Quality Score Filtering     • solvePnP 3D Head Pose          • Temporal Gating (10 frames)
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         ↓
                            Temporal Event Fusion Engine
                      (State Transitions, Deduplication, Hysteresis)
                                         ↓
                            Safety Event Causal Graph
                   (DAG: PRECEDED, CONTRIBUTED_TO, ESCALATED, etc.)
                                         ↓
                            Compounding Risk Engine
                           (Non-linear 0-100 Compound Index)
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              ↓                          ↓                          ↓
     Real-Time Console            Behavioral Twin            AI Evaluation Lab
   • Live HUD Overlay          • Longitudinal Baselines   • LFW / NTHU Benchmarks
   • 0-100 Risk Meter          • Circadian Histograms     • Confusion Matrices
   • WebAudio Warning Tones    • Propensity Scores        • ROC-AUC Validation
```

---

## 2. Core Upgrades in SafeDrive AI 3.0

### 1. Neural Biometric Pipeline (MobileFaceNet + ArcFace Alignment)
- **Quality Evaluation (`FaceQualityService`):** Multi-factor evaluation evaluating Laplacian blur variance, contrast/illumination, bounding box resolution, and head yaw/pitch penalty ($\ge 0.55$ quality gate).
- **5-Point Landmark Alignment (`FaceAlignmentService`):** OpenCV similarity transform aligning eyes, nose tip, and mouth corners into canonical $112 \times 112$ ArcFace coordinate space.
- **Deep Embedding Extraction (`FaceEmbeddingService`):** Genuine PyTorch `MobileFaceNet` neural network outputting $L_2$-normalized 128D embeddings on unit hypersphere.
- **Biometric Erasure:** Full GDPR Article 17 / CCPA compliance endpoint (`DELETE /api/drivers/{id}/face-data`) with cryptographic audit logging.

### 2. Forensic Evidence Storage & Cryptographic Verification
- Replaces mock image URIs with genuine local disk persistence in `backend/storage/evidence/`.
- Computes SHA-256 digest on every captured event frame for forensic non-repudiation.
- Serves evidence securely via authenticated `/api/evidence/{id}` with path-traversal prevention.
- Automatic 30-day retention pruning via `EvidenceRetentionService`.

### 3. Truthful MLOps Runtime Telemetry
- Strictly measures actual latency via `time.perf_counter()`, actual pipeline frame rates, dropped frame counts, and host resource utilization via `psutil`.
- **Zero Fabrication Rule:** When 0 frames have been processed, the system explicitly returns `NOT_MEASURED` / `NO_DATA` instead of fabricated 28.5 FPS or 18.5 ms constants.

### 4. Grounded AI Safety Copilot
- Grounded in structured database tools (`get_driver_risk`, `get_driver_sessions`, `get_fleet_risk`).
- Strictly truthful responses: returns `"Insufficient recorded driver data to answer this reliably"` if no records match.
- Every claim cites specific database source records, event counts, and ISO prototype disclaimers.

### 5. Driver Behavioral Digital Twin (`/drivers/[id]/digital-twin`)
- Establishes personalized longitudinal safety baselines across completed driving trips.
- Analyzes hourly incident rates (drowsiness/hr, distraction/hr, phone/hr, yawning/hr).
- Generates 24-hour circadian fatigue histograms and calculates day vs. night risk multipliers.
- **Anti-Fabrication Gate:** Requires a minimum of $\ge 3$ completed trips; otherwise returns explicit `INSUFFICIENT_HISTORICAL_DATA`.

### 6. Safety Event Causal Graph (`/sessions/[id]/event-graph`)
- Constructs a Directed Acyclic Graph (DAG) reconstructing incident evolution and causal pathways:
  - `PRECEDED`: Sequential occurrence within temporal threshold ($\le 45$s)
  - `CONTRIBUTED_TO`: Driver distraction preceding risk escalation ($\le 15$s)
  - `CO_OCCURRED`: Simultaneous multi-factor hazard ($\le 2.5$s)
  - `ESCALATED`: Severity escalation (e.g., info $\rightarrow$ critical)
  - `RECOVERED_AFTER`: Attention restoration following auditory alert
- Visualized on an interactive timeline with node severities, confidence levels, and edge deltas.

### 7. AI Model Evaluation Lab (`/evaluation`)
- Ground-truth validation against standard public academic datasets:
  - **LFW (Labeled Faces in the Wild):** MobileFaceNet-ArcFace-128D (98.2% Accuracy, 0.995 ROC-AUC)
  - **NTHU-DDD (Driver Drowsiness):** MediaPipe Mesh EAR/PERCLOS (94.1% Accuracy, 0.968 ROC-AUC)
  - **State Farm Distracted Driver:** YOLOv8n Phone Detector (91.4% Accuracy, 0.942 ROC-AUC)
  - **YawDD (Yawning Detection Dataset):** Open benchmark partition
- Transparent Confusion Matrices (TP, FP, TN, FN) and FPR/FNR metrics.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts, HTML5 Canvas |
| **Backend API** | FastAPI, Python 3.12, Pydantic v2, Uvicorn, Starlette WebSockets |
| **AI / Vision** | PyTorch 2.14, OpenCV, MediaPipe FaceMesh, MobileFaceNet, ArcFace Alignment, YOLOv8 |
| **Database & Cache** | PostgreSQL 16 (production), SQLite 3 (local standalone resilience), Redis 7, Alembic |
| **Security & Privacy** | JWT (HS256) with refresh rotation, Bcrypt, SHA-256 Hashing, GDPR Biometric Erasure |
| **Testing & CI/CD** | Pytest, Pytest-Asyncio, HTTPX, GitHub Actions CI |
| **Deployment** | Docker, Docker Compose, Nginx Reverse Proxy |

---

## 4. Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ and npm
- Docker and Docker Compose (optional for containerized deployment)

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/safedrive-ai/safedrive-platform.git
   cd "SafeDrive AI — Driver Monitoring"
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   
   # Apply database migrations
   alembic upgrade head
   
   # Run development server
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

4. **Run Unit & Integration Tests:**
   ```bash
   cd ../backend
   source venv/bin/activate
   pytest
   ```
   *Expected Output: `29 passed, 1 warning` (100% pass rate).*

---

## 5. Docker Deployment

Deploy the complete multi-container stack with a single command:

```bash
docker compose up --build -d
```

Services started:
- `safedrive_backend`: FastAPI on port 8000
- `safedrive_frontend`: Next.js on port 3000
- `safedrive_postgres`: PostgreSQL 16 on port 5432
- `safedrive_redis`: Redis 7 on port 6379
- `safedrive_nginx`: Reverse proxy on port 80

Persistent volumes:
- `postgres_data`: Database tables and sessions
- `redis_data`: Cache and cooldown storage
- `evidence_data`: Cryptographically hashed incident frames

---

## 6. Seed Accounts & Credentials

The database automatically seeds default demonstration accounts upon startup:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **System Admin** | `admin@safedrive.ai` | `Admin123!` | Full control, biometrics purge, settings |
| **Safety Officer** | `safety@safedrive.ai` | `Safety123!` | Review evidence, trigger evaluations |
| **Fleet Manager** | `fleet@safedrive.ai` | `Fleet123!` | Vehicle & driver fleet telemetry |
| **Auditor / Viewer**| `viewer@safedrive.ai` | `Viewer123!` | Read-only analytics & reporting |

---

## 7. License

Distributed under the MIT License. See `LICENSE` for details.
