# AINTAR - Sistema de Gestão (App)

Sistema empresarial integrado de gestão para a AINTAR. Este ecossistema suporta a gestão transversal de entidades, documentos, processos operacionais, pagamentos e acomoda telemetria IoT em tempo real.

---

## 🏗️ Arquitetura do Projeto

A solução está dividida em módulos independentes, garantindo separação de responsabilidades (SoC) e facilitando o desenvolvimento concorrente:

```text
APP/
├── backend/          # API RESTful + WebSockets (Python/Flask)
├── frontend/         # Interface Web Produção (React 18 / CRA) [Legado Ativo]
├── frontend-v2/      # Interface Web Next-Gen (React 19 / Vite / FSD) [Em Desenvolvimento]
├── Deploy/           # Orquestração de Deploy (Modulos PowerShell + Nginx)
├── database/         # Scripts SQL e Backups (PostgreSQL)
└── files/            # Armazenamento de Ficheiros Estáticos (Uploads/Gerados)
```

---

## 💻 Componentes Principais

### 1. Backend (Flask API)
O motor central do sistema, servindo via API RESTful e WebSockets para reatividade.
- **Micro-Framework:** Python 3.x, Flask 3.1
- **Camada de Dados:** SQLAlchemy 2.0 (ORM) + PostgreSQL
- **Caching & Rate Limit:** Redis
- **Segurança/Auth:** JWT (Access/Refresh Tokens)
- **Tempo Real:** Socket.IO integrada (Eventlet na Produção)
- **Documentação OAI:** Swagger (Disponível em `/apidocs/` no ambiente de Dev)

### 2. Frontend V1 - Produção (React Legacy)
A aplicação de produção atual.
- **Core:** React 18, Material-UI (MUI) 7
- **Gestão de Estado:** Zustand (Global) + Context API
- **Toolchain:** Create React App (CRA)

### 3. Frontend V2 - Next Generation (React + Vite)
A nova iteração revolucionária focada em alta performance e escalabilidade estrutural.
- **Core:** React 19, Material-UI (MUI) 7, Emotion, Framer Motion
- **Toolchain:** Vite 7 (Builds ultra-rápidos e HMR)
- **Gestão de Estado & Assíncronismo:** Zustand (UI State) + TanStack Query (Server State)
- **Formulários & Validação (Fail-Fast):** React Hook Form + Zod
- **Arquitetura:** Feature-Sliced Design (FSD) na pasta `features/`

---

## 🚀 Quick Start (Desenvolvimento Local)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend-v2 (Recomendado para Novo Desenvolvimento)

```bash
cd frontend-v2
npm install
npm run dev
```

### Frontend (Manutenção Produção)

```bash
cd frontend
npm install
npm start
```

---

## 🚢 Deploy (Produção)

O sistema de deploy no servidor Windows é suportado por PowerShell modular hiper-resiliente (`Deploy-Main.ps1`). Suporta Modos de Manutenção, Build steps e relatórios em terminal interativo.

Consulte a documentação exaustiva na pasta `Deploy/README.md`.

---

## 📡 Endpoints Principais (API v1)

A API agrupa-se em domínios de negócio bem definidos:

| Módulo | Prefixo | Descrição Breve |
|--------|---------|-----------------|
| Auth | `/api/v1/auth` | Login corporativo e gestão de ciclo de vida de tokens |
| Users | `/api/v1/user` | Gestão de colaboradores e permissões (RBAC) |
| Entities | `/api/v1/entities` | Clientes, Fornecedores e Entidades Externas |
| Documents| `/api/v1/documents`| Tramitação documental e geração PDF |
| Operations| `/api/v1/operations`| Intervenções no terreno, Cadastro e Ramais |
| Payments | `/api/v1/payments` | Integração SIBS (MBWay, Multibanco), Gestão Financeira |
| Tasks | `/api/v1/tasks` | Workflow, Filas de Trabalho e Tarefas Cíclicas |
| Telemetry| `/api/v1/telemetry`| Ingestão e Agregação IoT de Ativos Hídricos |

---

## 🌐 Mapeamento de Ambientes

| Ambiente | Host/Contexto | Descrição |
|----------|---------------|-----------|
| Local Dev | `localhost:5000` | Instância Backend local |
| Local Dev | `localhost:3000` | Instância Frontend V1 (CRA) local |
| Local Dev | `localhost:5173` | Instância Frontend V2 (Vite) local |
| Produção | `app.aintar.pt` | App integral em Windows Server (Nginx Proxy) |

---

## 📞 Suporte e Engenharia

**Responsável Técnico / Arquiteto:** Rui Ramos
**Email:** rui.ramos@aintar.pt
