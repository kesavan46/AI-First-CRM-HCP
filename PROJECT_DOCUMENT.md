# AI-Powered Pharmaceutical CRM — Project Document

**Version:** 1.0  
**Date:** July 2026  
**Stack:** FastAPI · LangGraph · Groq · React · PostgreSQL

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [Backend — API Reference](#5-backend--api-reference)
6. [AI / LangGraph Pipeline](#6-ai--langgraph-pipeline)
7. [Frontend — Pages & Components](#7-frontend--pages--components)
8. [State Management](#8-state-management)
9. [Authentication & Security](#9-authentication--security)
10. [Environment Configuration](#10-environment-configuration)
11. [Setup & Running Locally](#11-setup--running-locally)
12. [Known Limitations & Future Work](#12-known-limitations--future-work)

---

## 1. Project Overview

The AI-Powered Pharmaceutical CRM is a full-stack web application built for pharmaceutical sales representatives. It lets reps log, track, and analyse their interactions with doctors (HCPs — Healthcare Professionals) either through a structured form or by chatting naturally with an AI assistant.

### Core capabilities

| Capability | Description |
|---|---|
| Form-based logging | Structured form: doctor, date, type, product, notes, follow-up |
| AI chat logging | Natural language → LangGraph agent → extracted fields → save |
| Interaction history | Searchable, filterable DataGrid with edit and delete |
| Doctor profiles | Engagement stats, interaction timeline, follow-up tracker |
| Dashboard | KPI cards, weekly trend chart, outcome pie, product bar chart |
| AI analysis | Sentiment detection, action item extraction, follow-up suggestion |

### User roles

| Role | Permissions |
|---|---|
| `rep` | Create / read / update / delete own interactions; read all doctors |
| `manager` | Read all interactions; read all doctors |
| `admin` | Full access including doctor deletion |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                      │
│  Redux Store ──► Pages ──► Axios ──► /api/v1/*                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / JSON
┌────────────────────────────▼────────────────────────────────────┐
│                     FastAPI  (port 8000)                        │
│                                                                 │
│  /api/v1/auth/*          JWT OAuth2 password flow               │
│  /api/v1/interactions/*  CRUD + pagination + filters            │
│  /api/v1/doctors/*       Doctor directory CRUD                  │
│  /api/v1/ai/*            AI analysis endpoints                  │
│  /api/v1/chat/langgraph  LangGraph chat endpoint                │
│                                                                 │
│  Services layer ──► SQLAlchemy async ORM ──► PostgreSQL 15      │
│                                                                 │
│  LangGraph agent ──► Groq API (gemma2-9b-it)                    │
│    └── 5 tools: log · edit · search · profile · follow-ups      │
└─────────────────────────────────────────────────────────────────┘
                             │
                 ┌───────────▼───────────┐
                 │    PostgreSQL 15       │
                 │  tables: users,        │
                 │  doctors, interactions │
                 └───────────────────────┘
```

### Directory layout

```
AI-powered CRM/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangGraph graph + 5 CRM tools
│   │   ├── core/            # Config, LLM factory, JWT helpers
│   │   ├── db/              # Async SQLAlchemy engine + Alembic
│   │   ├── models/          # ORM models (User, Doctor, Interaction)
│   │   ├── routers/         # FastAPI route handlers
│   │   ├── schemas/         # Pydantic v2 request/response models
│   │   ├── services/        # Business logic layer
│   │   └── utils/           # Pagination, logging, exceptions
│   ├── alembic.ini
│   └── requirements.txt
│
└── my-app/                  # React + Vite frontend
    └── src/
        ├── components/      # Shared UI (layout, dialogs, banners)
        ├── pages/           # Dashboard, LogInteraction, History, DoctorProfile
        ├── store/           # Redux slices + thunks
        ├── services/        # Axios API clients
        └── router/          # React Router v6 routes
```

---

## 3. Tech Stack

### Backend

| Layer | Technology | Version |
|---|---|---|
| Web framework | FastAPI | 0.110+ |
| AI orchestration | LangGraph | 0.2+ |
| LLM provider | Groq (gemma2-9b-it) | — |
| LLM client | LangChain + langchain-groq | — |
| ORM | SQLAlchemy (async) | 2.0 |
| Migrations | Alembic | — |
| Database | PostgreSQL | 15+ |
| Validation | Pydantic v2 | — |
| Auth | python-jose (JWT) + passlib | — |
| Runtime | Python | 3.11+ |

### Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | React + Vite | 18 / 5+ |
| State management | Redux Toolkit | — |
| Routing | React Router | v6 |
| HTTP client | Axios | — |
| UI component library | Material UI (MUI) | v6 |
| Data grid | MUI X DataGrid | — |
| Charts | Recharts | — |
| Runtime | Node.js | 18+ |

---

## 4. Database Schema

### Table: `users`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| email | VARCHAR(255) | Unique, indexed |
| full_name | VARCHAR(255) | — |
| hashed_password | VARCHAR(255) | bcrypt via passlib |
| role | VARCHAR(50) | `rep` · `manager` · `admin` |
| is_active | BOOLEAN | Default `true` |
| created_at | TIMESTAMPTZ | Server default |
| updated_at | TIMESTAMPTZ | Auto-updated |

### Table: `doctors`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| first_name | VARCHAR(100) | Required |
| last_name | VARCHAR(100) | Required |
| email | VARCHAR(255) | Unique, nullable |
| phone | VARCHAR(30) | Nullable |
| specialty | VARCHAR(100) | Nullable |
| designation | VARCHAR(100) | Nullable |
| institution | VARCHAR(255) | Nullable |
| city | VARCHAR(100) | Nullable |
| state | VARCHAR(100) | Nullable |
| country | VARCHAR(100) | Default `India` |
| notes | TEXT | Nullable |
| created_at | TIMESTAMPTZ | Server default |
| updated_at | TIMESTAMPTZ | Auto-updated |

### Table: `interactions`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | Auto-generated |
| doctor_id | UUID (FK → doctors) | CASCADE delete |
| user_id | UUID (FK → users) | SET NULL on delete |
| interaction_date | TIMESTAMPTZ | Required, indexed |
| interaction_type | VARCHAR(50) | `visit·call·email·conference·virtual` |
| product_discussed | VARCHAR(255) | Nullable |
| summary | TEXT | Rep-written, nullable |
| notes | TEXT | Rep-written, nullable |
| follow_up_date | TIMESTAMPTZ | Nullable, indexed |
| status | VARCHAR(30) | `draft·submitted·reviewed` |
| ai_summary | TEXT | AI-generated, nullable |
| ai_sentiment | VARCHAR(20) | `positive·neutral·negative` |
| ai_action_items | TEXT[] | PostgreSQL array, nullable |
| ai_follow_up_date | TIMESTAMPTZ | AI-suggested, nullable |
| ai_processed | BOOLEAN | Default `false` |
| created_at | TIMESTAMPTZ | Server default |
| updated_at | TIMESTAMPTZ | Auto-updated |


---

## 5. Backend — API Reference

All endpoints are prefixed with `/api/v1`. Every endpoint except `/auth/token` and `/auth/register` requires a valid `Authorization: Bearer <token>` header.

### 5.1 Authentication — `/auth`

| Method | Path | Description |
|---|---|---|
| POST | `/auth/token` | Login — returns `access_token` + `refresh_token` |
| POST | `/auth/register` | Register a new user |
| POST | `/auth/refresh` | Exchange refresh token for a new access token |
| GET | `/auth/me` | Return the current authenticated user |
| POST | `/auth/logout` | Invalidate the refresh token |

**Login request body:**
```json
{
  "username": "rep@example.com",
  "password": "secret"
}
```

**Login response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

### 5.2 Interactions — `/interactions`

| Method | Path | Description |
|---|---|---|
| POST | `/interactions/` | Create a new interaction |
| GET | `/interactions/` | List interactions (paginated + filtered) |
| GET | `/interactions/{id}` | Get a single interaction |
| PUT | `/interactions/{id}` | Full replace |
| PATCH | `/interactions/{id}` | Partial update |
| DELETE | `/interactions/{id}` | Delete (own records only) |
| GET | `/interactions/doctor/{doctor_id}` | All interactions for a doctor |

**GET `/interactions/` query parameters:**

| Parameter | Type | Description |
|---|---|---|
| skip | int | Records to skip (default 0) |
| limit | int | Max records (1–100, default 20) |
| status | string | Filter: `draft·submitted·reviewed` |
| interaction_type | string | Filter: `visit·call·email·conference·virtual` |
| doctor_id | UUID | Filter to a specific doctor |

**Create / Update request body:**
```json
{
  "doctor_id": "uuid",
  "interaction_date": "2026-07-14T10:00:00Z",
  "interaction_type": "visit",
  "product_discussed": "CardioPlus",
  "summary": "Brief summary here",
  "notes": "Detailed notes here",
  "follow_up_date": "2026-07-28T10:00:00Z",
  "status": "draft"
}
```

**Response (InteractionRead):**
```json
{
  "id": "uuid",
  "doctor_id": "uuid",
  "user_id": "uuid",
  "interaction_date": "2026-07-14T10:00:00Z",
  "interaction_type": "visit",
  "product_discussed": "CardioPlus",
  "summary": "...",
  "notes": "...",
  "follow_up_date": "2026-07-28T10:00:00Z",
  "status": "draft",
  "ai_summary": null,
  "ai_sentiment": null,
  "ai_action_items": null,
  "ai_follow_up_date": null,
  "ai_processed": false,
  "created_at": "2026-07-14T10:00:00Z",
  "updated_at": "2026-07-14T10:00:00Z",
  "doctor": { "id": "uuid", "first_name": "Anjali", "last_name": "Mehta", "..." }
}
```

---

### 5.3 Doctors — `/doctors`

| Method | Path | Description |
|---|---|---|
| GET | `/doctors/` | List doctors (paginated + searchable) |
| POST | `/doctors/` | Create a new doctor |
| GET | `/doctors/{id}` | Get a single doctor |
| PATCH | `/doctors/{id}` | Partial update |
| DELETE | `/doctors/{id}` | Delete (admin only) |

**GET `/doctors/` query parameters:**

| Parameter | Type | Description |
|---|---|---|
| skip | int | Records to skip (default 0) |
| limit | int | Max records (1–100, default 20) |
| search | string | Search first name, last name, or institution |
| specialty | string | Filter by medical specialty |

---

### 5.4 AI Endpoints — `/ai`

| Method | Path | Description |
|---|---|---|
| POST | `/ai/analyze` | Run full AI pipeline on a saved interaction |
| POST | `/ai/quick-summary` | AI preview on raw text (no DB write) |
| GET | `/ai/status/{interaction_id}` | Check AI processing status |

**POST `/ai/analyze` request:**
```json
{ "interaction_id": "uuid" }
```

**POST `/ai/quick-summary` request:**
```json
{
  "notes": "Visited Dr Mehta at Apollo, discussed CardioPlus trial data...",
  "interaction_type": "visit",
  "doctor_name": "Dr. Anjali Mehta"
}
```

**AI analysis response:**
```json
{
  "ai_summary": "Productive visit focusing on CardioPlus trial outcomes.",
  "ai_sentiment": "positive",
  "ai_action_items": ["Send updated trial PDF", "Schedule follow-up in 2 weeks"],
  "ai_follow_up_date": "2026-07-28T00:00:00Z"
}
```

---

### 5.5 Chat / LangGraph — `/chat`

| Method | Path | Description |
|---|---|---|
| POST | `/chat/langgraph` | Send message to LangGraph agent |
| GET | `/chat/history` | Conversation history (client-managed) |

**POST `/chat/langgraph` request:**
```json
{
  "message": "I visited Dr Ravi today at Apollo, discussed CardioPlus",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "context": { "type": "doctor", "id": "uuid" }
}
```

**Response:**
```json
{
  "reply": "Got it! I've logged your visit with Dr. Ravi Kumar at Apollo...",
  "extracted_fields": {
    "doctor_name": "Dr. Ravi Kumar",
    "hospital": "Apollo Hospitals",
    "date": "2026-07-14",
    "interaction_type": "visit",
    "product": "CardioPlus",
    "notes": "...",
    "follow_up": "...",
    "outcome": "positive"
  }
}
```


---

## 6. AI / LangGraph Pipeline

### 6.1 Graph topology

```
START
  │
  ▼
understand_request   ── LLM classifies intent into one of 5 categories
  │
  ├─ clarification_needed ──► clarify ──► END (question returned to user)
  │
  └─ intent_clear ──►
                     │
                     ▼
                   choose_tool   ── LLM extracts tool arguments
                     │
                     ├─ unknown ──► unknown_tool ──► return_response
                     │
                     └─ known ──►
                                 │
                                 ▼
                              execute_tool   ── tool hits PostgreSQL
                                 │
                                 ├─ error ──► handle_error ──► return_response
                                 │
                                 └─ ok ──► return_response
                                             │
                                             ▼
                                           END
```

Every message makes **2–3 LLM calls** (classify → extract args → format response).

### 6.2 The 5 CRM tools

| Tool | Trigger phrase examples | What it does |
|---|---|---|
| `log_interaction` | "I visited Dr Ravi today…" | LLM extracts fields → INSERT into interactions |
| `edit_interaction` | "Update my last visit notes…" | UPDATE specific fields by interaction UUID |
| `search_interactions` | "Show me interactions with Dr Mehta last week" | SELECT with name/date/type filters |
| `doctor_profile` | "What do I know about Dr Priya?" | Full profile + last 5 interactions + follow-ups |
| `follow_up_reminders` | "Any follow-ups due this week?" | SELECT follow_up_date in next N days |

### 6.3 LLM configuration

| Parameter | Value | Where set |
|---|---|---|
| Provider | Groq | `GROQ_API_KEY` in `.env` |
| Default model | `gemma2-9b-it` | `GROQ_MODEL` in `.env` |
| Classification temperature | 0.0 (deterministic) | `get_llm_deterministic()` |
| Response temperature | 0.3 | `get_llm()` |
| Max tokens | 1024 | `LLM_MAX_TOKENS` in `.env` |

### 6.4 Chat flow (frontend → backend → DB)

```
User types message
       │
       ▼
sendMessageThunk (Redux)
       │  POST /api/v1/chat/langgraph
       ▼
langgraph_chat (FastAPI router)
       │  run_workflow_agent(message)
       ▼
LangGraph graph
       │  understand_request → choose_tool → execute_tool → return_response
       ▼
{ reply, extracted_fields }
       │
       ▼
chatSlice.addMessage  ──► latestExtractedFields updated
       │
       ▼
ExtractedFieldsEditor (right panel) — user edits if needed
       │
       ▼
"Save Interaction" → POST /api/v1/interactions
```

---

## 7. Frontend — Pages & Components

### 7.1 Pages

#### Dashboard (`/`)
Sales overview page. Shows:
- **4 KPI stat cards** — Today's Visits, Pending Follow-ups, Doctors Covered, Positive Outcomes %
- **Interaction Trend Chart** — Area chart of visits/calls/emails by day of week (Recharts)
- **Outcome Breakdown** — Donut pie chart (positive / neutral / negative)
- **Recent Interactions** — Last 5 interactions from the DB with doctor name, type, outcome chip
- **Pending Follow-ups** — Priority-sorted follow-up list with due-date chips
- **Product Performance** — Stacked bar chart of outcomes per product
- **Territory Coverage** — Progress bars per sales territory

Data source: `GET /api/v1/interactions` (up to 50 records) + `GET /api/v1/doctors`.

---

#### Log Interaction (`/log`)
Two-tab page for creating interaction records.

**Tab 1 — Structured Form**
Standard MUI form with fields: doctor (autocomplete), date/time picker, interaction type, product, summary, notes, follow-up date, status. Submits to `POST /api/v1/interactions`.

**Tab 2 — AI Chat**
- Left panel: chat thread with typing indicator and suggestion chips
- Right panel: `ExtractedFieldsEditor` — shows fields extracted by the LangGraph agent, all editable inline
- "Save Interaction" button calls `POST /api/v1/interactions` with the (edited) extracted fields
- "Transfer to Form" pre-fills Tab 1 with the extracted fields

---

#### Interaction History (`/history`)
MUI X DataGrid displaying all interactions with:
- Search bar (doctor name / product)
- Filter controls (type, status, date range)
- Column sort
- Row actions: **View** (ViewInteractionDialog), **Edit** (EditInteractionDialog), **Delete**
- Pagination (server-side)

Data source: `GET /api/v1/interactions` with skip/limit/filter params.

---

#### Doctor Profile (`/doctors/:id`)
Doctor-specific page, visually distinct from Dashboard (teal accent color).

**Left card — Identity**
Name, specialty, designation, institution, phone, email, city/state, territory, tier badge, active status, pending follow-up count.

**Right card — 3 tabs:**

| Tab | Content |
|---|---|
| Overview | Bio · Engagement stats row (visits/calls/emails/positive rate/total) · Products Discussed bars · Last Interaction summary |
| Interactions | Vertical timeline — colored dot per type, inline chips for type + product + sentiment, notes |
| Follow-ups | Color-coded cards per urgency (overdue 🔴 / today 🟠 / soon 🟡 / upcoming 🟢), sorted by date |

Data source: `GET /api/v1/doctors/{id}` + `GET /api/v1/interactions/doctor/{id}`.

---

### 7.2 Shared components

| Component | Location | Purpose |
|---|---|---|
| `AppShell` | `components/layout/` | Sidebar + Navbar wrapper |
| `Sidebar` | `components/layout/` | Navigation links |
| `Navbar` | `components/layout/` | Top bar with user menu |
| `AIChatPanel` | `components/layout/` | Floating AI assistant panel |
| `EditInteractionDialog` | `components/common/` | Modal for editing an interaction |
| `ViewInteractionDialog` | `components/common/` | Read-only interaction detail modal |
| `ApiErrorBanner` | `components/common/` | Dismissible error alerts tied to Redux error keys |
| `ErrorBoundary` | `components/common/` | React error boundary wrapper |
| `LoadingStates / PageLoader` | `components/common/` | Skeleton / spinner utilities |
| `ProtectedRoute` | `components/common/` | Redirects unauthenticated users to `/login` |

---

## 8. State Management

Redux Toolkit store with 6 slices:

| Slice | State held | Key actions |
|---|---|---|
| `authSlice` | `user`, `accessToken`, `refreshToken`, `status` | `setCredentials`, `clearAuth` |
| `interactionsSlice` | `items[]`, `pagination`, `filters`, `status` | `setInteractions`, `addInteraction`, `updateInteraction`, `removeInteraction` |
| `doctorsSlice` | `items[]`, `selected`, `pagination`, `filters` | `setDoctors`, `setSelectedDoctor` |
| `chatSlice` | `messages[]`, `isTyping`, `latestExtractedFields`, `error` | `addMessage`, `setTyping`, `clearMessages` |
| `loadingSlice` | `loadingKeys{}` | `setLoading`, `clearLoading` |
| `errorsSlice` | `errorKeys{}` | `setError`, `clearError` |

### Thunks (async actions)

| Thunk | API call |
|---|---|
| `fetchInteractionsThunk` | `GET /interactions` |
| `createInteractionThunk` | `POST /interactions` |
| `updateInteractionThunk` | `PATCH /interactions/{id}` |
| `deleteInteractionThunk` | `DELETE /interactions/{id}` |
| `fetchDoctorsThunk` | `GET /doctors` |
| `fetchDoctorByIdThunk` | `GET /doctors/{id}` |
| `fetchDoctorInteractionsThunk` | `GET /interactions/doctor/{id}` |
| `sendMessageThunk` | `POST /chat/langgraph` |
| `fetchChatHistoryThunk` | `GET /chat/history` |


---

## 9. Authentication & Security

### Flow

1. User submits email + password to `POST /api/v1/auth/token`
2. FastAPI verifies password with bcrypt, issues a short-lived **JWT access token** (default 1440 min) and a **refresh token**
3. Frontend stores tokens in Redux; Axios attaches `Authorization: Bearer <token>` to every request via an interceptor
4. On 401 responses, the Axios interceptor automatically calls `POST /auth/refresh` and retries the original request
5. `POST /auth/logout` invalidates the refresh token server-side

### JWT configuration

| Setting | Default | Env var |
|---|---|---|
| Algorithm | HS256 | `ALGORITHM` |
| Secret key | — (must be set) | `SECRET_KEY` |
| Access token expiry | 1440 minutes | `ACCESS_TOKEN_EXPIRE_MINUTES` |

### Route protection

- All FastAPI routes use `CurrentUser` dependency (`Depends(get_current_user)`) which validates the JWT
- Admin-only routes use `AdminUser` dependency which additionally checks `user.role == "admin"`
- All React routes inside `AppShell` are wrapped with `ProtectedRoute`, which redirects to `/login` if no valid token is present

---

## 10. Environment Configuration

### Backend — `backend/.env`

```env
# Application
APP_NAME="AI-Powered CRM"
APP_VERSION="0.1.0"
DEBUG=false

# CORS — comma-separated allowed origins
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"

# Database — async driver for app, sync driver for Alembic
DATABASE_URL="postgresql+asyncpg://postgres:password@localhost:5432/crm_db"
SYNC_DATABASE_URL="postgresql+psycopg2://postgres:password@localhost:5432/crm_db"

# JWT — generate key with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY="your-secret-key-here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Groq LLM
GROQ_API_KEY="gsk_your_key_here"
GROQ_MODEL="gemma2-9b-it"
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=1024
```

### Frontend — `my-app/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 11. Setup & Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- A Groq API key — free tier at https://console.groq.com

### Step 1 — Database

```bash
psql -U postgres -c "CREATE DATABASE crm_db;"
```

### Step 2 — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, SECRET_KEY, GROQ_API_KEY

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

### Step 3 — Frontend

```bash
cd my-app

npm install

# Confirm .env has:
# VITE_API_BASE_URL=http://localhost:8000/api

npm run dev
```

App available at: http://localhost:5173

### Step 4 — Production build (frontend)

```bash
cd my-app
npm run build
# Output in my-app/dist/
```

---

## 12. Known Limitations & Future Work

### Current limitations

| Area | Issue |
|---|---|
| `extracted_fields` in chat | The agent returns formatted prose; the JSON regex in `ai.py` rarely finds a JSON object, so the right-panel editor stays mostly empty after a chat turn |
| `edit_interaction` tool | Requires an interaction UUID that users never know. "Update my last visit" fails because no UUID is extracted from natural text |
| LLM model size | `gemma2-9b-it` can mis-classify intent on ambiguous inputs (~15–25% error rate). Switching to `llama3-70b-8192` improves accuracy |
| Multi-call overhead | Each chat message makes 2–3 sequential LLM calls adding ~2–4 s latency |
| Chat history | Conversation context is client-managed (sent with each request). Server has no persistent memory across sessions |
| Dashboard charts | Trend, outcome, and product charts use static mock data — not wired to the real interaction dataset yet |
| Follow-ups on dashboard | Pending follow-up list is static mock data; real data requires a dedicated `GET /interactions?has_follow_up=true` query |
| Doctor tier / territory | `tier` and `territory` fields exist in mock data but are not in the `Doctor` ORM model or DB schema |

### Suggested improvements

1. **Fix `extracted_fields`** — prompt `return_response` node to always output a JSON block alongside the prose reply, then parse it cleanly
2. **Fix `edit_interaction`** — when no UUID is provided, query the DB for the user's most recent interaction and use its ID
3. **Upgrade LLM** — set `GROQ_MODEL=llama3-70b-8192` in `.env` for better accuracy
4. **Streaming responses** — use Groq streaming + SSE to show the agent's reply word-by-word instead of waiting for the full response
5. **Persistent chat sessions** — store conversation history in a `chat_sessions` table keyed by user ID
6. **Wire dashboard charts to real data** — compute trend, outcome, and product data from the interactions table via new `/api/v1/analytics` endpoints
7. **Add `tier` and `territory` to Doctor model** — Alembic migration + UI filter on doctor list
8. **Role-based UI** — hide admin controls from `rep` users in the frontend
9. **Email / push notifications** — notify reps when a follow-up is due today
10. **Export** — CSV / PDF export of interaction history for reporting
