# AINTAR Backend API

API REST desenvolvida em Flask para o sistema AINTAR.

## Tecnologias

- **Framework:** Flask 2.x
- **ORM:** SQLAlchemy
- **Base de Dados:** PostgreSQL
- **Autenticacao:** JWT (flask-jwt-extended)
- **WebSockets:** Flask-SocketIO
- **Documentacao:** Flasgger (Swagger)
- **Server (Producao):** Waitress

## Estrutura

```
backend/
├── app/
│   ├── __init__.py       # Configuracao da aplicacao Flask
│   ├── routes/           # Endpoints da API (Blueprints)
│   ├── services/         # Logica de negocio
│   ├── models/           # Modelos SQLAlchemy (se aplicavel)
│   ├── repositories/     # Acesso a dados
│   ├── utils/            # Utilitarios (logger, error_handler, etc.)
│   ├── socketio/         # Eventos WebSocket
│   └── core/             # Configuracoes core
├── config.py             # Configuracoes por ambiente
├── run.py                # Servidor desenvolvimento
├── run_waitress.py       # Servidor producao
└── requirements.txt      # Dependencias Python
```

## Desenvolvimento Local

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente (Windows)
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Executar em modo desenvolvimento
python run.py
```

O servidor inicia em `http://localhost:5000`

## Producao

```bash
# Ativar ambiente
venv\Scripts\activate

# Definir ambiente
set FLASK_ENV=production

# Executar com Waitress
python run_waitress.py
```

## Endpoints Principais

### Autenticacao (`/api/v1/auth`)
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/login` | Login de utilizador |
| POST | `/refresh` | Renovar token |
| POST | `/logout` | Terminar sessao |

### Utilizadores (`/api/v1/user`)
| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/users` | Listar utilizadores |
| GET | `/users/<id>` | Obter utilizador |
| PUT | `/users/<id>/interfaces` | Atualizar permissoes |

### Telemetria IoT (`/api/v1/telemetry`)
| Metodo | Endpoint | Auth | Descricao |
|--------|----------|------|-----------|
| POST | `/dados` | API Key | Receber dados de sensores |
| GET | `/dados` | JWT | Listar dados |
| PUT | `/dados/<pk>/processed` | JWT | Marcar como processado |
| GET | `/stats` | JWT | Estatisticas |

## Autenticacao

### JWT (Utilizadores)
```
Authorization: Bearer <token>
```

### API Key (Telemetria IoT)
```
X-API-Key: <chave>
```

Configurar via variavel de ambiente:
```
TELEMETRY_API_KEYS=chave1,chave2,chave3
```

## Logging

O sistema usa logging centralizado com niveis configuráveis:

| Nivel | Quando aparece |
|-------|----------------|
| ERROR | Sempre |
| WARNING | Sempre |
| INFO | Apenas com DEBUG_MODE=True |
| DEBUG | Apenas com DEBUG_MODE=True |

Ver `LOGGING.md` para mais detalhes.

## Documentacao API

Swagger UI disponivel em: `http://localhost:5000/apidocs/`

## Variaveis de Ambiente

| Variavel | Descricao | Default |
|----------|-----------|---------|
| FLASK_ENV | Ambiente (development/production) | production |
| DEBUG_MODE | Ativar logs detalhados | False |
| DATABASE_URL | URL da base de dados | - |
| JWT_SECRET_KEY | Chave secreta JWT | - |
| TELEMETRY_API_KEYS | API Keys para telemetria | aintar-sensor-dev-2025 |
