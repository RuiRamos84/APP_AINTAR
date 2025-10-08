# PARTE 3 - BACKEND DETALHADO
## (Adicionar ao relatório principal)

---

## 11. ARQUITETURA BACKEND

### 11.1 Estrutura Geral

```
backend/
├── app/
│   ├── __init__.py              # Application Factory
│   ├── routes/                  # API Endpoints (18 blueprints)
│   │   ├── auth_routes.py       # Autenticação
│   │   ├── documents_routes.py  # Documentos
│   │   ├── operations_routes.py # Operações
│   │   ├── entity_routes.py     # Entidades
│   │   ├── user_routes.py       # Utilizadores
│   │   ├── meta_data_routes.py  # Metadados
│   │   ├── dashboard_routes.py  # Dashboard
│   │   ├── tasks_routes.py      # Tarefas
│   │   ├── payment_routes.py    # Pagamentos
│   │   ├── letter_routes.py     # Ofícios
│   │   ├── epi_routes.py        # EPIs
│   │   ├── permissions_routes.py # Permissões
│   │   ├── operation_control_routes.py    # Controlo operações
│   │   ├── analysis_routes.py   # Análises
│   │   ├── operation_metadata_routes.py   # Metadados operações
│   │   ├── webhook_routes.py    # Webhooks
│   │   ├── etar_ee_routes.py    # ETAR/EE
│   │   └── __init__.py          # Exports de blueprints
│   │
│   ├── services/                # Lógica de Negócio (20 services)
│   │   ├── auth_service.py      # Autenticação
│   │   ├── documents_service.py # Documentos
│   │   ├── operations_service.py # Operações
│   │   ├── entity_service.py    # Entidades
│   │   ├── user_service.py      # Utilizadores
│   │   ├── meta_data_service.py # Metadados
│   │   ├── dashboard_service.py # Dashboard
│   │   ├── tasks_service.py     # Tarefas
│   │   ├── payment_service.py   # Pagamentos
│   │   ├── letter_service.py    # Ofícios
│   │   ├── epi_service.py       # EPIs
│   │   ├── notification_service.py # Notificações
│   │   ├── analysis_service.py  # Análises
│   │   ├── operation_control_service.py
│   │   ├── operation_metadata_service.py
│   │   ├── etar_ee_service.py
│   │   ├── pdf_filler_service.py
│   │   ├── file_service.py
│   │   ├── time.py
│   │   └── __init__.py
│   │
│   ├── repositories/            # Acesso a Dados
│   │   ├── base_repository.py
│   │   └── operations_repository.py
│   │
│   ├── models/                  # SQLAlchemy Models
│   │   ├── models.py
│   │   ├── user.py
│   │   ├── entity.py
│   │   ├── document.py
│   │   ├── task.py
│   │   ├── letter.py
│   │   ├── epi.py
│   │   ├── payment.py
│   │   ├── etar_ee.py
│   │   └── __init__.py
│   │
│   ├── socketio/                # WebSocket Events
│   │   └── socketio_events.py
│   │
│   └── utils/                   # Utilidades
│       ├── utils.py
│       ├── error_handler.py
│       └── decorators.py
│
├── config.py                    # Configuração
├── run_waitress.py              # Entry point (produção)
└── requirements.txt             # Dependências Python
```

### 11.2 Application Factory Pattern

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS
from config import get_config

# Inicialização de extensões
db = SQLAlchemy()
jwt = JWTManager()
socket_io = SocketIO()
mail = Mail()
cache = Cache()
limiter = Limiter()

def create_app(config_class):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Inicializar extensões
    db.init_app(app)
    jwt.init_app(app)
    socket_io.init_app(app,
                       cors_allowed_origins="*",
                       async_mode='eventlet',
                       ping_timeout=60)
    mail.init_app(app)
    CORS(app, supports_credentials=True)
    cache.init_app(app)
    limiter.init_app(app)

    # Registar blueprints
    from .routes import (
        auth_bp, user_bp, entity_bp, document_bp,
        operations_bp, tasks_bp, payment_bp, ...
    )

    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(user_bp, url_prefix='/api/v1/user')
    app.register_blueprint(entity_bp, url_prefix='/api/v1')
    app.register_blueprint(document_bp, url_prefix='/api/v1')
    # ... registar todos os 18 blueprints

    # Registar eventos WebSocket
    from .socketio.socketio_events import register_socket_events
    register_socket_events(socket_io)

    # Configurar error handlers
    from .utils.error_handler import APIError
    @app.errorhandler(APIError)
    def handle_api_error(error):
        return jsonify(error.to_dict()), error.status_code

    return app
```

### 11.3 Camadas da Aplicação

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENT REQUEST                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              ROUTES LAYER (18 blueprints)               │
│  • Validação de input                                   │
│  • Autenticação (@jwt_required)                         │
│  • Autorização (@requires_permission)                   │
│  • Rate limiting (@limiter.limit)                       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            SERVICES LAYER (20 services)                 │
│  • Lógica de negócio                                    │
│  • Validações complexas                                 │
│  • Orquestração de operações                            │
│  • Chamadas a múltiplos repositórios                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│          REPOSITORY/ORM LAYER                           │
│  • Acesso a dados (SQLAlchemy)                          │
│  • Queries otimizadas                                   │
│  • Stored procedures PostgreSQL                         │
│  • Transactions                                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│               DATABASE (PostgreSQL)                     │
│  • Tables, Views, Functions                             │
│  • ACID transactions                                    │
└─────────────────────────────────────────────────────────┘
```

---

## 12. API REST

### 12.1 Todos os Endpoints

#### **AUTH - Autenticação**
```
POST   /api/v1/auth/login          # Login
POST   /api/v1/auth/logout         # Logout
POST   /api/v1/auth/refresh        # Refresh token
POST   /api/v1/auth/heartbeat      # Heartbeat (inatividade)
GET    /api/v1/auth/check_session  # Verificar sessão
POST   /api/v1/auth/update_dark_mode # Atualizar dark mode
GET    /api/v1/auth/cached-activities # Atividades em cache
```

#### **DOCUMENTS - Documentos**
```
GET    /api/v1/documents                  # Listar todos
GET    /api/v1/documents/:id              # Detalhes documento
POST   /api/v1/documents/create           # Criar documento
PUT    /api/v1/documents/:id              # Atualizar documento
DELETE /api/v1/documents/:id              # Apagar documento
GET    /api/v1/documents/owner            # Criados por mim
GET    /api/v1/documents/assigned         # Atribuídos a mim
POST   /api/v1/documents/:id/assign       # Atribuir documento
POST   /api/v1/documents/:id/status       # Alterar status
POST   /api/v1/documents/:id/annex        # Adicionar anexo
GET    /api/v1/documents/:id/history      # Histórico
POST   /api/v1/documents/:id/comment      # Adicionar comentário
```

#### **OPERATIONS - Operações**
```
GET    /api/v1/operations/data            # Dados de operações (legacy)
GET    /api/v1/operations/tasks           # Tarefas do operador
GET    /api/v1/operations/tasks/:id       # Detalhes tarefa
POST   /api/v1/operations/tasks/:id/complete # Concluir tarefa
POST   /api/v1/operations/tasks/:id/evidence # Upload evidência
GET    /api/v1/operations/supervisor      # Dados supervisor
POST   /api/v1/operations/assign          # Atribuir tarefa
```

#### **OPERATION CONTROL - Controlo de Operações**
```
GET    /api/v1/operation/control/dashboard # Dashboard supervisor
GET    /api/v1/operation/control/team      # Dados da equipa
POST   /api/v1/operation/control/assign    # Atribuir tarefa
GET    /api/v1/operation/control/metrics   # Métricas
```

#### **OPERATION METADATA - Metadados de Operações**
```
GET    /api/v1/operation/metadata          # Listar metadados
POST   /api/v1/operation/metadata          # Criar metadata
PUT    /api/v1/operation/metadata/:id      # Atualizar metadata
DELETE /api/v1/operation/metadata/:id      # Apagar metadata
```

#### **ANALYSIS - Análises**
```
GET    /api/v1/operation/analysis/kpis     # KPIs operacionais
GET    /api/v1/operation/analysis/trends   # Tendências
GET    /api/v1/operation/analysis/reports  # Relatórios
```

#### **ENTITIES - Entidades**
```
GET    /api/v1/entities                    # Listar entidades
GET    /api/v1/entities/:id                # Detalhes entidade
POST   /api/v1/entities                    # Criar entidade
PUT    /api/v1/entities/:id                # Atualizar entidade
DELETE /api/v1/entities/:id                # Apagar entidade
GET    /api/v1/entities/search?q=...       # Pesquisar entidades
```

#### **USERS - Utilizadores**
```
GET    /api/v1/user/profile                # Perfil utilizador
PUT    /api/v1/user/profile                # Atualizar perfil
POST   /api/v1/user/password               # Alterar password
GET    /api/v1/user/permissions            # Permissões do user
POST   /api/v1/user/create                 # Criar utilizador (admin)
GET    /api/v1/user/list                   # Listar utilizadores (admin)
```

#### **METADATA - Metadados Globais**
```
GET    /api/v1/metadata                    # Todos metadados
GET    /api/v1/metadata/users              # Utilizadores
GET    /api/v1/metadata/entities           # Entidades
GET    /api/v1/metadata/types              # Tipos de documento
GET    /api/v1/metadata/statuses           # Estados
```

#### **DASHBOARD - Dashboard**
```
GET    /api/v1/dashboard/stats             # Estatísticas gerais
GET    /api/v1/dashboard/recent            # Atividade recente
GET    /api/v1/dashboard/charts            # Dados para gráficos
```

#### **TASKS - Tarefas**
```
GET    /api/v1/tasks                       # Listar tarefas
GET    /api/v1/tasks/:id                   # Detalhes tarefa
POST   /api/v1/tasks                       # Criar tarefa
PUT    /api/v1/tasks/:id                   # Atualizar tarefa
DELETE /api/v1/tasks/:id                   # Apagar tarefa
POST   /api/v1/tasks/:id/complete          # Concluir tarefa
POST   /api/v1/tasks/:id/comment           # Comentar tarefa
```

#### **PAYMENTS - Pagamentos**
```
GET    /api/v1/payments                    # Listar pagamentos
GET    /api/v1/payments/:id                # Detalhes pagamento
POST   /api/v1/payments/:id/validate       # Validar pagamento
POST   /api/v1/payments/:id/reject         # Rejeitar pagamento
GET    /api/v1/payments/pending            # Pagamentos pendentes
```

#### **LETTERS - Ofícios**
```
GET    /api/v1/letters                     # Listar ofícios
POST   /api/v1/letters                     # Criar ofício
GET    /api/v1/letters/:id                 # Detalhes ofício
PUT    /api/v1/letters/:id                 # Atualizar ofício
DELETE /api/v1/letters/:id                 # Apagar ofício
POST   /api/v1/letters/:id/send            # Enviar ofício
```

#### **EPI - Equipamentos de Proteção**
```
GET    /api/v1/epi                         # Listar EPIs
POST   /api/v1/epi                         # Criar EPI
GET    /api/v1/epi/:id                     # Detalhes EPI
PUT    /api/v1/epi/:id                     # Atualizar EPI
POST   /api/v1/epi/:id/assign              # Atribuir EPI
GET    /api/v1/epi/user/:userId            # EPIs de utilizador
```

#### **PERMISSIONS - Gestão de Permissões**
```
GET    /api/v1/permissions                 # Listar permissões
GET    /api/v1/permissions/user/:userId    # Permissões de user
POST   /api/v1/permissions/user/:userId    # Atribuir permissões
DELETE /api/v1/permissions/user/:userId    # Remover permissões
```

### 12.2 Exemplo de Rota Completa

```python
# routes/documents_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from ..services.documents_service import DocumentsService
from ..utils.decorators import requires_permission
from ..utils.error_handler import api_error_handler
from .. import limiter

bp = Blueprint('documents', __name__)
documents_service = DocumentsService()

@bp.route('/documents', methods=['GET'])
@jwt_required()                           # 1. Autenticação JWT
@requires_permission(500)                 # 2. Verificar permissão
@limiter.limit("100 per hour")           # 3. Rate limiting
@api_error_handler                        # 4. Error handling
def get_all_documents():
    """
    Lista todos os documentos.

    Permissão: 500 (docs.view.all)

    Query params:
        - page (int): Número da página
        - limit (int): Items por página
        - status (str): Filtrar por status
        - entity (int): Filtrar por entidade

    Returns:
        {
            "documents": [...],
            "total": 150,
            "page": 1,
            "pages": 15
        }
    """
    # 1. Obter dados do JWT
    jwt_data = get_jwt()
    user_id = jwt_data.get('user_id')
    session_id = jwt_data.get('session_id')

    # 2. Obter parâmetros da query
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status = request.args.get('status', None)
    entity_id = request.args.get('entity', None, type=int)

    # 3. Validar parâmetros
    if page < 1:
        return jsonify({"error": "Page deve ser >= 1"}), 400
    if limit < 1 or limit > 100:
        return jsonify({"error": "Limit deve estar entre 1 e 100"}), 400

    # 4. Chamar serviço
    filters = {
        'status': status,
        'entity_id': entity_id
    }

    result = documents_service.get_all_documents(
        session_id=session_id,
        page=page,
        limit=limit,
        filters=filters
    )

    # 5. Retornar resposta
    return jsonify(result), 200


@bp.route('/documents/<int:doc_id>', methods=['GET'])
@jwt_required()
@requires_permission(500)
@api_error_handler
def get_document_details(doc_id):
    """Obter detalhes de um documento específico."""
    jwt_data = get_jwt()
    session_id = jwt_data.get('session_id')

    document = documents_service.get_document_by_id(
        doc_id=doc_id,
        session_id=session_id
    )

    if not document:
        return jsonify({"error": "Documento não encontrado"}), 404

    return jsonify(document), 200


@bp.route('/documents/create', methods=['POST'])
@jwt_required()
@requires_permission(560)                 # Permissão para criar
@limiter.limit("10 per hour")            # Limite mais restritivo
@api_error_handler
def create_document():
    """
    Criar um novo documento.

    Permissão: 560 (docs.create)

    Body:
        {
            "entity_id": 123,
            "type": "request",
            "description": "...",
            "annexes": [...]
        }
    """
    jwt_data = get_jwt()
    user_id = jwt_data.get('user_id')
    session_id = jwt_data.get('session_id')

    # 1. Validar body
    data = request.get_json()
    if not data:
        return jsonify({"error": "Body vazio"}), 400

    # 2. Validar campos obrigatórios
    required_fields = ['entity_id', 'type']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Campo '{field}' obrigatório"}), 400

    # 3. Criar documento via serviço
    new_document = documents_service.create_document(
        data=data,
        user_id=user_id,
        session_id=session_id
    )

    # 4. Emitir notificação WebSocket
    from ..socketio.socketio_events import emit_document_created
    emit_document_created(new_document['id'])

    return jsonify(new_document), 201


@bp.route('/documents/<int:doc_id>', methods=['PUT'])
@jwt_required()
@requires_permission(500)
@api_error_handler
def update_document(doc_id):
    """Atualizar documento existente."""
    jwt_data = get_jwt()
    user_id = jwt_data.get('user_id')
    session_id = jwt_data.get('session_id')

    data = request.get_json()

    updated_document = documents_service.update_document(
        doc_id=doc_id,
        data=data,
        user_id=user_id,
        session_id=session_id
    )

    if not updated_document:
        return jsonify({"error": "Documento não encontrado"}), 404

    return jsonify(updated_document), 200


@bp.route('/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
@requires_permission(50)                  # Apenas admin
@api_error_handler
def delete_document(doc_id):
    """
    Apagar documento.

    Permissão: 50 (admin.docs.manage)
    """
    jwt_data = get_jwt()
    session_id = jwt_data.get('session_id')

    success = documents_service.delete_document(
        doc_id=doc_id,
        session_id=session_id
    )

    if not success:
        return jsonify({"error": "Documento não encontrado"}), 404

    return jsonify({"message": "Documento apagado com sucesso"}), 200
```

### 12.3 Padrão de Response

Todas as respostas seguem um padrão consistente:

**Sucesso (200-299)**:
```json
{
  "data": {...},
  "message": "Operação bem-sucedida",
  "meta": {
    "timestamp": "2025-10-08T12:00:00Z"
  }
}
```

**Erro (400-599)**:
```json
{
  "error": "Descrição do erro",
  "code": "ERROR_CODE",
  "details": {...},
  "meta": {
    "timestamp": "2025-10-08T12:00:00Z"
  }
}
```

**Lista paginada**:
```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

---

*Continuação em progresso...*

**Próximas seções:**
- Serviços detalhados (20 services)
- Modelos de dados (SQLAlchemy)
- WebSocket events
- Módulos funcionais completos
