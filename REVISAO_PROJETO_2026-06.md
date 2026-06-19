# Revisão do Projeto AINTAR APP — Junho 2026

> Análise crítica e construtiva focada em **segurança**, **arquitectura/qualidade do backend Flask** e **arquitectura/reutilização do frontend-v2**. Os achados de maior severidade foram verificados manualmente (ficheiro + linha) para garantir que o relatório reflete o estado real do código, não apenas hipóteses.

---

## 0. Sumário Executivo

O projeto está bem estruturado na generalidade — os padrões definidos no `CLAUDE.md` (Service Layer/Repository no backend, React Query vs Zustand no frontend-v2, `useSearch`, `ModulePage`, Grid v2) estão **maioritariamente respeitados**, o que é um sinal positivo de maturidade. Os problemas encontrados são, na sua maioria, **desvios pontuais e bem localizados** ao padrão já definido — não exigem reescrever a aplicação, exigem fechar gaps.

### Top 6 — Fazer primeiro

| # | Item | Severidade | Esforço | Localização |
|---|------|------------|---------|-------------|
| 1 | CORS `origins="*"` + `supports_credentials=True` reflete qualquer origem | **Alto** | Baixo (config) | `backend/app/__init__.py:100,104` |
| 2 | ~~Path traversal em `file_service.py`~~ → **CORRIGIDO**: ficheiro é código morto, nunca chamado por rota ativa. Caminho ativo (`documents/attachments.py`) já bloqueia `..`/`/`/`\`. Fica limpeza de código morto + hardening opcional | **Médio** *(desce de Alto)* | Baixo | `backend/app/services/file_service.py` (remover) + `documents/attachments.py:230-235` (hardening opcional) |
| 3 | Rotas WhatsApp sem `@require_permission` | **Alto** | Baixo | `backend/app/routes/alert_whatsapp_routes.py:61-91,146` |
| 4 | Blacklist de JWT em memória (não sobrevive a restart/multi-worker) | **Alto** | Médio | `backend/app/__init__.py:75` + `app/utils/utils.py:281-294` |
| 5 | `db_session_manager` aninhado entre rota e service (transações partilhadas de forma frágil) | **Alto** (estrutural) | Médio–Alto | `backend/app/utils/utils.py:191-217` + ~40 ficheiros |
| 6 | 4 stores Zustand a guardar dados de servidor (viola a regra do `CLAUDE.md`) | **Médio** (consistência) | Médio | `features/{tasks,operations,epi,equipamentos}/store/*.js` |

### O que NÃO foi coberto nesta passagem
- **Usabilidade/UX dedicada** (ergonomia de formulários, responsividade mobile real, acessibilidade, wording de mensagens) — o `CLAUDE.md` já define um padrão de erro/loading/empty state sólido, e essa consistência foi auditada, mas uma revisão UX visual/interativa fica para sessão dedicada (idealmente com o dev server corrido e capturas de ecrã).
- `frontend/` (CRA, produção) e `website/` (público).
- Auditoria rota-a-rota completa de RBAC (foi feita amostragem).
- Performance sob carga real e índices de base de dados.

---

## 1. Segurança

### 1.1 Achados de severidade Alta

#### CORS wildcard com credenciais — `app/__init__.py:100,104`
```python
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
...
socket_io.init_app(app, ..., cors_allowed_origins="*", ...)
```
**Verificação feita**: inspecionei o código-fonte do `flask_cors` instalado (`venv/Lib/site-packages/flask_cors/core.py:110-150`). Com `origins="*"` + `supports_credentials=True` + `send_wildcard` no valor por omissão (`False`), a função `get_cors_origins` **não** devolve `*` literal — devolve **`[request_origin]`**, ou seja, **reflete o header `Origin` do pedido recebido**, e adiciona `Access-Control-Allow-Credentials: true`.

Na prática: **qualquer site pode fazer pedidos credenciados (`withCredentials`/`credentials: 'include'`) à API e o browser permite ler a resposta**, porque o servidor responde sempre "sim, a tua origem está autorizada" + "sim, aceito credenciais".

O frontend-v2 usa `withCredentials: true` (`frontend-v2/src/core/config/api.config.js:24`), e não encontrei `JWT_TOKEN_LOCATION`/cookies configurados no Flask-JWT-Extended (o token parece viajar via header `Authorization: Bearer`, não cookie) — por isso o vetor de **roubo direto do JWT** não está confirmado. Ainda assim, isto é uma má prática real e perigosa **assim que** qualquer cookie de sessão (Flask `session`, Socket.IO, etc.) entrar em jogo, e amplia desnecessariamente a superfície de ataque.

**Recomendação**: substituir `"*"` por uma allowlist explícita:
```python
CORS(app, resources={r"/*": {"origins": [
    "https://app.aintar.pt",
    "https://clientes.aintar.pt",
    "http://localhost:5173",  # dev frontend-v2
    "http://localhost:3000",  # dev frontend CRA
]}}, supports_credentials=True)
```
Aplicar o mesmo a `cors_allowed_origins` do Socket.IO (linha 104).

---

> **🔄 Correção desta revisão**: o achado original aqui ("Path traversal em `file_service.py`", severidade Alto) foi **investigado em profundidade e corrigido** — `file_service.py` é código morto (nunca chamado por nenhuma rota ativa). Detalhe completo movido para a secção **1.2 (severidade Média)**, onde fica como limpeza de código morto + hardening opcional.

---

#### Rotas WhatsApp sem permissão granular — `app/routes/alert_whatsapp_routes.py:61-91,146`
As rotas `POST /whatsapp/open`, `/whatsapp/connect`, `/whatsapp/desligar`, `/whatsapp/config/grupos` usam apenas `@jwt_required()`, sem `@require_permission`. Qualquer utilizador autenticado (independentemente do perfil) pode abrir/fechar a sessão do WhatsApp ou alterar grupos de configuração.

**Recomendação**: adicionar `@require_permission('whatsapp.manage')` (criar a permissão granular em `ts_interface` seguindo a convenção `.view`/`.edit` do projeto).

---

#### Blacklist de JWT em memória — `app/__init__.py:75`
**Verificação feita**: confirmado por leitura. A blacklist de tokens revogados (logout) é `blacklist = set()`, definida em `app/__init__.py:75` e usada em `app/utils/utils.py:281-294` (`add_token_to_blacklist`, `is_token_revoked`, `check_if_token_revoked`) via `from app import blacklist` — um `set()` Python em memória. Em produção com **eventlet + múltiplos workers/restarts**, cada processo tem a sua própria blacklist — um token "deslogado" num worker continua válido noutro, e qualquer restart limpa a lista toda.

*Nota de limpeza*: existe ainda um ficheiro `app/blacklist.py` (também `blacklist = set()`) e um `token_blacklist = set()` em `utils.py:27` — nenhum dos dois é importado em lado nenhum (confirmado por grep), são duplicados órfãos. Podem ser removidos na mesma intervenção para evitar confusão futura.

**Recomendação**: mover para Redis (já usado para cache/rate limiting) com `SETEX <jti> <ttl_restante> "revoked"`, usando o tempo de expiração do próprio token como TTL.

---

### 1.2 Achados de severidade Média

| Achado | Localização | Recomendação |
|---|---|---|
| `SECRET_KEY` com fallback fraco hardcoded (`'default_secret_key'`) | `backend/config.py:16` | Remover fallback; falhar o arranque (`raise RuntimeError`) se `SECRET_KEY`/`JWT_SECRET_KEY` não estiverem definidos em produção |
| Sem headers de segurança (`X-Frame-Options`, `Content-Security-Policy`, `HSTS`, `X-Content-Type-Options`) | App-wide | Adicionar via Nginx (mais simples, já existe `nginx.conf`) ou `flask-talisman` |
| Validar se webhook SIBS confia apenas na decifragem AES-GCM como prova de autenticidade | `app/routes/webhook_routes.py:16-43,177` | Confirmar que falhas de decifragem devolvem erro genérico (sem detalhe) para evitar oracle; considerar validar IP de origem da SIBS como camada extra |
| Caminhos absolutos hardcoded como defaults de config (`C:/Users/rui.ramos/...`, `D:/APP/logos`) | `backend/config.py:71,87,88` | Remover defaults de filesystem local; falhar arranque se `FILES_DIR`/`LOGOS_DIR`/`PDFS_DIR` não definidos via env em produção |
| Scripts legados `convert_permissions.py`/`remove_permissions.py` referenciam permissões "umbrella" já removidas (`admin.dashboard`, `global.access`) | raiz do `backend/` | Confirmar que já não existem em `ts_interface` e remover os scripts do repo (são migrações já aplicadas, não código de runtime) |
| `file_service.py` é código morto (nunca chamado por rota ativa); caminho ativo (`documents/attachments.py`) tem blocklist funcional mas não-canónico — *corrigido de "Alto" na 1ª passagem* | `backend/app/services/file_service.py` + `documents_service.py` (remover) + imports mortos em `inventory_service.py:12`/`vehicle_service.py:12` | Remover ficheiros/imports mortos. Opcional: substituir blocklist de `documents/attachments.py:230-235` por `secure_filename()` + containment (padrão de `emission_routes.py:1088`), por consistência |

**Detalhe da correção** (verificação adicional: grep cruzado de `FileService`/`documents_service`/`file_service` em todo o projeto):
- `app/services/file_service.py` (classe `FileService`, métodos `save_attachment`/`download_file`/`ensure_directories` citados na 1ª passagem) só é referenciado por `app/services/documents_service.py:198,528` — e este módulo **não é importado por ninguém** no projeto (zero imports; só strings literais auto-referenciais como `"creation_context": "documents_service"`).
- `inventory_service.py:12` e `vehicle_service.py:12` importam `FileService` mas nunca chamam nenhum dos seus métodos (imports mortos).
- O caminho realmente ativo para upload/download de anexos é `app/services/documents/attachments.py` (chamado a partir de `documents_routes.py`), cujo `download_file()` já valida:
  ```python
  if '..' in filename or '/' in filename or '\\' in filename:
      return jsonify({'error': 'Nome inválido'}), 400
  if '..' in regnumber or '/' in regnumber or '\\' in regnumber:
      return jsonify({'error': 'Registo inválido'}), 400
  ```
  Não é o padrão canónico do projeto (`secure_filename()` + `os.path.abspath()` + `startswith(base_dir)`, usado em `emission_routes.py:1088`), mas bloqueia os vetores realistas de path traversal. `portal.access` continua a dar acesso a esta rota (correto por design — é assim que clientes acedem aos seus anexos), o que reforça o valor do hardening opcional acima como defesa em profundidade.

### 1.3 Pontos positivos confirmados

- ✅ Pydantic usado consistentemente para validação de payloads de pagamento (`payment_service.py:29-51`).
- ✅ Queries via `text()` parametrizado em todo o lado revisto — **sem concatenação de SQL** encontrada.
- ✅ `api_error_handler` (`app/utils/error_handler.py:82-109`) bem desenhado: nunca expõe stack traces, mapeia exceções de negócio/SQL para mensagens em pt-PT.
- ✅ `.env` corretamente excluído via `.gitignore:20-28`; sem secrets hardcoded encontrados em rotas/serviços.
- ✅ Rate limiting ativo (`Flask-Limiter`) com limites apertados em `/login` (10/min) e `/refresh` (5/min).
- ✅ Permissões granulares (`@require_permission('docs.view')` etc.) corretamente aplicadas na generalidade das rotas amostradas (analysis, payments, documents).

---

## 2. Arquitectura & Qualidade — Backend Flask

### 2.1 `db_session_manager` aninhado — risco estrutural mais relevante

**Verificação feita**: li `app/utils/utils.py:190-217` e o par `caixa_routes.py:112-135` / `caixa_service.py:214-220`.

```python
# utils.py:191
@contextmanager
def db_session_manager(session_id):
    session = db.session()       # scoped session — MESMA instância dentro do mesmo request
    try:
        if session_id:
            fs_setsession(session_id)
            session.execute(text(f"SET search_path TO {search_path}"))
        yield session
        session.commit()
    except SQLAlchemyError as e:
        session.rollback()
        ...
    finally:
        session.close()
```

```python
# caixa_routes.py:134-135 (rota)
with db_session_manager(current_user):
    return create_movement(data, current_user, user_client_pk)

# caixa_service.py:214 (service, chamado DENTRO do with acima)
with db_session_manager(current_user) as session:
    ...
```

Como `db.session()` é uma *scoped session*, a chamada interna devolve **a mesma instância** da chamada externa. Resultado:
- `fs_setsession` + `SET search_path` são executados **duas vezes** (redundante, mas inofensivo por ser idempotente).
- O **commit + close acontece no nível interno** — quando o `with` externo termina, chama `commit()`/`close()` outra vez sobre uma sessão já fechada. O SQLAlchemy tolera isto (auto-begin de uma transação vazia), por isso **neste caso concreto não há erro visível**.

**Porque é "Alto" mesmo sem erro visível agora**: o padrão é frágil — quebra-se silenciosamente assim que uma rota faça **trabalho adicional depois de chamar um service que abre o seu próprio `db_session_manager`**. Nesse cenário:
- O commit do service interno persiste os dados a meio da "transação lógica" da rota.
- Se o código da rota falhar *depois* disso, o `rollback()` do nível externo **não consegue desfazer** o que já foi commitado.
- Se uma nova conexão for emprestada do pool após o `close()` interno, `fs_setsession`/`SET search_path` (que definem contexto ao nível da ligação Postgres) podem não estar ativos para as queries seguintes do nível externo.

Encontrei o mesmo padrão de nesting potencial em **~40 ficheiros** que usam `db_session_manager` tanto em `routes/` como em `services/` (orcamento, epi, tasks, equipamentos, caixa).

**Recomendação** (faseada, não é "stop the world"):
1. **Curto prazo**: nos pares onde a rota não usa `as session`, remover o `with db_session_manager()` da rota e deixar **só o service** abrir a sessão (caso de `caixa_routes.py:134` — é o caso mais simples e seguro de corrigir primeiro).
2. **Médio prazo**: adotar "session injection" como padrão único — só o nível mais externo (rota OU service de topo, nunca ambos) abre `db_session_manager`; métodos internos recebem `session` por parâmetro. Isto já é feito corretamente em `orcamento_routes.py:40-98` — usar como referência/exemplo interno.
3. Adicionar um aviso em `db_session_manager`: `if session.in_transaction(): logger.warning(...)` para apanhar nesting residual durante a migração.

---

### 2.2 Repository subutilizado / lógica de acesso a dados duplicada

`BaseRepository` (`app/repositories/base_repository.py:19-201`) já oferece `find_all/find_by_id/create/update/delete` genéricos com filtros — mas só **8 repositórios pequenos** (~776 linhas no total) o usam. Módulos grandes (`payment_service.py`, `etar_ee_service.py`, `rh_service.py`, `documents/core.py`) reimplementam acesso a dados ad-hoc com `session.execute(text(...))` repetido dezenas de vezes, cada um com o seu próprio `try/except SQLAlchemyError` + log + `{'success': False, 'error': ...}`.

**Oportunidade de abstração concreta**: extrair um `GenericCrudService` que herda/usa `BaseRepository` e centraliza o padrão `try/except` + mapeamento de erros (já existe `map_sql_error` em `error_handler.py` — está subaproveitado). Não é necessário migrar tudo de uma vez — aplicar a **novos módulos** e, oportunisticamente, aos services que já estão a ser tocados por outras tarefas.

Adicionalmente, **`BaseRepository.find_all` não suporta paginação** (`limit`/`offset`/`total_count`) — devolve sempre o conjunto completo. Combinado com a ausência de `LIMIT/OFFSET` em listagens grandes (`etar_ee_service.py`, `operations_service.py`, `documents/core.py`), isto é um risco de performance que cresce com o volume de dados. Recomendo adicionar paginação ao `BaseRepository` primeiro — assim os 8 repositórios existentes ganham-na "de borla", e serve de exemplo para os módulos maiores.

### 2.3 Ficheiros grandes (candidatos a split)

| Ficheiro | Linhas | Sugestão |
|---|---|---|
| `app/services/payment_service.py` | 1707 | Separar lógica SIBS/webhook de lógica de negócio de pagamentos (seguir o padrão já usado em `services/documents/` core+workflow) |
| `app/services/website_service.py` | 1675 | Separar por secção do site (CMS genérico vs específico) |
| `app/routes/etar_ee_routes.py` | 1537 | Dividir por sub-recurso (ETAR vs EE vs análises) |
| `app/routes/emission_routes.py` | 1329 | — |
| `app/services/rh_service.py` | 1095 | Já existe separação por feature no frontend (férias/faltas/horários) — replicar no backend |
| `app/routes/payment_routes.py` | 1056 | — |
| `app/services/documents/core.py` | 1021 | — |
| `app/services/operations_service.py` | 992 | — |
| `app/services/user_service.py` | 958 | — |
| `app/services/etar_ee_service.py` | 861 | Atenção: linha 588 tem `UNION ALL ... LIMIT 1` — confirmar que não corre dentro de um loop por registo (potencial N+1) |
| `app/routes/rh_routes.py` | 811 | — |

`payment_service.py` e `etar_ee_service.py` são prioritários por serem lógica crítica de negócio (pagamentos) misturada com integração externa (SIBS).

### 2.4 Tratamento de erros — pequena inconsistência

`api_error_handler` está bem aplicado, mas dentro de `db_session_manager` (`utils.py:204-214`) o parsing de erros de negócio assenta num regex sobre a string da exceção (`<error>...</error>`). Isto é frágil — se a função PL/pgSQL mudar o formato da mensagem, deixa de ser apanhado e cai no ramo genérico. Recomendação a prazo: mapear códigos de erro de funções `fbf_*`/`fbo_*` para exceções tipadas (`APIError` com código específico) antes de chegarem ao `db_session_manager`.

### 2.5 Logging — consistente, sem `print()` encontrados

Ponto positivo: `get_logger(__name__)` + rotating handler usado de forma consistente nos ficheiros revistos.

### 2.6 Compressão de anexos à entrada — ~50% já implementado, faltam 3 pontos

**Verificação feita**: o motor de compressão já existe e está pronto a usar — `app/utils/file_processing.py` (196 linhas), com `compress_image()` (Pillow: redimensiona para máx. 1920px, converte para JPEG qualidade 85 com `optimize=True`, mantém PNG se houver transparência, auto-rotate via EXIF) e `compress_pdf()` (pypdf: `compress_content_streams()` + `compress_identical_objects()`). Função de entrada única: `process_uploaded_file(file_path, filename)`. Ambas as dependências (`Pillow==11.1.0`, `pypdf==4.1.0`) já estão em `requirements.txt` — **não é preciso instalar nada**.

**Já está corretamente ligado** (sem ação necessária):
| Serviço | Localização | Contexto |
|---|---|---|
| `documents/attachments.py:171` | `add_document_annex()` | Anexos adicionados a pedidos existentes |
| `documents/core.py:481` | criação de pedido | Anexos no momento da criação do documento |
| `operation_control_service.py:150,272` | controlo de operação | Ficheiros de controlo operacional |
| `rh_participacao_service.py:326` | participações RH | Anexos de participações |

**Gaps identificados — `process_uploaded_file()` não é chamado**:

1. **`app/services/operations/attachments.py::save_operation_photo()` (~linha 143)** — fotos de campo tiradas em operações (ETAR/EE), guardadas via `photo_file.save(file_path)` sem compressão. **Maior prioridade**: são fotos de telemóvel (frequentemente 3-8MB cada), uploads frequentes (uma por operação), e o caso de uso mais próximo de "otimização de espaço" mencionado.
2. **`app/services/equipamento_service.py::_save_file()` (linhas 19-32)** — manuais/fichas técnicas/esquemas de equipamentos (`file_manual`, `file_specs`, `file_esquemas`). Já usa `secure_filename()` corretamente, só falta a chamada de compressão.
3. **`app/services/website_service.py`** — 8 pontos de `file.save(...)` (linhas 54, 489, 769, 878, 1016, 1069, 1236, 1396, 1657): imagens de hero/notícias/ofertas de emprego do site público + CVs de candidaturas (PDFs) + imagens de procedimentos/categorias de documentos. Maior superfície (8 pontos), mas alterações mecânicas (mesma assinatura em todos).

**Recomendação**: adicionar `from app.utils.file_processing import process_uploaded_file` + uma chamada `process_uploaded_file(file_path, filename)` logo após cada `.save()` nos 3 ficheiros acima — mesmo padrão já usado nos 4 locais já cobertos. Sem mudanças de schema, sem novas dependências, ~10-20 linhas por ficheiro.

> Nota: este gap cobre apenas **novos uploads** ("à entrada", conforme pedido). Comprimir ficheiros já existentes em disco seria um script `batch` à parte, fora do âmbito desta correção — referido no plano como item opcional de backlog.

---

## 3. Frontend-v2 — Arquitectura e Reutilização

### 3.1 Stores Zustand com dados de servidor (viola `CLAUDE.md`) — Médio/Alto

Quatro stores guardam e fazem fetch de dados que deveriam viver em React Query:

| Store | Dados de servidor guardados | Localização |
|---|---|---|
| `features/tasks/store/taskStore.js` | `tasks[]`, `totalCount`, `fetchTasks()`, `getFilteredTasks()` | linhas ~14, 20, 261-294 |
| `features/operations/store/operationStore.js` | `operations[]` + `pagination`, fetch próprio | linhas ~6-49 |
| `features/epi/store/epiStore.js` | `employees[]`/`deliveries[]`, `getFilteredDeliveries()` | linhas ~14, 24, 71-92, 288-317 |
| `features/equipamentos/store/equipamentoStore.js` | `equipamentos[]`, `getFilteredEquipamentos()` | linhas ~15, 99-119 |

Isto duplica a cache do React Query (dois "estados da verdade" para os mesmos dados, risco de inconsistência) e reimplementa filtros manualmente em vez de `useSearch`.

**Bons exemplos a seguir**: `documentsStore.js`, `entityStore.js`, `useFleetStore.js` — guardam apenas UI state (filtros, modais, seleções).

**Recomendação**: migrar cada um para `useTasks`/`useOperations`/`useEpiDeliveries`/`useEquipamentos` (React Query), mantendo no store apenas `filtros`, `modalOpen`, `editTarget`. Substituir `getFiltered*()` por `useSearch`. Pode ser feito **um módulo de cada vez** sem dependências cruzadas — bom candidato a distribuir por sprints.

### 3.2 Duplicação de modais de formulário (módulo RH)

`FeriasFormModal.jsx` e `FaltaFormModal.jsx` (linhas 10-49) repetem: `toISODate()`/`fromISODate()`, `useForm` com `reset` num `useEffect` ao abrir, e a lógica `onSubmit` create-vs-edit. `HorarioFormModal.jsx`, `OcorrenciaModal.jsx`, `EscalaModal.jsx` seguem o mesmo molde.

**Recomendação**: extrair para `@/shared/hooks`:
```js
function useFormModal(schema, getDefaultValues, onSave) {
  const form = useForm({ resolver: zodResolver(schema) });
  useEffect(() => { if (open) form.reset(getDefaultValues(editTarget)); }, [open, editTarget]);
  const onSubmit = form.handleSubmit(async (data) => {
    await onSave(editTarget ? { ...data, pk: editTarget.pk } : data);
  });
  return { form, onSubmit };
}
```
e mover `toISODate`/`fromISODate` para `@/shared/utils/date`. Estimativa: ~500 linhas removidas só no módulo RH.

### 3.3 Hooks CRUD quase idênticos

`useFerias.js`/`useFaltas.js` (~51 linhas cada) são essencialmente o mesmo `useQuery` + 3 `useMutation` com nomes diferentes. `useHorarios.js`, `usePiquete.js`, `useParticipacao.js` seguem a mesma forma.

**Recomendação**: factory genérica em `@/shared/hooks`:
```js
function useSimpleCrud(queryKey, service, { mensagensSucesso } = {}) {
  const list = useQuery({ queryKey, queryFn: service.list });
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey });
  const create = useMutation({ mutationFn: service.create, onSuccess: () => { invalidate(); toast.success(mensagensSucesso?.create ?? 'Criado.'); } });
  const update = useMutation({ mutationFn: service.update, onSuccess: () => { invalidate(); toast.success(mensagensSucesso?.update ?? 'Atualizado.'); } });
  const remove = useMutation({ mutationFn: service.remove, onSuccess: () => { invalidate(); toast.success(mensagensSucesso?.remove ?? 'Removido.'); } });
  return { ...list, create, update, remove };
}
```
Aplicável a `useFerias`, `useFaltas`, `useHorarios`, `usePiquete`, `useParticipacao` sem mudar a interface pública (cada hook específico chama a factory e devolve o resultado).

### 3.4 `EmptyState` quase não usado — gap no padrão obrigatório

`@/shared/components/feedback/EmptyState.jsx` (com variantes `EmptySearch`/`EmptyList`) só é usado em `TaskColumn.jsx`. `FaltasPage.jsx`, `TasksPage.jsx`, `RhGestaoCentralPage.jsx`, `EntityList.jsx` não tratam o estado vazio explicitamente — o que viola o padrão "loading→success→error→empty" definido no `CLAUDE.md`.

**Recomendação de maior alavancagem**: integrar `EmptyState` como fallback automático no componente `DataTable` partilhado (se a lista filtrada estiver vazia, renderiza `EmptySearch`/`EmptyList` automaticamente) — resolve o gap em todas as páginas que usam `DataTable` de uma vez, sem tocar em cada página individualmente.

### 3.5 Tratamento de erro — ~52% de cobertura

Das ~56 páginas principais analisadas, aproximadamente metade usa `toast.error` consistentemente; a outra metade não cumpre o padrão completo loading→success→error. Não há um problema estrutural único aqui — é trabalho de "fechar gaps" página a página, idealmente como checklist ao tocar em cada módulo por outras razões (não vale a pena uma sprint dedicada só a isto).

### 3.6 Grid v2 — ✅ sem débito técnico

Zero ocorrências de `<Grid item xs={...}>` em `features/`. Migração para `size={{...}}` está completa.

### 3.7 Componentes partilhados — gaps de extração

41 componentes já existem em `@/shared/components` (SearchBar, ModulePage, ConfirmDialog, DataTable, EmptyState, skeletons, ErrorBoundary, AddressForm). Gaps identificados:
- **Sem componente de paginação genérico** — se `BaseRepository.find_all` ganhar paginação (ver 2.2), faz sentido criar `<Pagination />` partilhado em paralelo.
- **Sem date-range picker partilhado** — vários módulos (caixa, RH, telemetria) provavelmente reimplementam seleção de intervalo de datas.

### 3.8 Ficheiros grandes (candidatos a split)

| Ficheiro | Linhas |
|---|---|
| `features/gestao/components/InstalacaoPage.jsx` | **2185** ⚠️ |
| `features/operations/pages/OperatorTabletPage.jsx` | 1447 |
| `features/documents/components/details/DocumentDetailsModal.jsx` | 1392 |
| `features/payments/pages/ClientContractsPage.jsx` | 1113 |
| `features/documents/components/forms/CreateDocumentModal.jsx` | 1106 (wizard 6 passos — dividir por passo já seria natural) |
| `features/tasks/pages/TasksPage.jsx` | 948 |
| `features/operations/pages/TasksPage.jsx` | 937 |
| `features/payments/pages/CaixaPage.jsx` | 907 |

`InstalacaoPage.jsx` (2185 linhas) é o caso mais extremo e o primeiro candidato a dividir em sub-componentes por secção.

**Nota de reutilização**: as duas `TasksPage.jsx` (tasks vs operations, 948 e 937 linhas) têm propósitos diferentes mas partilham conceitos (Kanban, lista, filtros) — vale a pena avaliar se uma base comum (`<KanbanBoard />`, `<TaskFilters />`) reduziria duplicação entre os dois módulos.

---

## 4. Oportunidades de Reutilização/Abstração — Visão Cruzada

| Camada | Padrão repetido | Abstração proposta | Impacto estimado |
|---|---|---|---|
| Backend | `try/except SQLAlchemyError` + log + `{'success': False}` em dezenas de métodos | `GenericCrudService` sobre `BaseRepository` + `map_sql_error` | Reduz boilerplate em novos módulos; não exige migrar os existentes de imediato |
| Backend | `find_all` sem paginação | Adicionar `limit`/`offset`/`total_count` ao `BaseRepository` | Beneficia os 8 repos existentes imediatamente |
| Frontend-v2 | Modais de formulário RH (5 ficheiros) | `useFormModal(schema, getDefaults, onSave)` em `@/shared/hooks` | ~500 linhas |
| Frontend-v2 | Hooks CRUD simples (5 módulos RH) | `useSimpleCrud(queryKey, service, mensagens)` | Consistência + menos manutenção |
| Frontend-v2 | Empty state em falta em várias listagens | Integrar `EmptyState` no `DataTable` partilhado | Resolve o gap globalmente, 1 ponto de mudança |
| Frontend-v2 | Stores com dados de servidor (4 módulos) | Migrar para React Query + `useSearch` | Elimina inconsistências de cache |

---

## 5. Plano de Execução

> Esta secção substitui o "Plano de Ação Sugerido" da 1ª passagem. Integra a correção da secção 1.2 (path traversal → código morto) e o novo requisito de **compressão de anexos à entrada** (secção 2.6). Cada fase é independente e pode ser feita como PR separado, pela ordem abaixo.

### Fase 1 — Compressão de anexos à entrada (novo requisito — ~50% já feito)
> A infraestrutura já existe e já está ligada em 4 serviços (`documents/attachments.py`, `documents/core.py`, `operation_control_service.py`, `rh_participacao_service.py` — ver 2.6). Falta ligar `process_uploaded_file()` em 3 pontos: mudança mecânica (~10-20 linhas cada), sem novas dependências, ganho imediato de espaço em disco.

- [x] **1.1** `app/services/operations/attachments.py::save_operation_photo()` — fotos de campo (telemóvel). **Maior prioridade**: maior volume e maior tamanho médio por ficheiro de todos os pontos identificados.
- [x] **1.2** `app/services/equipamento_service.py::_save_file()` — manuais/fichas técnicas/esquemas de equipamentos
- [x] **1.3** `app/services/website_service.py` — 8 pontos de `.save()` (imagens CMS/notícias/ofertas + CVs de candidaturas)

### Fase 2 — Segurança: quick wins reais (esta semana)
> Exposições reais em produção numa app que já processa pagamentos. Esforço baixo, sem mudanças estruturais.

- [x] **2.1** Allowlist de origens CORS (`app/__init__.py:100,104`, incluindo `cors_allowed_origins` do Socket.IO)
- [x] **2.2** `@require_permission('whatsapp.manage')` nas rotas WhatsApp (`alert_whatsapp_routes.py:61-91,146`)
- [x] **2.3** Remover fallback `'default_secret_key'` (`config.py:16`)
- [x] **2.4** Remover defaults de filesystem absolutos (`config.py:71,87,88`)

### Fase 3 — Limpeza de código morto + hardening de anexos (baixo esforço)
> Resultado da correção da secção 1.2 — substitui o antigo item "path traversal Alto" do plano original.

- [x] **3.1** Remover `app/services/file_service.py` e `app/services/documents_service.py` (confirmados sem uso em todo o projeto)
- [x] **3.2** Remover imports mortos de `FileService` em `inventory_service.py:12` e `vehicle_service.py:12`
- [x] **3.3** *(Opcional)* Hardening do blocklist em `documents/attachments.py:230-235` → `secure_filename()` + containment, alinhando com `emission_routes.py:1088`

### Fase 4 — Estrutural (médio esforço)
- [x] **4.1** Blacklist de JWT → Redis (inclui remover os duplicados órfãos `app/blacklist.py` e `token_blacklist` em `utils.py:27` — ver nota em 1.1)
- [x] **4.2** Headers de segurança via Nginx (`nginx.conf`)
- [x] **4.3** Corrigir nesting de `db_session_manager` nos módulos de **pagamentos/caixa** primeiro (maior risco de negócio), usando `orcamento_routes.py` como referência do padrão correto
- [x] **4.4** Adicionar paginação ao `BaseRepository`

### Backlog — Reutilização e limpeza (sem urgência, fazer oportunisticamente)
- [ ] Migrar `taskStore`/`operationStore`/`epiStore`/`equipamentoStore` para React Query (um de cada vez)
- [ ] Extrair `useFormModal` e `useSimpleCrud` ao tocar no módulo RH
- [ ] Integrar `EmptyState` no `DataTable`
- [ ] Dividir `InstalacaoPage.jsx` (2185 linhas) e `payment_service.py` (1707 linhas)
- [ ] *(Opcional)* Script batch para recomprimir ficheiros já existentes em disco (fora do âmbito "à entrada", mas reaproveita `process_uploaded_file()`)

### Próxima sessão sugerida
- Revisão de **usabilidade/UX** dedicada (com app a correr): formulários, responsividade mobile, acessibilidade, wording.
- Revisão de `frontend/` (CRA produção) e `website/`.
- Auditoria RBAC rota-a-rota completa (script automatizado: comparar todas as rotas `@bp.route` com presença de `@require_permission`).

---

*Relatório gerado por análise assistida (3 agentes de exploração + verificação manual dos achados de maior severidade). Âmbito: backend Flask, frontend-v2, segurança transversal.*
