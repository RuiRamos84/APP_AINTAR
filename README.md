# AINTAR - Sistema de Gestao

Sistema integrado de gestao para a AINTAR, incluindo gestao de entidades, documentos, operacoes, pagamentos e telemetria IoT.

## Estrutura do Projeto

```
APP/
├── backend/          # API Flask (Python)
├── frontend/         # Interface React (producao atual)
├── frontend-v2/      # Nova interface React + Vite (em desenvolvimento)
├── Deploy/           # Scripts de deployment
├── database/         # Scripts e backups de base de dados
└── files/            # Ficheiros estaticos
```

## Componentes

### Backend (Flask API)
- **Tecnologia:** Python 3.x, Flask, SQLAlchemy
- **Base de Dados:** PostgreSQL
- **Autenticacao:** JWT (JSON Web Tokens)
- **Documentacao API:** Swagger (disponivel em `/apidocs/`)

### Frontend (React)
- **Tecnologia:** React 18, Material-UI
- **Estado:** Redux + Context API
- **Build:** Create React App

### Frontend-v2 (React + Vite)
- **Tecnologia:** React 18, Vite, Material-UI
- **Estado:** Zustand + Context API
- **Nova arquitetura:** Modular por features

## Quick Start

### Desenvolvimento Local

1. **Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

2. **Frontend:**
```bash
cd frontend
npm install
npm start
```

### Producao
Ver pasta `Deploy/` para scripts de deployment.

## Endpoints Principais

| Modulo | Prefixo | Descricao |
|--------|---------|-----------|
| Auth | `/api/v1/auth` | Autenticacao e tokens |
| Users | `/api/v1/user` | Gestao de utilizadores |
| Entities | `/api/v1/entities` | Gestao de entidades |
| Documents | `/api/v1/documents` | Gestao de documentos |
| Operations | `/api/v1/operations` | Operacoes e ramais |
| Payments | `/api/v1/payments` | Sistema de pagamentos |
| Tasks | `/api/v1/tasks` | Gestao de tarefas |
| Telemetry | `/api/v1/telemetry` | Dados IoT de sensores |

## Ambientes

| Ambiente | URL | Descricao |
|----------|-----|-----------|
| Desenvolvimento | `localhost:5000` | Backend local |
| Desenvolvimento | `localhost:3000` | Frontend local |
| Producao | `app.aintar.pt` | Servidor de producao |

## Contacto

**Responsavel:** Rui Ramos
**Email:** rui.ramos@aintar.pt
