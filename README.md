# ClinicalKG — Evidence-Grounded Patient Knowledge Graph Portal

ClinicalKG is an evidence-grounded, patient-centric clinical decision-support and knowledge graph portal. It combines **structured Graph Knowledge (Neo4j)** with **unstructured semantic retrieval (FAISS)**, **temporal reasoning**, and **Gemini 2.5 Flash / Ollama clinical synthesis** guarded by a deterministic evidence sufficiency gate and strict role-based access control (RBAC).

---

## 🏗️ Architecture Overview

```
                          ┌───────────────────────────┐
                          │   React + Vite Frontend   │
                          │   (Tailwind / Lucide UI)  │
                          └─────────────┬─────────────┘
                                        │ HTTP / REST (JWT Auth)
                                        ▼
                          ┌───────────────────────────┐
                          │     FastAPI Backend       │
                          │ (RBAC, Fusion, Synthesizer)│
                          └──────┬──────┬──────┬──────┘
                                 │      │      │      │
            ┌────────────────────┘      │      │      └────────────────────┐
            ▼                           ▼      ▼                           ▼
┌────────────────────────┐  ┌────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│     PostgreSQL 15      │  │     Neo4j 5.x      │  │      FAISS (CPU)       │  │    Redis 7 + Celery    │
│ (Users, RBAC, Audits)  │  │ (Clinical KG Graph)│  │(Per-Patient Vector DB) │  │  (Async Doc Ingestion) │
└────────────────────────┘  └────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

---

## 🌟 Key Features

### 1. Hybrid Retrieval & Deterministic Gating
* **Graph Facts**: Parameterized Cypher queries extracting temporally bounded diagnoses, procedures, treatments, and readmission chains.
* **Vector Chunks**: Isolated per-patient FAISS indices (`all-MiniLM-L6-v2` 384-dim embeddings) for clinical document passages.
* **Evidence Sufficiency Gate**: If retrieval confidence falls below `0.45`, the system returns a grounded insufficient evidence notice without calling the LLM—preventing hallucinations.

### 2. Multi-Role Portals (RBAC)
* **👑 Admin Portal**: User management (CRUD), doctor-patient assignments, audit logging, and live database health metrics.
* **🩺 Doctor Dashboard**: Cohort overview, interactive patient dossiers, chronological clinical timelines, interactive subgraphs, async document uploading, and evidence-grounded Q&A.
* **👤 Patient Portal**: Personal health analytics, medical timeline, and patient-tailored self-query interface.

### 3. Asynchronous Clinical Ingestion
* Celery workers parse uploaded clinical notes, PDFs (PyMuPDF), and medical images (Tesseract OCR).
* Extracts biomedical entities via **SciSpacy** (`en_core_sci_sm`) and rule-based extractors, linking new nodes into Neo4j and indexing chunks into FAISS.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* **Python 3.11** (recommended for SciSpacy & FAISS compatibility)
* **Node.js 18+** & npm
* **Native Service Binaries** (PostgreSQL 15, Neo4j Community 5.26, Redis 8.x) located in `tools/`

### 2. Environment Configuration
Copy `.env.example` to `.env` and configure your credentials:
```bash
cp .env.example .env
```

Key environment variables:
```ini
POSTGRES_URL=postgresql+asyncpg://clinicalkg:clinicalkg_password@127.0.0.1:5432/clinicalkg
NEO4J_URL=bolt://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=clinicalkg_password
REDIS_URL=redis://127.0.0.1:6379/0

# LLM Synthesis
LLM_BACKEND=gemini
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## ⚙️ Running the Application

### Step 1: Start Native Services
Run the native services helper script (or start PostgreSQL, Redis, and Neo4j individually):
```bat
start_services.bat
```

### Step 2: Backend & Database Initialization
Activate Python environment:
```bash
# Windows
.venv311\Scripts\activate

# Install dependencies (if not already installed)
pip install -r backend/requirements.txt
```

Run database migrations & seed initial admin user:
```bash
cd backend
alembic upgrade head
python scripts/create_admin.py
```

### Step 3: Start the Backend Server & Celery Worker
In terminal 1 (Backend API):
```bash
cd backend
python run.py
# Backend runs at http://127.0.0.1:8000
```

In terminal 2 (Celery Document Worker):
```bash
cd backend
celery -A app.workers.celery_app.celery_app worker -l info -P solo
```

### Step 4: Start the Frontend
In terminal 3:
```bash
cd frontend
npm install
npm run dev
# Frontend runs at http://localhost:5173
```

---

## 🔑 Default Test Credentials

| Role | Username | Password | Access / Permissions |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full system access, user management, assignments, audit logs |
| **Doctor** | `dr_smith` | `doctor123` | Assigned patients (PID 1-5, 1001-1003, PID-001), document upload, clinical Q&A |
| **Patient** | `patient_rajesh` | `patient123` | Personal records for Patient #1, self-timeline, self-query |

---

## 🧪 Verification & Testing

Run the automated test scripts from project root:

```bash
# Test 1: Service Connectivity
python test_conn.py

# Test 2: Complete RBAC & REST API Test
python test_e2e_api.py

# Test 3: Full End-to-End Pipeline (KG, Retrieval, Document Ingestion, Polling)
python test_e2e_pipeline.py
```

---

## 📂 Project Structure

```
ClinicKg/
├── backend/
│   ├── app/
│   │   ├── admin/           # Admin routes, user management & assignments
│   │   ├── auth/            # JWT authentication & security dependencies
│   │   ├── documents/       # File upload, chunking, OCR, entity extraction
│   │   ├── kg/              # Neo4j Cypher queries, timeline, analytics
│   │   ├── llm/             # Gemini & Ollama synthesis clients
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── query/           # Hybrid retrieval, FAISS search, fusion gating
│   │   └── workers/         # Celery task definitions
│   ├── scripts/             # Native services setup & seed scripts
│   └── run.py               # Uvicorn server entrypoint
├── data/
│   ├── datasets/            # Primary & secondary clinical datasets
│   ├── faiss/               # Isolated per-patient vector indexes
│   └── uploads/             # Clinical note uploads & parsed files
├── frontend/
│   ├── src/
│   │   ├── components/      # Layout, ProtectedRoute, UI components
│   │   ├── context/         # AuthContext & ToastContext
│   │   └── pages/
│   │       ├── admin/       # Dashboard, Users, Assignments, Audit
│   │       ├── doctor/      # Dashboard, Patient Detail, Q&A, Upload
│   │       └── patient/     # Dashboard, Timeline, Self-Query
│   ├── index.html
│   └── vite.config.js
├── start_services.bat       # Native services batch runner
├── stop_services.bat        # Native services shutdown script
├── test_e2e_api.py          # API verification test
└── test_e2e_pipeline.py     # E2E pipeline verification test
```

---

## 🛡️ License
This project is licensed under the MIT License.
