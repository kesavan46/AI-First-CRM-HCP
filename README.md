# 🏥 AI-Powered Pharmaceutical CRM

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![LangGraph](https://img.shields.io/badge/LangGraph-1.0+-FF6B6B?style=for-the-badge&logo=langchain&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-gemma2--9b-F55036?style=for-the-badge&logo=groq&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![MUI](https://img.shields.io/badge/MUI-v6-007FFF?style=for-the-badge&logo=mui&logoColor=white)

A full-stack CRM for pharmaceutical sales reps — log doctor interactions through a structured form **or** by chatting naturally with an AI assistant powered by LangGraph and Groq.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Chat Logging** | Describe a visit in plain English — the agent extracts doctor, product, date, and outcome automatically |
| 📋 **Structured Form** | Traditional form with doctor autocomplete, date picker, and all interaction fields |
| 📊 **Dashboard** | KPI cards, weekly trend chart, outcome breakdown, and product performance |
| 👤 **Doctor Profiles** | Engagement stats, interaction timeline, and follow-up tracker per doctor |
| 📁 **Interaction History** | Searchable, filterable DataGrid with inline edit and delete |
| 🧠 **AI Analysis** | Sentiment detection, action item extraction, and follow-up date suggestion |
| 🔐 **JWT Auth** | Secure login with access + refresh tokens and role-based access control |

---

## 🏗️ Tech Stack

### Backend
- **[FastAPI](https://fastapi.tiangolo.com/)** — async REST API
- **[LangGraph](https://langchain-ai.github.io/langgraph/)** — stateful AI agent workflow
- **[LangChain + Groq](https://python.langchain.com/)** — LLM orchestration (`gemma2-9b-it`)
- **[SQLAlchemy 2.0](https://www.sqlalchemy.org/)** — async ORM
- **[PostgreSQL 15](https://www.postgresql.org/)** — primary database
- **[Alembic](https://alembic.sqlalchemy.org/)** — database migrations
- **[Pydantic v2](https://docs.pydantic.dev/)** — data validation
- **[python-jose](https://github.com/mpdavis/python-jose)** — JWT tokens

### Frontend
- **[React 19](https://react.dev/)** + **[Vite 8](https://vitejs.dev/)** — SPA framework
- **[Redux Toolkit](https://redux-toolkit.js.org/)** — state management
- **[MUI v6](https://mui.com/)** — UI components + MUI X DataGrid
- **[Recharts](https://recharts.org/)** — dashboard charts
- **[React Router v7](https://reactrouter.com/)** — client-side routing
- **[Axios](https://axios-http.com/)** — HTTP client

---

## 🚀 Quick Start

### Prerequisites

- Python **3.11+**
- Node.js **18+**
- PostgreSQL **15+**
- A free [Groq API key](https://console.groq.com)

---

### 1 — Clone the repo

```bash
git clone <your-repo-url>
cd "AI-powered CRM"
```

---

### 2 — Set up the database

```bash
psql -U postgres -c "CREATE DATABASE crm_db;"
```

---

### 3 — Configure and start the backend

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill in environment variables
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql+asyncpg://postgres:yourpassword@localhost:5432/crm_db"
SYNC_DATABASE_URL="postgresql+psycopg2://postgres:yourpassword@localhost:5432/crm_db"
SECRET_KEY="run: python -c \"import secrets; print(secrets.token_hex(32))\""
GROQ_API_KEY="gsk_your_groq_key_here"
GROQ_MODEL="gemma2-9b-it"
```

```bash
# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend running at → **http://localhost:8000**  
Interactive API docs → **http://localhost:8000/docs**

---

### 4 — Start the frontend

```bash
cd my-app
npm install
npm run dev
```

Frontend running at → **http://localhost:5173**



---

## 📁 Project Structure

```
AI-powered CRM/
├── backend/
│   ├── app/
│   │   ├── agents/              # LangGraph graph + 5 CRM tools
│   │   │   ├── crm_workflow_agent.py   # Main graph (7 nodes, 3 conditional edges)
│   │   │   ├── crm_tools.py            # log · edit · search · profile · follow-ups
│   │   │   └── state.py                # WorkflowState TypedDict
│   │   ├── core/
│   │   │   ├── config.py        # App settings via pydantic-settings
│   │   │   ├── llm.py           # Groq LLM factory (get_llm, get_llm_deterministic)
│   │   │   └── security.py      # JWT helpers + password hashing
│   │   ├── db/
│   │   │   ├── base.py          # SQLAlchemy declarative base
│   │   │   └── session.py       # Async engine + session factory
│   │   ├── models/
│   │   │   ├── user.py          # User ORM model
│   │   │   ├── doctor.py        # Doctor ORM model
│   │   │   └── interaction.py   # Interaction ORM model (with AI fields)
│   │   ├── routers/
│   │   │   ├── auth.py          # /auth/*
│   │   │   ├── interactions.py  # /interactions/*
│   │   │   ├── doctors.py       # /doctors/*
│   │   │   └── ai.py            # /ai/* + /chat/langgraph
│   │   ├── schemas/             # Pydantic v2 request / response models
│   │   └── services/            # Business logic (InteractionService, AIService…)
│   ├── alembic/                 # Migration scripts
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
└── my-app/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard/       # KPIs, charts, recent interactions
    │   │   ├── LogInteraction/  # Structured form + AI chat tab
    │   │   ├── InteractionHistory/  # Filterable DataGrid
    │   │   ├── DoctorProfile/   # Timeline, follow-ups, engagement stats
    │   │   └── Auth/            # Login + Register
    │   ├── components/
    │   │   ├── layout/          # AppShell, Sidebar, Navbar, AIChatPanel
    │   │   └── common/          # EditDialog, ViewDialog, ErrorBanner, ProtectedRoute
    │   ├── store/
    │   │   └── slices/          # auth · interactions · doctors · chat · loading · errors
    │   ├── services/            # Axios API clients (auth, interactions, doctors, chat)
    │   └── router/              # React Router v6 route definitions
    ├── package.json
    └── vite.config.js
```

---

## 🤖 AI Agent — How It Works

The AI assistant is a **LangGraph stateful workflow** that runs every time a user sends a chat message.

```
User message
    │
    ▼
understand_request  →  classifies intent (LLM call #1, temp=0.0)
    │
    ├─ needs clarification? → asks a question → waits for next turn
    │
    └─ intent clear →
              │
              ▼
          choose_tool  →  extracts tool arguments (LLM call #2, temp=0.0)
              │
              ▼
          execute_tool  →  runs one of 5 tools against PostgreSQL
              │
              ▼
          return_response  →  formats reply (LLM call #3, temp=0.3)
              │
              ▼
         { reply, extracted_fields }
```

### The 5 tools

| Tool | Example phrase | What happens |
|---|---|---|
| `log_interaction` | *"Visited Dr Ravi at Apollo, discussed CardioPlus"* | LLM extracts fields → INSERT into DB |
| `search_interactions` | *"Show me visits with Dr Mehta last week"* | SELECT with name / date / type filters |
| `doctor_profile` | *"What do I know about Dr Priya?"* | Full doctor history + pending follow-ups |
| `follow_up_reminders` | *"Any follow-ups due this week?"* | SELECT follow_up_date within N days |
| `edit_interaction` | *"Update interaction `<uuid>` status to submitted"* | UPDATE specified fields by UUID |

---

## 🗄️ Database Schema

```
users
  id · email · full_name · hashed_password · role · is_active · created_at · updated_at

doctors
  id · first_name · last_name · email · phone
  specialty · designation · institution · city · state · country
  notes · created_at · updated_at

interactions
  id · doctor_id (FK) · user_id (FK)
  interaction_date · interaction_type · product_discussed
  summary · notes · follow_up_date · status
  ── AI fields ──
  ai_summary · ai_sentiment · ai_action_items · ai_follow_up_date · ai_processed
  created_at · updated_at
```

---

## 🔌 API Overview

All routes are prefixed `/api/v1`. Full docs at **http://localhost:8000/docs**.

| Group | Endpoints |
|---|---|
| **Auth** | `POST /auth/token` · `POST /auth/register` · `POST /auth/refresh` · `GET /auth/me` |
| **Interactions** | `GET/POST /interactions` · `GET/PUT/PATCH/DELETE /interactions/{id}` · `GET /interactions/doctor/{id}` |
| **Doctors** | `GET/POST /doctors` · `GET/PATCH/DELETE /doctors/{id}` |
| **AI** | `POST /ai/analyze` · `POST /ai/quick-summary` · `GET /ai/status/{id}` |
| **Chat** | `POST /chat/langgraph` · `GET /chat/history` |

---

## ⚙️ Environment Variables

### `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `SYNC_DATABASE_URL` | ✅ | Sync PostgreSQL URL for Alembic (`postgresql+psycopg2://...`) |
| `SECRET_KEY` | ✅ | JWT signing secret — generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `GROQ_API_KEY` | ✅ | Groq API key — get free at [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | ✅ | LLM model name (default: `gemma2-9b-it`) |
| `ALGORITHM` | — | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | — | Token lifetime in minutes (default: `1440`) |
| `LLM_TEMPERATURE` | — | LLM sampling temperature (default: `0.3`) |
| `LLM_MAX_TOKENS` | — | Max tokens per LLM response (default: `1024`) |
| `ALLOWED_ORIGINS` | — | Comma-separated CORS origins (default: `http://localhost:5173`) |
| `DEBUG` | — | Enable debug logging (default: `false`) |

### `my-app/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE_URL` | ✅ | Backend base URL (default: `http://localhost:8000/api`) |



---

## 👥 User Roles

| Role | Permissions |
|---|---|
| `rep` | Create / read / update / delete **own** interactions; read all doctors |
| `manager` | Read all interactions and doctors |
| `admin` | Full access — including deleting doctor records |

---

## 📱 Pages at a Glance

### Dashboard `/`
Sales overview with KPI cards (visits, follow-ups, doctors covered, positive rate), weekly interaction trend chart, outcome pie chart, recent interactions list, pending follow-ups, product performance bar chart, and territory coverage progress bars.

### Log Interaction `/log`
Two-tab page:
- **Structured Form** — traditional form with doctor autocomplete, date picker, and all fields
- **AI Chat** — type naturally, the agent extracts fields automatically into the right-side editor panel; hit **Save** or **Transfer to Form**

### Interaction History `/history`
Searchable and filterable DataGrid showing all your interactions. Supports column sorting, status/type/date filters, pagination, and inline **Edit** / **View** / **Delete** actions.

### Doctor Profile `/doctors/:id`
Teal-accented doctor page with three tabs:
- **Overview** — bio, engagement stats (visits / calls / emails / positive rate), products discussed bars, last interaction summary
- **Interactions** — vertical timeline with colored dots per interaction type
- **Follow-ups** — color-coded cards (🔴 overdue · 🟠 today · 🟡 soon · 🟢 upcoming)

---

## 📜 Available Scripts

### Backend

| Command | Description |
|---|---|
| `uvicorn app.main:app --reload --port 8000` | Start dev server with hot reload |
| `alembic upgrade head` | Apply all pending migrations |
| `alembic revision --autogenerate -m "description"` | Generate a new migration |
| `alembic downgrade -1` | Roll back the last migration |
| `pytest` | Run the test suite |
| `python -m app.agents.crm_workflow_agent` | Interactive CLI for testing the AI agent |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run oxlint |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and ensure the build passes:
   ```bash
   # Backend
   pytest
   uvicorn app.main:app --reload   # confirm no startup errors

   # Frontend
   npm run build                   # must complete with 0 errors
   npm run lint
   ```
4. Commit with a descriptive message: `git commit -m "feat: add follow-up notifications"`
5. Push and open a pull request against `main`

### Code style

- **Python** — follow PEP 8; all async functions; Pydantic v2 for all IO
- **JavaScript** — functional React components; Redux Toolkit for all state; no direct DOM manipulation

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) — ultra-fast LLM inference
- [LangGraph](https://langchain-ai.github.io/langgraph/) — stateful agent orchestration
- [MUI](https://mui.com) — React component library
- [FastAPI](https://fastapi.tiangolo.com) — modern Python web framework

---

<div align="center">
  Built with ❤️ for pharma sales teams
</div>
