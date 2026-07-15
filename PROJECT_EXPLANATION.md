# AI-Powered Pharmaceutical CRM — Complete Project Guide

## 🚀 Project Status

**Backend:**  ✅ Running on http://localhost:8000  
**Frontend:** ✅ Running on http://localhost:5173  
**Database:** ✅ PostgreSQL connected (crm_db with 4 tables)  
**AI:**       ✅ Groq LLM validated (llama-3.1-8b-instant)

---

## 📋 Project Overview

This is a **full-stack AI-powered CRM** built for pharmaceutical sales representatives to log and analyze their interactions with doctors. The system offers **two ways to log interactions**:

1. **Structured Form** — traditional form-based data entry
2. **Conversational AI Chat** — natural language powered by LangGraph + Groq

### Core Features

| Feature | Description |
|---------|-------------|
| **Form Logging** | Structured form with doctor selection, date, type, product, notes, follow-up |
| **AI Chat Logging** | Chat naturally with AI → extracts all fields automatically |
| **Interaction History** | DataGrid with search, filter, edit, delete, and view dialogs |
| **Doctor Profiles** | Complete interaction timeline, tier, territory, quick stats |
| **Dashboard** | KPI cards, trend charts, outcome pie charts, product bar charts |
| **AI Analysis** | Sentiment detection, action items, follow-up suggestions |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Pages: Dashboard | LogInteraction | History | Profile   │  │
│  │  State: Redux Toolkit (6 slices + thunks)                │  │
│  │  UI: Material UI + MUI DataGrid + Recharts               │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Axios HTTP
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      BACKEND (FastAPI)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Routers: auth | interactions | doctors | ai              │ │
│  │  Services: Business logic layer                           │ │
│  │  Models: SQLAlchemy ORM (Doctor, Interaction, User)       │ │
│  │  AI: LangGraph workflow with 5 CRM tools                  │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ asyncpg
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                   DATABASE (PostgreSQL 18)                      │
│  Tables: doctors | interactions | users | alembic_version      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Complete File Structure & Key Code

### **Backend** (`D:\AI-powered CRM\backend\`)

#### 🔧 **Core Configuration**

**`app/core/config.py`** — All environment variables  
```python
class Settings(BaseSettings):
    DATABASE_URL: str  # postgresql+asyncpg://...
    GROQ_API_KEY: str
    SECRET_KEY: str
    ...
```

**`app/core/llm.py`** — Groq LLM factory  
```python
def get_llm(temperature=None, max_tokens=None, model=None) -> ChatGroq:
    """Returns configured LangChain ChatGroq instance"""
    
def validate_groq_connection():
    """Validates Groq API at startup"""
```

**`app/core/security.py`** — JWT auth helpers  
```python
def create_access_token(data: dict) -> str
def verify_token(token: str) -> dict
```

---

#### 🗄️ **Database Layer**

**`app/db/session.py`** — SQLAlchemy async engine  
```python
engine = create_async_engine(settings.DATABASE_URL, ...)
AsyncSessionLocal = async_sessionmaker(bind=engine, ...)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for DB sessions"""
```

**`app/db/base.py`** — Declarative base  
```python
class Base(DeclarativeBase):
    """All models inherit from this"""
```

**`app/db/migrations/env.py`** — Alembic config  
```python
# Imports all models for autogenerate
from app.models import Doctor, Interaction, User
```

---

#### 📊 **ORM Models**

**`app/models/doctor.py`**  
```python
class Doctor(Base):
    id: UUID (PK)
    first_name, last_name, email, phone
    specialty, designation, institution
    city, state, country
    notes, created_at, updated_at
    
    # Relationship
    interactions: list["Interaction"]
```

**`app/models/interaction.py`**  
```python
class Interaction(Base):
    id: UUID (PK)
    doctor_id: UUID (FK → doctors)
    user_id: UUID (FK → users)
    
    # User-supplied
    interaction_date, interaction_type, product_discussed
    summary, notes, follow_up_date, status
    
    # AI-generated
    ai_summary, ai_sentiment, ai_action_items
    ai_follow_up_date, ai_processed
    
    created_at, updated_at
```

**`app/models/user.py`**  
```python
class User(Base):
    id: UUID (PK)
    email, full_name, hashed_password
    role, is_active
    created_at, updated_at
```

---

#### 🛣️ **API Routers**

**`app/routers/auth.py`**  
```python
POST /api/v1/auth/register  → Create new user
POST /api/v1/auth/login     → Return JWT token
GET  /api/v1/auth/me        → Get current user
```

**`app/routers/interactions.py`**  
```python
POST   /api/v1/interactions              → Create interaction
GET    /api/v1/interactions              → List (paginated, filtered)
GET    /api/v1/interactions/{id}         → Get single
PUT    /api/v1/interactions/{id}         → Full replace
PATCH  /api/v1/interactions/{id}         → Partial update
DELETE /api/v1/interactions/{id}         → Delete
GET    /api/v1/interactions/doctor/{id}  → All for a doctor
```

**`app/routers/doctors.py`**  
```python
GET    /api/v1/doctors       → List doctors (search, filter)
POST   /api/v1/doctors       → Create doctor
GET    /api/v1/doctors/{id}  → Get single
PATCH  /api/v1/doctors/{id}  → Update
DELETE /api/v1/doctors/{id}  → Delete (admin only)
```

**`app/routers/ai.py`**  
```python
POST /api/v1/ai/analyze       → Run AI pipeline on saved interaction
POST /api/v1/ai/quick-summary → Ad-hoc preview (no DB write)
GET  /api/v1/ai/status/{id}   → Check AI processing status
```

---

#### 🤖 **AI / LangGraph System**

**`app/agents/crm_workflow_agent.py`** — Main LangGraph workflow  
```python
# Graph topology:
#   understand_request → choose_tool → execute_tool → return_response
#
# 5 CRM tools available:
#   1. log_interaction
#   2. edit_interaction
#   3. search_interactions
#   4. doctor_profile
#   5. follow_up_reminders

def create_workflow() -> StateGraph:
    """Builds the full LangGraph pipeline"""
```

**`app/agents/crm_tools.py`** — Tool implementations  
```python
@tool
async def log_interaction(doctor_name, date, notes, ...) -> str:
    """Logs new interaction from natural language"""

@tool
async def search_interactions(doctor_name, date_from, date_to) -> str:
    """Searches interaction history"""

@tool
async def doctor_profile(doctor_name) -> str:
    """Returns doctor info + recent interactions"""

@tool
async def edit_interaction(interaction_id, **updates) -> str:
    """Updates existing interaction"""

@tool
async def follow_up_reminders(days_ahead) -> str:
    """Returns upcoming follow-ups"""
```

**`app/agents/state.py`** — LangGraph state schema  
```python
class CRMState(TypedDict):
    messages: Annotated[list, add_messages]
    user_id: str
    intent: str
    tool_name: str
    tool_result: str
    final_response: str
```

**`app/agents/nodes.py`** — Node functions  
```python
async def understand_request(state: CRMState) -> dict:
    """Classifies user intent"""

async def choose_tool(state: CRMState) -> dict:
    """Maps intent → tool name"""

async def execute_tool(state: CRMState) -> dict:
    """Runs the selected tool"""

async def return_response(state: CRMState) -> dict:
    """Formats final reply"""
```

---

#### 🔧 **Services** (Business Logic)

**`app/services/interaction_service.py`**  
```python
class InteractionService:
    async def create_interaction(payload, user_id) -> Interaction
    async def list_interactions(user_id, skip, limit, ...) -> InteractionPage
    async def get_interaction(id) -> Interaction
    async def replace_interaction(id, payload, user_id) -> Interaction
    async def patch_interaction(id, payload, user_id) -> Interaction
    async def delete_interaction(id, user_id) -> None
    async def list_by_doctor(doctor_id, skip, limit) -> InteractionPage
```

**`app/services/doctor_service.py`**  
```python
class DoctorService:
    async def list_doctors(skip, limit, search, specialty) -> list[Doctor]
    async def create_doctor(payload) -> Doctor
    async def get_doctor(id) -> Doctor
    async def update_doctor(id, payload) -> Doctor
    async def delete_doctor(id) -> None
```

**`app/services/ai_service.py`**  
```python
class AIService:
    async def analyze_interaction(interaction_id) -> AIAnalysisResponse
    async def quick_summary(payload) -> AIQuickSummaryResponse
    async def get_ai_status(interaction_id) -> AIStatusResponse
```

**`app/services/auth_service.py`**  
```python
class AuthService:
    async def register(payload) -> User
    async def login(payload) -> TokenResponse
```

---

#### 📦 **Schemas** (Pydantic)

**`app/schemas/interaction.py`**  
```python
class InteractionCreate(BaseModel):
    doctor_id: UUID
    interaction_date: datetime
    interaction_type: str
    product_discussed: str | None
    summary: str | None
    notes: str | None
    follow_up_date: datetime | None

class InteractionRead(BaseModel):
    id: UUID
    # ... all fields + nested doctor object
    doctor: DoctorRead

class InteractionPage(BaseModel):
    items: list[InteractionRead]
    total: int
    page: int
    pages: int
```

**`app/schemas/doctor.py`**, **`app/schemas/user.py`**, **`app/schemas/ai.py`**  
Similar request/response models for each domain.

---

#### 🛠️ **Utilities**

**`app/utils/logging.py`** — Structured logging setup  
**`app/utils/exceptions.py`** — Custom exception classes  
**`app/utils/pagination.py`** — Pagination helpers  

---

#### 🚀 **Entry Point**

**`app/main.py`**  
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    await validate_groq_connection()
    
    yield
    
    # Shutdown
    await engine.dispose()

app = create_app()
# Includes all routers, CORS, exception handlers
```

---

### **Frontend** (`D:\AI-powered CRM\my-app\`)

#### 📄 **Pages**

**`src/pages/Dashboard/index.jsx`**  
- KPI cards (total interactions, pending follow-ups, doctors contacted)
- Trend line chart (interactions over time)
- Outcome pie chart (positive/neutral/negative)
- Product bar chart (most discussed products)

**`src/pages/LogInteraction/index.jsx`**  
- Two tabs:
  1. **Structured Form** (`StructuredForm.jsx`) — traditional form
  2. **Conversational Chat** (`ConversationalChat.jsx`) — AI-powered
- After chat, shows **ExtractedFieldsEditor** for review/edit before saving

**`src/pages/InteractionHistory/index.jsx`**  
- MUI DataGrid with:
  - Search bar
  - Status filter dropdown
  - Type filter dropdown
  - Edit/Delete/View actions per row
- Edit Dialog (`EditInteractionDialog.jsx`)
- View Dialog (`ViewInteractionDialog.jsx`)

**`src/pages/DoctorProfile/index.jsx`**  
- Doctor info card (specialty, institution, contact)
- Interaction timeline (sorted by date, filterable by type)
- Quick stats (total interactions, last contact date)

---

#### 🗃️ **Redux State Management**

**`src/store/index.js`** — Redux store  
```javascript
configureStore({
  reducer: {
    auth: authReducer,
    interactions: interactionsReducer,
    doctors: doctorsReducer,
    chat: chatReducer,
    loading: loadingReducer,
    errors: errorsReducer,
  },
})
```

**`src/store/slices/authSlice.js`**  
```javascript
// State: user, token, isAuthenticated
// Actions: login, logout, checkAuth
```

**`src/store/slices/interactionsSlice.js`** + `interactionsThunks.js`  
```javascript
// Thunks:
fetchInteractions(filters)
createInteraction(payload)
updateInteraction(id, payload)
deleteInteraction(id)
fetchInteractionById(id)
```

**`src/store/slices/doctorsSlice.js`** + `doctorsThunks.js`  
```javascript
// Thunks:
fetchDoctors(filters)
fetchDoctorById(id)
```

**`src/store/slices/chatSlice.js`** + `chatThunks.js`  
```javascript
// Thunks:
sendChatMessage(message, history)

// State:
messages: []
extractedFields: {}  // from AI response
isLoading: boolean
```

**`src/store/slices/loadingSlice.js`**  
```javascript
// Tracks loading state for each async action
{ fetchInteractions: true, createInteraction: false, ... }
```

**`src/store/slices/errorsSlice.js`**  
```javascript
// Stores error messages by action type
{ fetchInteractions: "Network error", ... }
```

---

#### 🌐 **API Services** (Axios)

**`src/services/apiClient.js`** — Axios instance with auth interceptor  
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,  // http://localhost:8000/api
})

// Request interceptor: add Authorization header
// Response interceptor: handle 401, refresh token
```

**`src/services/interactionsService.js`**  
```javascript
export const interactionsAPI = {
  list: (params) => api.get('/v1/interactions', { params }),
  getById: (id) => api.get(`/v1/interactions/${id}`),
  create: (data) => api.post('/v1/interactions', data),
  update: (id, data) => api.patch(`/v1/interactions/${id}`, data),
  delete: (id) => api.delete(`/v1/interactions/${id}`),
}
```

**`src/services/doctorsService.js`**, **`src/services/chatService.js`**, **`src/services/authService.js`**  
Similar pattern for doctors, AI chat, and authentication.

---

#### 🎨 **Components**

**Layout:**  
- `src/components/layout/AppShell.jsx` — Main container
- `src/components/layout/Navbar.jsx` — Top bar with user menu
- `src/components/layout/Sidebar.jsx` — Left navigation

**Common:**  
- `src/components/common/EditInteractionDialog.jsx`
- `src/components/common/ViewInteractionDialog.jsx`
- `src/components/common/ApiErrorBanner.jsx`
- `src/components/common/LoadingStates.jsx`
- `src/components/common/ErrorBoundary.jsx`

---

#### 🎨 **Theme**

**`src/theme/index.js`**  
```javascript
const theme = createTheme({
  palette: {
    primary: { main: '#3f51b5' },  // Indigo
    secondary: { main: '#ff4081' },
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
  },
})
```

---

#### 🛣️ **Routing**

**`src/router/index.jsx`**  
```javascript
const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/log', element: <LogInteraction /> },
  { path: '/history', element: <InteractionHistory /> },
  { path: '/doctor/:id', element: <DoctorProfile /> },
  { path: '*', element: <NotFound /> },
])
```

---

## 🔐 Environment Variables

### Backend `.env`
```env
DATABASE_URL="postgresql+asyncpg://postgres:root@localhost:5432/crm_db"
SYNC_DATABASE_URL="postgresql+psycopg2://postgres:root@localhost:5432/crm_db"
GROQ_API_KEY="gsk_your_key_here"
GROQ_MODEL="llama-3.1-8b-instant"
SECRET_KEY="your-secret-key-here"
ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 🗄️ Database Schema

```sql
-- doctors
CREATE TABLE doctors (
    id UUID PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(30),
    specialty VARCHAR(100),
    designation VARCHAR(100),
    institution VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- users
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    hashed_password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'rep',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- interactions
CREATE TABLE interactions (
    id UUID PRIMARY KEY,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- User fields
    interaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    product_discussed VARCHAR(255),
    summary TEXT,
    notes TEXT,
    follow_up_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'draft',
    
    -- AI fields
    ai_summary TEXT,
    ai_sentiment VARCHAR(20),
    ai_action_items TEXT[],
    ai_follow_up_date TIMESTAMP WITH TIME ZONE,
    ai_processed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

---

## 🚀 How to Run

### 1. Start PostgreSQL
```bash
# Service should already be running (postgresql-x64-18)
```

### 2. Start Backend
```bash
cd "D:\AI-powered CRM\backend"
set PYTHONPATH=D:\AI-powered CRM\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Swagger UI:** http://localhost:8000/docs  
**Health:** http://localhost:8000/health

### 3. Start Frontend
```bash
cd "D:\AI-powered CRM\my-app"
npm run dev
```

**App:** http://localhost:5173

---

## 🧪 Testing the AI Chat

1. Go to http://localhost:5173/log
2. Click **"Conversational Chat"** tab
3. Type natural language:
   ```
   I visited Dr. Ravi Kumar today at Apollo Hospital.
   We discussed CardioPlus. He was interested and wants a sample.
   Follow up next week.
   ```
4. AI extracts:
   - Doctor name: Dr. Ravi Kumar
   - Hospital: Apollo Hospital
   - Product: CardioPlus
   - Type: visit
   - Sentiment: positive
   - Follow-up: +7 days
5. Review/edit extracted fields
6. Click **Save Interaction**

---

## 📊 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **State** | Redux Toolkit |
| **UI** | Material UI v6 + MUI DataGrid + Recharts |
| **HTTP** | Axios |
| **Backend** | FastAPI 0.111+ |
| **AI** | LangGraph 0.2+ + LangChain + Groq (Llama 3.1) |
| **Database** | PostgreSQL 18 + SQLAlchemy 2.0 (async) |
| **Migrations** | Alembic |
| **Auth** | JWT (python-jose) |
| **Validation** | Pydantic v2 |

---

## 🛠️ Key Files by Feature

### Feature: AI Chat Interaction Logging

**Backend:**  
- `app/agents/crm_workflow_agent.py` — LangGraph orchestration
- `app/agents/crm_tools.py` — `log_interaction` tool
- `app/routers/ai.py` — POST `/chat/langgraph`
- `app/services/ai_service.py` — AI business logic

**Frontend:**  
- `src/pages/LogInteraction/ConversationalChat.jsx` — Chat UI
- `src/pages/LogInteraction/ExtractedFieldsEditor.jsx` — Review/edit
- `src/store/slices/chatSlice.js` — Chat state
- `src/services/chatService.js` — API calls

---

### Feature: Interaction History with CRUD

**Backend:**  
- `app/routers/interactions.py` — All CRUD endpoints
- `app/services/interaction_service.py` — Business logic
- `app/models/interaction.py` — ORM model

**Frontend:**  
- `src/pages/InteractionHistory/index.jsx` — DataGrid + filters
- `src/components/common/EditInteractionDialog.jsx`
- `src/components/common/ViewInteractionDialog.jsx`
- `src/store/slices/interactionsSlice.js`

---

### Feature: Dashboard Analytics

**Backend:**  
- `GET /api/v1/interactions` with aggregation logic

**Frontend:**  
- `src/pages/Dashboard/index.jsx` — KPI cards
- `src/pages/Dashboard/DashboardCharts.jsx` — Recharts visualizations

---

### Feature: Doctor Profile Timeline

**Backend:**  
- `GET /api/v1/interactions/doctor/{id}`
- `GET /api/v1/doctors/{id}`

**Frontend:**  
- `src/pages/DoctorProfile/index.jsx` — Profile + timeline

---

## 🔍 Debugging Tips

**Check backend logs:**  
Terminal running uvicorn shows all SQL queries and LLM calls in DEBUG mode.

**Check database state:**  
```bash
cd backend
python
>>> from app.db.session import AsyncSessionLocal
>>> from app.models import *
>>> # Query models
```

**Check frontend network:**  
Open DevTools → Network tab → filter by XHR → see all API calls

**Test API directly:**  
http://localhost:8000/docs — interactive Swagger UI

---

## 📝 Next Steps for Enhancement

1. **Add real authentication flow** (login/register pages)
2. **Add file upload** (prescriptions, presentations)
3. **Add export to Excel/PDF** (reports)
4. **Add notifications** (WebSocket for real-time follow-up alerts)
5. **Add advanced filtering** (date range picker, multi-select)
6. **Add AI insights page** (sentiment trends, top concerns)
7. **Add mobile responsive design**
8. **Add unit + integration tests** (pytest for backend, Vitest for frontend)

---

## 🎓 Key Learnings & Design Decisions

1. **Why LangGraph?**  
   Provides explicit control over AI workflow with tool routing, error handling, and state management.

2. **Why asyncpg + psycopg2?**  
   - `asyncpg` for FastAPI (async endpoints)
   - `psycopg2` for Alembic (sync migrations)

3. **Why Redux Toolkit?**  
   Simplifies state management with built-in thunk handling, less boilerplate than plain Redux.

4. **Why separate services layer?**  
   Keeps routers thin, makes business logic testable, easier to refactor.

5. **Why Pydantic schemas?**  
   Automatic validation, serialization, OpenAPI docs generation.

---

## 📞 Troubleshooting

**Backend won't start:**  
- Check PYTHONPATH is set: `set PYTHONPATH=D:\AI-powered CRM\backend`
- Check `.env` has correct DATABASE_URL and GROQ_API_KEY
- Run `alembic upgrade head` if tables are missing

**Frontend won't start:**  
- Check `.env` has `VITE_API_BASE_URL=http://localhost:8000/api`
- Run `npm install` if node_modules is missing

**AI chat returns errors:**  
- Check GROQ_API_KEY is valid
- Check model name is supported (llama-3.1-8b-instant is current)
- Check backend logs for LLM errors

**Database connection fails:**  
- Verify PostgreSQL is running: `Get-Service postgresql-x64-18`
- Check password in DATABASE_URL matches postgres user password
- Test with: `psql -U postgres -d crm_db`

---

**End of Documentation**
