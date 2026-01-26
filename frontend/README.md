# AINTAR Frontend (Producao)

Interface web React para o sistema AINTAR. Esta e a versao em producao.

## Tecnologias

- **Framework:** React 18
- **UI Library:** Material-UI (MUI)
- **Estado:** Redux + Context API
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Build Tool:** Create React App

## Estrutura

```
frontend/
├── src/
│   ├── components/       # Componentes reutilizaveis
│   │   ├── common/       # Componentes genericos (Sidebar, AppBar, etc.)
│   │   └── ...
│   ├── config/           # Configuracoes (rotas, constantes)
│   ├── features/         # Modulos por funcionalidade
│   │   ├── Pavimentations/
│   │   └── ...
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Paginas da aplicacao
│   │   ├── Administration/
│   │   ├── Tasks/
│   │   └── ...
│   ├── services/         # Servicos (API, auth, etc.)
│   └── App.js            # Componente principal
├── public/               # Assets estaticos
└── build/                # Output de producao (gerado)
```

## Desenvolvimento

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desenvolvimento
npm start
```

Abre em `http://localhost:3000`

## Build de Producao

```bash
# Criar build otimizado
npm run build
```

O output fica em `build/` e deve ser copiado para o servidor via scripts de Deploy.

## Configuracao

### Variaveis de Ambiente

Criar ficheiro `.env` na raiz:

```env
REACT_APP_API_URL=http://localhost:5000/api/v1
REACT_APP_SOCKET_URL=http://localhost:5000
```

### Producao

```env
REACT_APP_API_URL=https://app.aintar.pt/api/v1
REACT_APP_SOCKET_URL=https://app.aintar.pt
```

## Modulos Principais

| Modulo | Localizacao | Descricao |
|--------|-------------|-----------|
| Tasks | `/pages/Tasks/` | Gestao de tarefas (Kanban) |
| Pavimentations | `/features/Pavimentations/` | Gestao de pavimentacoes |
| Administration | `/pages/Administration/` | Gestao de utilizadores |
| Dashboard | `/pages/Dashboard/` | Paineis e estatisticas |

## Deployment

O deployment e feito via scripts PowerShell na pasta `Deploy/`:

```powershell
# Build + Deploy frontend
.\Deploy-Main.ps1 -Frontend
```

## Notas

- Esta versao esta em **producao**
- Nova versao em desenvolvimento em `frontend-v2/` (Vite + arquitetura modular)
