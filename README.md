# ClinicalKG — Evidence-Grounded Patient Knowledge Graph Portal

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-5.x-4581C3?logo=neo4j&logoColor=white)
![B.Tech Research](https://img.shields.io/badge/B.Tech-Research%20Project-orange)

ClinicalKG is an evidence-grounded, patient-centric clinical knowledge graph portal. It combines **structured graph retrieval (Neo4j)** with **semantic vector retrieval (FAISS)**, **temporal reasoning**, and **Gemini / Ollama answer synthesis** guarded by a deterministic evidence sufficiency gate and strict role-based access control (RBAC).

> **Synthetic data only — ClinicalKG is a research prototype and is not intended for clinical diagnosis, treatment, or production healthcare use.**

---

## 🏗️ Architecture

```mermaid
flowchart TD
    U([User]) --> FE[React + Vite Frontend]
    FE -->|JWT Bearer| API[FastAPI Backend]

    API --> AUTH[JWT Auth + RBAC]
    AUTH --> QUERY[Query Router]
    AUTH --> DOCS[Documents Router]
    AUTH --> ENC[Encounters Router]
    AUTH --> KG[KG / Timeline Router]
    AUTH --> ADM[Admin Router]

    QUERY --> FUSION[Evidence Fusion\n0.6 Graph + 0.4 Document]
    FUSION --> NEO4J[(Neo4j\nKnowledge Graph)]
    FUSION --> FAISS[(FAISS\nPer-Patient Index)]
    FUSION --> GATE{Score >= 0.45?}
    GATE -->|Yes| LLM[Gemini / Ollama]
    GATE -->|No| INSUF[Insufficient Evidence Notice]

    DOCS --> INGEST[Ingestion Pipeline]
    INGEST --> PROC[Celery Worker / asyncio fallback]
    PROC --> OCR[PyMuPDF + Tesseract]
    OCR --> EMBED[Chunker + SciSpacy + Embeddings]
    EMBED --> NEO4J
    EMBED --> FAISS

    API --> PG[(PostgreSQL\nUsers, Audit, Jobs)]
    API --> REDIS[(Redis\nCelery Broker)]
```

---

## 🌟 Key Features

### 1. Hybrid Retrieval & Deterministic Evidence Gating
- **Graph retrieval**: Parameterized Cypher queries across temporally bounded Conditions, Treatments, Admissions, and Encounters.
- **Semantic retrieval**: Per-patient `IndexFlatIP` FAISS indices with `all-MiniLM-L6-v2` (384-dim) embeddings.
- **Evidence sufficiency gate**: If the weighted fusion score falls below `0.45`, the system returns a grounded insufficient-evidence notice without calling the LLM.

### 2. Temporal Clinical Reasoning
Temporal constraints are extracted from the natural-language query and applied during retrieval — before any LLM call. Supported patterns include `latest`, `as of <date>`, `before <date>`, `after <date>`, `current/active`, `in <year>`, `past 30 days`, `past year`, and `historical/previous`.

### 3. Multi-Role Portals (RBAC)
- **Admin Portal**: User and patient profile management, doctor-patient assignments, audit logs, system metrics, and live research evaluation dashboard.
- **Doctor Workspace**: Assigned patient list; tabbed patient workspace with Overview, Timeline, Documents, Knowledge Graph, and Q&A; clinical encounter creation; document upload with live ingestion status.
- **Patient Portal**: Personal health dashboard, chronological medical timeline, and self-query interface — isolated to the patient's own records.

### 4. Longitudinal Clinical Encounters
Doctors can log structured clinical visits (encounters). Each encounter is persisted in PostgreSQL and synced to Neo4j, where it becomes part of the patient's clinical knowledge graph. Documents can be associated with a specific encounter for provenance-aware retrieval.

### 5. Asynchronous Document Ingestion
Uploaded documents are processed by a Celery worker (with an `asyncio.create_task` fallback for environments where Celery is unavailable). The pipeline: text extraction → chunking (500 tokens / 50 overlap) → SciSpacy entity extraction → FAISS embedding + indexing → Neo4j KG ingestion.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.11** (required for SciSpacy and FAISS compatibility)
- **Node.js 18+** and npm
- **PostgreSQL**, **Neo4j Community 5.x**, and **Redis** running locally
- **Google Gemini API key** (or Ollama with `biomistral:latest` for local LLM)

On Windows, the project includes a `tools/` directory with pre-bundled service binaries.

### 1. Environment Configuration
```bash
cp .env.example .env
```

Key variables to configure:
```ini
POSTGRES_URL=postgresql+asyncpg://clinicalkg:clinicalkg_password@localhost:5432/clinicalkg
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=clinicalkg_password
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=<your-secret-32-chars>
LLM_BACKEND=gemini
GEMINI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=<your-api-key>
EVIDENCE_MIN_SCORE=0.45
GRAPH_WEIGHT=0.6
```

### 2. Backend Setup
```bash
python -m venv .venv311
.venv311\Scripts\activate        # Windows
pip install -r backend/requirements.txt
```

### 3. Database Initialization
```bash
cd backend
alembic upgrade head
python scripts/create_admin.py
```

### 4. Start Services (Windows)
```powershell
# Starts PostgreSQL, Neo4j, Redis, FastAPI backend, and Celery worker
.\start_all.ps1
```

Or start individually:
```bash
# Terminal 1 — FastAPI API (http://127.0.0.1:8000)
cd backend && python run.py

# Terminal 2 — Celery worker (optional; asyncio fallback used if unavailable)
cd backend && celery -A app.workers.celery_app worker --loglevel=info --pool=solo
```

### 5. Frontend
```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### Default Test Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Full system management, assignments, audit, evaluation |
| **Doctor** | `dr_smith` | `doctor123` | Assigned patients, workspace, document upload, Q&A |
| **Patient** | `patient_rajesh` | `patient123` | Own records, timeline, self-query |

API interactive docs: `http://localhost:8000/docs`

---

## 🧪 Testing
```bash
# Run the full test suite from project root
pytest

# Run a specific test file
pytest backend/tests/test_rbac_isolation.py -v
```

Maintained test suite in `backend/tests/`:

| Test File | Coverage |
|---|---|
| `test_temporal_parser.py` | Temporal expression extraction (all 9 patterns) |
| `test_rbac_isolation.py` | RBAC enforcement and unauthorized access rejection |
| `test_encounters.py` | Encounter creation, retrieval, Neo4j sync |
| `test_patient_profile.py` | Patient profile management |
| `test_admin_workflow.py` | User creation and assignment workflows |
| `test_retrieval_correctness.py` | Hybrid fusion retrieval against known data |
| `test_temporal_kg.py` | Temporal graph retrieval with clinical fixtures |
| `test_faiss_retrieval.py` | Per-patient FAISS index isolation and search |
| `test_entity_extraction.py` | SciSpacy biomedical NER |
| `test_gemini_integration.py` | LLM client integration |
| `test_evaluation_module.py` | Evaluation benchmark execution |

Additional milestone verification scripts (`test_milestone*.py`) were used during development and remain in the project root.

---

## 📂 Project Structure

```
ClinicKg/
├── backend/
│   ├── app/
│   │   ├── admin/           # User/patient management, assignments, audit, metrics, evaluation
│   │   ├── auth/            # JWT authentication, role dependencies, patient access checks
│   │   ├── documents/       # Upload router, OCR extractor, chunker, entity extractor, KG builder
│   │   ├── encounters/      # Clinical encounter CRUD, Neo4j sync
│   │   ├── evaluation/      # Research evaluation benchmark and dataset
│   │   ├── kg/              # Subgraph, timeline, and analytics Cypher queries
│   │   ├── llm/             # Gemini and Ollama synthesis clients
│   │   ├── models/          # SQLAlchemy ORM: User, Patient, Encounter, Assignment, Job, Audit
│   │   ├── query/           # Hybrid fusion, temporal parser, synthesizer, Q&A router
│   │   ├── workers/         # Celery task + asyncio fallback ingestion
│   │   ├── config.py        # Pydantic settings (.env)
│   │   ├── embedding_model.py  # all-MiniLM-L6-v2 singleton
│   │   ├── faiss_manager.py    # Per-patient FAISS index I/O and search
│   │   ├── main.py          # FastAPI app, CORS, rate limiter, router registration
│   │   └── neo4j_client.py  # Neo4j driver and constraint initialization
│   ├── alembic/versions/    # 001_initial_schema, 002_add_encounter_id
│   ├── scripts/             # Admin seeding and data migration scripts
│   ├── tests/               # pytest integration test suite
│   ├── requirements.txt
│   └── run.py
├── data/
│   ├── faiss/               # Per-patient FAISS indices
│   └── uploads/             # Uploaded clinical documents
├── frontend/
│   ├── src/
│   │   ├── components/      # AppLayout, ProtectedRoute, UserProfileModal
│   │   ├── context/         # AuthContext, ToastContext
│   │   ├── hooks/           # usePatientWorkspace
│   │   └── pages/
│   │       ├── admin/       # Dashboard, Users, Assignments, Audit, Evaluation
│   │       ├── doctor/      # PatientList, PatientWorkspace, workspace tabs
│   │       └── patient/     # Dashboard, Timeline, Query
│   └── package.json
├── tools/                   # Local service binaries (Windows)
├── .env.example
├── pytest.ini
├── start_all.ps1            # Start all services (Windows)
├── stop_all.ps1
└── check_services.ps1
```

---

## 🔌 API Reference

All routes are prefixed with `/api`. Authentication: `Authorization: Bearer <token>`.

**Authentication**

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate and receive JWT |
| `GET` | `/api/auth/me` | Current user profile |

**Knowledge Graph**

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/kg/patients` | Patients visible to caller (role-filtered) |
| `GET` | `/api/kg/subgraph/{patient_id}` | Patient KG in Cytoscape.js format |
| `GET` | `/api/kg/timeline/{patient_id}` | Chronological clinical timeline |
| `GET` | `/api/kg/analytics/{patient_id}` | Patient summary analytics |

**Clinical Encounters**

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/encounters` | Create encounter (Doctor/Admin) |
| `GET` | `/api/encounters/patient/{patient_id}` | List patient encounters |
| `GET` | `/api/encounters/{encounter_id}` | Encounter detail |

**Documents**

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload clinical document |
| `GET` | `/api/documents/status/{job_id}` | Processing job status |
| `GET` | `/api/documents/patient/{patient_id}` | All documents for a patient |
| `GET` | `/api/documents/encounter/{encounter_id}` | Documents for an encounter |

**Clinical Q&A**

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/query` | Evidence-grounded clinical query |
| `GET` | `/api/query/history/{patient_id}` | Query history for a patient |

**Admin** (admin role required)

| Method | Route | Description |
|---|---|---|
| `GET/POST` | `/api/admin/users` | List / create users |
| `GET/POST` | `/api/admin/patients` | List / create patient profiles |
| `GET` | `/api/admin/patients/{patient_id}` | Patient profile detail |
| `GET/POST` | `/api/admin/assignments` | List / create doctor-patient assignments |
| `DELETE` | `/api/admin/assignments/{assignment_id}` | Remove assignment |
| `GET` | `/api/admin/audit` | Audit log (filterable) |
| `GET` | `/api/admin/metrics` | System usage metrics |
| `GET` | `/api/admin/evaluation` | Run research evaluation benchmark |

**System**

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (PostgreSQL, Neo4j, Redis) |

---

## 🗄️ Data & Knowledge Model

**PostgreSQL** (transactional): `users`, `patients`, `doctor_patient_assignments`, `encounters`, `processing_jobs`, `audit_logs`.

**Neo4j** (clinical knowledge graph):

```
(Patient)-[:HAS_CONDITION {valid_from, valid_to, confidence}]->(Condition)
(Patient)-[:RECEIVED_TREATMENT {valid_from, valid_to}]->(Treatment)
(Patient)-[:HAD_ADMISSION]->(AdmissionEvent)
(Patient)-[:HAD_ENCOUNTER]->(Encounter)
(Patient)-[:HAS_DOCUMENT_CHUNK]->(DocumentChunk)
(DocumentChunk)-[:BELONGS_TO_ENCOUNTER]->(Encounter)
(DocumentChunk)-[:MENTIONS]->(Condition | Treatment)
(AdmissionEvent)-[:DIAGNOSED_WITH]->(Condition)
(AdmissionEvent)-[:TREATED_WITH]->(Treatment)
```

`valid_from` / `valid_to` on relationships encode temporal clinical validity. Conditions with no `valid_to` are currently active. `DocumentChunk` nodes carry `encounter_id` and `document_id` for full provenance.

**FAISS** (per-patient): one `IndexFlatIP` index per patient at `data/faiss/<patient_id>.index` with a companion JSON metadata file.

---

## 🕐 Temporal Reasoning

Temporal constraints are parsed from the query and applied during retrieval — not by the LLM.

| Query pattern | Example | Filter |
|---|---|---|
| Latest / most recent | "latest condition" | `LATEST` |
| As-of date | "as of 2024" | `AS_OF:YYYY-MM-DD` |
| Before a date | "before 2022" | `BEFORE:YYYY-MM-DD` |
| After a date | "after 2021" | `AFTER:YYYY-MM-DD` |
| Active / current | "current treatments" | `valid_to IS NULL` |
| Specific year | "in 2024" | `YEAR:YYYY` |
| Past 30 days | "last month" | `AFTER:<30-days-ago>` |
| Past year | "last year" | `AFTER:<365-days-ago>` |
| Historical | "previous diagnoses" | `PREVIOUS` |

---

## 🤔 Evidence-Grounded Q&A

```
POST /api/query
  1. verify_patient_access()           — 403 if doctor not assigned to this patient
  2. extract_temporal_filter(query)    — parse temporal tag from query text
  3. retrieve_graph_evidence()         — parameterized Cypher (Conditions, Treatments, etc.)
  4. search_patient_index()            — FAISS top-3 semantic search
  5. fuse_and_gate_evidence()          — score = 0.6×graph + 0.4×doc; reject if < 0.45
  6. synthesize_grounded_answer()      — LLM synthesis with [Graph:] / [Doc:] citations
  7. write AuditLog entry
  8. return answer + evidence + score
```

The LLM receives only the evidence retrieved in steps 3–4. It does not perform authorization or patient filtering. If the gate rejects (step 5), no LLM call is made.

---

## 📊 Evaluation

The evaluation module (`backend/app/evaluation/`) runs a controlled benchmark via `GET /api/admin/evaluation` (admin role required). Metrics computed from actual system execution:

| Metric | Description |
|---|---|
| Precision@K / Recall@K / F1@K | Retrieval relevance |
| MRR | Mean Reciprocal Rank |
| Hit Rate | Queries with at least one relevant result |
| Temporal Accuracy | Temporal query filter correctness |
| Evidence Groundedness | Answers grounded in retrieved evidence |
| Source Attribution | Answers containing [Graph:] or [Doc:] citations |
| Avg / Median / P95 Latency | End-to-end query latency (ms) |
| Retrieval / LLM Latency | Component-level timing |

Numerical results are produced dynamically and depend on the state of the knowledge graph and FAISS index at evaluation time.

---

## 🛡️ Security

Security-oriented access controls for a research prototype.

| Mechanism | Implementation |
|---|---|
| Authentication | JWT HS256 via `python-jose`, 1-hour expiry |
| Passwords | bcrypt via `passlib` |
| Authorization | `require_role()` for admin endpoints; `verify_patient_access()` for all patient-scoped routes |
| Patient isolation | 403 Forbidden for any unassigned patient |
| Audit logging | All uploads and queries logged with user ID, IP, and action |
| Parameterized queries | All Cypher queries use parameterized inputs |
| Rate limiting | SlowAPI — 60 requests/minute per IP |
| CORS | Configurable via `CORS_ORIGINS` |

---

## ⚙️ Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | React | 19 | UI framework |
| Frontend | Vite | 8 | Build tool / dev server |
| Frontend | React Router | 7 | Client routing, protected routes |
| Frontend | react-force-graph-2d | 1.29 | KG visualization |
| Frontend | Axios | 1.20 | HTTP client with JWT interceptor |
| Backend | FastAPI | 0.111 | Async REST API |
| Backend | Python | 3.11 | Runtime |
| Auth | python-jose + passlib | 3.3 / 1.7 | JWT + bcrypt |
| Relational DB | PostgreSQL | local | Users, RBAC, audit, jobs |
| Graph DB | Neo4j | >=5.19 | Clinical knowledge graph |
| ORM | SQLAlchemy async | >=2.0 | Async PostgreSQL via asyncpg |
| Migrations | Alembic | >=1.13 | Schema versioning |
| Task Queue | Celery + asyncio fallback | >=5.4 | Document ingestion |
| Broker | Redis | >=5.0 | Celery message broker |
| Embeddings | sentence-transformers | >=3.0 | all-MiniLM-L6-v2 (384-dim) |
| Vector Search | FAISS CPU | >=1.8 | Per-patient IndexFlatIP |
| OCR | PyMuPDF + Tesseract | >=1.24 / >=0.3 | PDF + image extraction |
| NLP | SciSpacy + NLTK | >=0.5.4 | Biomedical NER |
| LLM | Gemini / Ollama | configurable | Answer synthesis |
| Rate Limiting | SlowAPI | >=0.1.9 | Per-IP throttling |
| Testing | pytest + pytest-asyncio | >=8.0 | Async integration tests |

---

## ⚠️ Limitations

- **Synthetic data only.** No real patient data is used or should be used.
- **Research prototype.** Not clinically validated; must not be used for diagnosis, treatment decisions, or any real clinical workflow.
- **Not a replacement for professional medical judgment.**
- **Celery on Windows.** Celery does not reliably support `fork`-based multiprocessing on Windows. The system falls back to `asyncio.create_task` for document ingestion automatically.
- **FAISS persistence.** Per-patient indices are flat files on disk with no concurrency protection.
- **LLM dependency.** Answer synthesis requires a configured Gemini API key or running Ollama instance.

---

## 🔬 Research Context

ClinicalKG is a B.Tech research project exploring temporal clinical information retrieval over a patient knowledge graph. The system investigates whether combining structured graph retrieval (Neo4j), per-patient semantic retrieval (FAISS), temporal constraint extraction, and a deterministic evidence sufficiency gate produces more traceable and hallucination-resistant clinical answers than standard RAG approaches.

All clinical data is synthetic. The project does not claim novel algorithms — it investigates the engineering feasibility and retrieval quality of this architecture on synthetic patient records.

---

## 📚 References

- [FastAPI](https://fastapi.tiangolo.com/)
- [Neo4j Python Driver](https://neo4j.com/docs/python-manual/current/)
- [FAISS](https://faiss.ai/)
- [sentence-transformers](https://www.sbert.net/)
- [SciSpacy](https://allenai.github.io/scispacy/)
- [PyMuPDF](https://pymupdf.readthedocs.io/)
- [Google Generative AI Python SDK](https://github.com/google/generative-ai-python)
- [Celery](https://docs.celeryq.dev/)
- [Alembic](https://alembic.sqlalchemy.org/)
- [React](https://react.dev/) / [Vite](https://vitejs.dev/)

---

## 🛡️ License

No license file is currently present in this repository.
