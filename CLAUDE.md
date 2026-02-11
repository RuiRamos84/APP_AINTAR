# AINTAR APP - Project Guide

## Development Principles (ALWAYS FOLLOW)
- **Best practices first:** Every implementation must follow industry best practices
- **Usability:** Intuitive interfaces, clear labels, logical workflows, accessible to all users
- **Responsiveness:** All UI must adapt to desktop, tablet and mobile (MUI Grid breakpoints: xs, sm, md, lg)
- **Simplicity:** Minimal complexity, clean code, no over-engineering. Less is more
- **Functionality:** Features must work correctly and completely before moving on
- **UX/UI:** Consistent visual design, proper spacing, feedback on actions (loading states, toasts, tooltips), logical form layouts
- **Responses:** Be practical, objective and assertive. Focus on solutions, not theory
- **Reusability:** Always prefer generic/shared components over duplicated code
- **Consistency:** Follow existing patterns - check similar modules before implementing new features
- **Language:** All user-facing text in Portuguese (pt-PT)
- **Security:** Always validate inputs (backend: Pydantic, frontend: form validation). Never trust client data. Prevent SQL injection, XSS, CSRF
- **Error handling:** Backend returns consistent JSON errors with `@api_error_handler`. Frontend shows toast notifications for user feedback
- **Git:** Conventional commits in Portuguese (feat, fix, refactor, docs). Branch naming: `feature/`, `fix/`, `refactor/`

## Overview
Water utility management application (AINTAR) with Flask backend + React frontend.
Domain: app.aintar.pt | Production server: Windows Server 2019

## Architecture

### Backend (`backend/`)
- **Framework:** Flask 3.1.0 + SQLAlchemy 2.0 + PostgreSQL
- **Auth:** JWT (access + refresh tokens) via Flask-JWT-Extended
- **Server:** eventlet + Flask-SocketIO (production: `run_waitress.py`)
- **Patterns:** Service Layer (`app/services/`) + Repository (`app/repositories/`) + Blueprints (`app/routes/`)
- **Cache/Rate Limit:** Redis (Flask-Caching + Flask-Limiter)
- **Real-time:** Socket.IO for WebSockets
- **Logging:** Rotating file handler (10MB, 5 backups)

### Frontend (`frontend/`) - Production
- **Framework:** React 19 + Material-UI 7 (MUI) + Zustand
- **Build:** Create React App 5
- **HTTP:** Axios with JWT interceptors (`services/api.js`)
- **State:** Zustand stores + Context API + React Query (TanStack)
- **Routing:** React Router 7

### Frontend-v2 (`frontend-v2/`) - Next Generation (in development)
- **Build:** Vite 7 (faster dev/build)
- **Forms:** React Hook Form + Zod validation
- **Structure:** Feature-based modular architecture (`features/`, `core/`, `shared/`)

## Key Patterns

### Backend
- Routes: `@bp.route()` + `@jwt_required()` + `@api_error_handler`
- DB reads use views (`vbl_*`), writes use tables (`tb_*`, `vbf_*`)
- PK generation: `fs_nextcode()` database function
- Session: `db_session_manager(current_user)`
- Error messages in Portuguese
- API prefix: `/api/v1/`

### Frontend (current production)
- **Components:** PascalCase filenames matching component names
- **Services:** `services/` folder, camelCase + "Service" suffix
- **Hooks:** `use` prefix, camelCase
- **Internal module** (`pages/Internal/`):
  - Generic components: `GenericTable.js`, `RecordForm.js`
  - Feature tables: `InventoryTable.js`, etc.
  - Views wrap tables: `InventoryView.js`, etc.
  - Custom hook: `useRecords.js` for CRUD operations
  - Context: `InternalContext.js` for area/entity state
  - Formatters: `recordsFormatter.js` (formatDate, formatCurrency, etc.)
- **API calls:** Always through service files, never directly in components
- **State:** Toast notifications for user feedback (react-toastify)

### Naming Conventions
- Backend: snake_case (Python), PascalCase for classes
- Frontend: PascalCase for components/files, camelCase for functions/hooks
- Database: pk (primary key), ts_ (timestamp prefix), tt_ (type prefix)
- Services in English, UI labels in Portuguese

## Deployment
- **Reverse Proxy:** Nginx (SSL/HTTPS via Let's Encrypt)
- **Backend:** eventlet on port 5000 (proxied by Nginx)
- **Frontend:** Static build served by Nginx
- **Scripts:** `Deploy/` folder (PowerShell)
- **Server path:** `D:/APP/NewAPP/`

## Integrations
- **SIBS Payments:** MBWAY, Multibanco (webhook at app.aintar.pt)
- **Email:** Office365 SMTP (Flask-Mail)
- **Real-time:** Socket.IO (notifications, chat)

## Development Commands
```bash
# Backend
cd backend && python run.py

# Frontend
cd frontend && npm start        # Dev server :3000
cd frontend && npm run build    # Production build

# Frontend-v2
cd frontend-v2 && npm run dev   # Vite dev server
```

## Important Notes
- Never commit `.env` files or log files (`*.log`, `*.log.*`)
- The `.claude/` folder is local development tooling (gitignored)
- Two frontends exist: `frontend/` (production CRA) and `frontend-v2/` (Vite, in development)
- All changes should follow existing patterns - check similar modules before implementing new features
- Portuguese language for all user-facing text
