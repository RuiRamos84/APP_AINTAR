# Revisão Completa do Projeto AINTAR — Julho 2026

> Revisão transversal e sincera, na perspetiva de um engenheiro de software sénior, cobrindo os **cinco componentes**: backend Flask, `frontend/` (CRA produção), `frontend-v2/` (Vite), `website/` (público) e Portal do Cliente. Prioridades pedidas: **segurança**, **arquitetura/dívida técnica** e **performance**, com igual peso entre módulos.
>
> Método: exploração do código + verificação manual dos achados de maior severidade (ficheiro + linha). Onde a revisão anterior (`REVISAO_PROJETO_2026-06.md`) já identificou algo, indico explicitamente se está **corrigido**, **parcial** ou **por fazer** — para não repetir trabalho.
>
> **Âmbito honesto:** isto é análise estática de código. Não corri a app, não medi performance sob carga real, não fiz pentest. Os achados de segurança são exposições reais no código; o impacto exato depende da configuração de produção (Nginx, rede).

---

## 0. Sumário Executivo

O projeto é **grande e maduro para um único programador**: ~302 mil linhas de código de aplicação distribuídas por backend (42k), dois frontends (129k + 116k) e website (16k), com 578 rotas no backend. Os padrões definidos no `CLAUDE.md` estão, na sua maioria, a ser respeitados — e nota-se que **vários achados da revisão de junho já foram corrigidos** (CORS, blacklist JWT em Redis, headers de segurança no Nginx, `_env()` que falha em produção). Isto é um bom sinal de disciplina.

Os problemas que restam concentram-se em três frentes: **superfície de segurança que ficou por fechar** (endpoints de debug públicos em produção, segredos de teste no repositório, rotas ainda sem permissão granular), **dívida técnica estrutural que só cresce** (dois frontends em paralelo, ficheiros gigantes, ausência quase total de testes) e **higiene de repositório** (scripts de debug e ficheiros de ferramentas a serem versionados).

Nada disto exige reescrever a aplicação. Exige fechar gaps e tomar duas ou três decisões estratégicas (sobretudo sobre o destino do `frontend/` antigo).

### Top 10 — por onde começar

| # | Item | Severidade | Esforço | Localização |
|---|------|:---:|:---:|---|
| 1 | Segredos SIBS reais (assinaturas/tokens) commitados em scripts de teste | **Crítico** | Baixo | `backend/teste_sibs_*.py` |
| 2 | Endpoints de debug **públicos** em produção que saltam JWT/permissão | **Alto** | Baixo | `emission_routes.py:852,859`; `payment_routes.py` debug/* |
| 3 | Chave de API do WhatsApp hardcoded como default (`aintar-wa-2025`) | **Alto** | Baixo | `whatsapp_web_service.py:21`; `whatsapp-service/index.js:27` |
| 4 | 9 rotas WhatsApp de envio ainda só com `@jwt_required` (sem permissão) | **Alto** | Baixo | `alert_whatsapp_routes.py` |
| 5 | `.gitignore` tem `~.superpowers/` (typo) → 43 ficheiros de ferramenta a serem commitados | **Médio** | Trivial | `.gitignore:101` |
| 6 | `config.py` duplicado idêntico na raiz e em `backend/` (fonte de verdade dupla) | **Médio** | Baixo | `config.py` = `backend/config.py` |
| 7 | Ausência quase total de testes (1 no CRA, 6 no v2, 2 ficheiros no backend) | **Alto** (risco) | Alto | transversal |
| 8 | Dois frontends em paralelo com módulos duplicados (Documents × 2) sem data de corte | **Alto** (estratégico) | Alto | `frontend/` vs `frontend-v2/` |
| 9 | 360 `console.log` no `frontend/` (produção) | **Médio** | Baixo | `frontend/src` |
| 10 | Ficheiros gigantes (`InstalacaoPage.jsx` 3149 linhas, `payment_service.py` 1788) | **Médio** | Médio | ver §6 |

### Estado dos achados de junho (o que já mudou)

| Achado de junho | Estado atual |
|---|---|
| CORS `origins="*"` + credenciais | ✅ **Corrigido** — usa `cors_origins` (allowlist) em `__init__.py:105,109` |
| Blacklist JWT em memória | ✅ **Corrigido** — migrada para Redis (`app/utils/jwt_blacklist.py`) |
| Headers de segurança em falta | ✅ **Corrigido** — `X-Frame-Options`, `HSTS`, `nosniff`, `Referrer-Policy` no `nginx.conf:105-108` |
| `SECRET_KEY` fallback fraco | ✅ **Melhorado** — `_env()` (`config.py:20`) falha o arranque em produção; resta só default de dev |
| Rotas WhatsApp sem permissão | 🟡 **Parcial** — `whatsapp.manage` aplicado a `open/connect/desligar/config`, mas **9 rotas de envio continuam sem permissão** (ver §1.1) |
| Path traversal `file_service.py` | ✅ **Corrigido** — código morto removido |
| Stores Zustand com dados de servidor | 🟡 **Parcial** — `tasks/epi/equipamentos` migrados; **`operationStore` ainda tem fetch próprio** |

---

## 1. Segurança

### 1.1 Severidade Alta / Crítica

#### 🔴 Segredos SIBS reais no repositório — `backend/teste_sibs_*.py`
Os scripts `teste_sibs_mbway.py`, `teste_sibs_ref_mb.py`, `teste_sibs_status.py`, `teste_sibs_status_mb.py` têm **assinaturas de transação SIBS hardcoded** e estão **versionados no git** (confirmado com `git ls-files`):
```python
# teste_sibs_mbway.py:5
TRANSACTION_SIGNATURE = "eyJ0eElkIjoiczJNZmlkQmFXOU5iVURUaGJRTmgi...GYUb8PbFz8"
```
Mesmo que sejam de ambiente de qualidade (`api.qly.sibspayments.com`), são credenciais de um fornecedor de pagamentos num repositório com histórico. O `.gitguardian.yaml` existe mas não impediu isto.

**Recomendação:** (1) remover os ficheiros do repositório e do **histórico** (`git filter-repo` ou BFG); (2) rodar/invalidar as assinaturas junto da SIBS por precaução; (3) mover qualquer script de teste manual para fora de versionamento ou parametrizar via `.env`. Como há 8+ scripts de debug soltos em `backend/` (`explore_db.py`, `debug_permissions.py`, `check_types.py`, `teste_*`, `query.py`…), vale a pena uma limpeza geral — nenhum é código de runtime.

#### 🔴 Endpoints de debug públicos em produção — `emission_routes.py`, `payment_routes.py`
Rotas sem qualquer autenticação, montadas na app de produção:
```python
# emission_routes.py:852
@emission_bp.route('/debug-test', methods=['POST', 'GET'])
def debug_test(): ...

# emission_routes.py:859 — explicitamente salta JWT
@emission_bp.route('/test-minimal/<int:emission_id>', methods=['POST', 'OPTIONS'])
def test_minimal_generate(emission_id):
    """Teste minimal sem JWT/permission para diagnosticar 422"""
    logger.info(f"... Headers: {dict(request.headers)}")   # loga headers do pedido
```
O `test-minimal` recebe um `emission_id` arbitrário e **loga todos os headers** (incl. potencialmente `Authorization` se alguém lhos enviar). Há ainda `/payments/debug/permissions` e `/payments/debug/migration-status` (só JWT, mas expõem estrutura de permissões) e `/health` público.

**Recomendação:** remover `/debug-test` e `/test-minimal` (eram diagnóstico de um 422 já resolvido). Se `/health` for para monitorização, mantê-lo mas sem detalhes internos. Endpoints de debug nunca devem chegar a produção — considerar um guard `if app.config['ENV'] != 'production'` no registo destes blueprints.

#### 🔴 Chave de API WhatsApp hardcoded — `whatsapp_web_service.py:21` + `whatsapp-service/index.js:27`
Ambos os lados partilham o mesmo default em claro:
```python
WA_API_KEY = os.getenv('WA_API_KEY', 'aintar-wa-2025')   # backend
```
```js
const API_KEY = process.env.WA_API_KEY || 'aintar-wa-2025';  // microserviço
```
Se o `.env` não definir a variável (fácil de esquecer no microserviço Node), a autenticação entre backend e serviço WhatsApp fica com uma chave pública conhecida por quem leia o repositório. O `ecosystem.config.js` até põe `WA_API_KEY: 'aintar-wa-2025'` diretamente no ficheiro versionado.

**Recomendação:** remover o default; falhar o arranque se `WA_API_KEY` não estiver definida (mesmo padrão do `_env()` do backend). Tirar a chave do `ecosystem.config.js`.

#### 🟠 9 rotas WhatsApp de envio sem permissão granular — `alert_whatsapp_routes.py`
A revisão de junho fez metade do trabalho. Continuam apenas com `@jwt_required()` (qualquer utilizador autenticado, incluindo perfil cliente do portal): `/whatsapp/enviar`, `/whatsapp/enviar-grupo`, `/whatsapp/enviar-padrao`, `/whatsapp/entrar-grupo`, `/whatsapp/grupos`, `/whatsapp/grupo-padrao`, `/whatsapp/ultimo`, `/whatsapp/status`, `/whatsapp/qr`. As de envio permitem disparar mensagens WhatsApp em nome da AINTAR.

**Recomendação:** aplicar `@require_permission('whatsapp.manage')` (ou criar `whatsapp.send`) a todas as rotas de escrita/envio. `/status` e `/qr` podem ficar com uma permissão de leitura.

#### 🟠 Rota pública de criação de documento — `documents_routes.py:440`
```python
@bp.route('document/create_direct', methods=['POST'])
@api_error_handler
# Rota pública (webhook/formulário externo), não necessita de @jwt_required
def create_document_extern():
```
Aceita `nif`, `name`, `email`, `phone`, `text` sem autenticação. É um vetor de **spam/criação abusiva de pedidos** e potencial injeção de dados. Não vi rate limiting específico nem CAPTCHA.

**Recomendação:** se tem de ser público (formulário do site), proteger com rate limiting apertado (`@limiter.limit("5/hour")`), validação Pydantic estrita e, idealmente, um token de origem partilhado com o formulário. O mesmo se aplica às rotas públicas do website `/contacto` e `/avaliacoes` (POST) e `/concursal/candidatura` (upload de CV) — nenhuma tem rate limit visível em `website_routes.py`.

### 1.2 Severidade Média

| Achado | Localização | Nota |
|---|---|---|
| `config.py` duplicado (raiz + `backend/`), **byte-a-byte idêntico** | `config.py` / `backend/config.py` | Duas fontes de verdade para config de segurança. Manter só uma. |
| Interpolação de nome de view/coluna em f-string SQL | `dashboard_routes.py:50`, `dashboard_service.py:328`, `operations_routes.py:517`, `admin_service.py:289` | Não é injeção clássica (valores vêm de listas allowlist `ALLOWED_OPERATION_REFS`/`test_views` fixas), mas o padrão é frágil. Confirmar que **nenhum** nome de view/coluna vem de input do utilizador. `operations_routes.py:517` já valida contra `ALLOWED_OPERATION_REFS` ✅. |
| `SET search_path TO {search_path}` interpolado | `utils.py:198,225`, `__init__.py:273` | `search_path` vem de config/sessão, não de utilizador — aceitável, mas idealmente validar contra regex `^[a-z_]+$`. |
| Rotas de pagamento usam `check_payment_admin_permission()` no corpo em vez de decorator | `payment_routes.py:869,899` | Funciona, mas foge ao padrão `@require_permission`. Torna a auditoria automática (grep de decorators) cega a estas rotas — foi por isto que apareceram como "jwt-only" na auditoria. Preferir decorator. |
| HSTS sem `includeSubDomains; preload` | `nginx.conf:108` | `max-age=31536000` está bom; juntar `includeSubDomains` reforça. |
| Sem `Content-Security-Policy` | `nginx.conf` | Os outros headers estão; falta CSP (o mais trabalhoso, mas o mais valioso contra XSS). |
| `.env.production`/`.env.development` existem em disco na raiz | raiz | Corretamente **não versionados** (confirmado) ✅, mas convém garantir que não vão em backups/zips partilhados. |

### 1.3 Pontos positivos confirmados
- ✅ Sem concatenação de SQL com input de utilizador; `text()` + parâmetros `:nome` em todo o lado revisto.
- ✅ Escritas passam por `vbf_*`/`fbo_*`/`fbf_*` na esmagadora maioria; as poucas escritas diretas em `tb_*` (`orcamento`, `aval`, `notification`, `rh_face`) são coerentes e parametrizadas.
- ✅ Blacklist JWT agora em Redis (partilhada entre workers).
- ✅ CORS com allowlist, headers de segurança no Nginx, TLS 1.2/1.3 com cipher suite moderno.
- ✅ Rate limiting global ativo (`500/dia, 100/hora`) + limites apertados em auth.
- ✅ Reconhecimento facial (`rh_face_service.py`): valida dimensão do descritor (128), usa limiar euclidiano rigoroso (0.5), mínimo de 3 templates. Bem feito.
- ✅ Webhook SIBS decifra AES-GCM e falha com erro genérico (sem oracle).

---

## 2. Arquitetura — Backend Flask

O backend está bem organizado (Blueprints + Service Layer + Repository + `db_session_manager`). Os problemas são de **escala e consistência**, não de fundação.

### 2.1 Repository ainda subutilizado (persiste de junho)
`BaseRepository` continua a servir só um punhado de repositórios pequenos, enquanto os serviços grandes (`payment_service` 1788 linhas, `etar_ee_service`, `rh_service`) reimplementam `session.execute(text(...))` + `try/except` + log dezenas de vezes. Falta paginação no `find_all`. Recomendação inalterada: adicionar `limit/offset/total_count` ao `BaseRepository` e extrair um `GenericCrudService`, aplicando a novos módulos primeiro.

### 2.2 `db_session_manager` aninhado (persiste de junho)
Continua o risco estrutural: rotas e serviços ambos abrem `db_session_manager` sobre a mesma scoped session (ex.: `caixa_service.py` abre em 6 métodos). Funciona hoje por tolerância do SQLAlchemy, mas quebra assim que uma rota faça trabalho após um service que já fez commit. Recomendação: convergir para "só o nível mais externo abre a sessão", usando `orcamento_routes.py` como referência. Prioridade: módulo de pagamentos/caixa.

### 2.3 Escritas diretas em `tb_*` — auditar contra a regra do CLAUDE.md
O `CLAUDE.md` diz "writes go through `vbf_*`/`fbf_*`/`fbo_*` — never `INSERT/UPDATE/DELETE` directly on `tb_*`". Encontrei exceções:
- `orcamento_service.py:256,276,290` — INSERT/UPDATE/DELETE direto em `tb_orcamento`
- `aval_service.py:225,243,293` — INSERT/UPDATE em `tb_aval_*`
- `payment_service.py` (5×) — UPDATE direto em `tb_document_invoice`
- `notification_service.py`, `operations_service.py`, `rh_service.py`, `rh_face_service.py` — vários

Algumas podem ser legítimas (tabelas sem função `fbf_*`, como o próprio CLAUDE.md admite para ledgers). Mas convém uma passagem para (a) confirmar caso a caso e (b) documentar as exceções aprovadas, senão a regra perde valor.

### 2.4 Higiene do diretório `backend/`
~15 scripts soltos versionados (`explore_db.py`, `check_orcamento_db.py`, `fix_imports.py`, `migrate_logging.py`, `add_session_manager.py`, `convert_permissions.py`, `remove_permissions.py`, `debug_permissions.py`, `json.json`, `query.py`, `teste_*`). Migrações já aplicadas e diagnósticos pontuais não pertencem ao repo de runtime. Mover para `scripts/` (gitignored) ou apagar.

### 2.5 Testes quase inexistentes
Só `tests/unit/test_auth_service.py` (404 linhas) e `tests/integration/test_auth_routes.py` (555). Autenticação está coberta — **tudo o resto não**: pagamentos, documentos, RH, operações, webhook SIBS. Para uma app que move dinheiro, ter zero testes na camada de pagamentos é o maior risco silencioso do projeto. Recomendação: começar por testes de integração ao `payment_service` e ao webhook SIBS (mock da decifragem), depois documentos.

---

## 3. Frontend `frontend/` (CRA — produção)

### 3.1 Decisão estratégica em aberto: qual o futuro deste frontend?
Coexistem `frontend/` (CRA, 129k linhas) e `frontend-v2/` (Vite, 116k linhas) — **quase o mesmo tamanho**, o que sugere que o v2 já replicou a maior parte. Manter os dois vivos é o maior custo de manutenção do projeto: cada feature/bug tem potencialmente de ser feito duas vezes. Não há, que eu veja, uma data de corte ou plano de descomissionamento do CRA.

**Recomendação (a mais importante do relatório):** definir explicitamente o destino do `frontend/`. Se o v2 é o futuro, criar um plano de migração com data-alvo e congelar features no CRA (só bugfixes). Se ainda há módulos só no CRA, listá-los como o backlog de migração restante.

### 3.2 Duplicação interna: Documents × 2
Dentro do próprio CRA há `pages/Documents/` (292K) **e** `pages/ModernDocuments/` (1.3M) — duas implementações do mesmo domínio. Provavelmente a "Modern" substituiu a antiga mas esta nunca foi removida. Confirmar qual está em uso e apagar a morta.

### 3.3 Três bibliotecas de toast em simultâneo
`notistack` (6 ficheiros), `react-hot-toast` (3), `sonner` (3). Escolher **uma** e uniformizar — três sistemas de notificação significam UX inconsistente e três dependências onde bastava uma.

### 3.4 360 `console.log` em código de produção
Ruído no browser do utilizador, potencial fuga de dados em consola, e custo de bundle. Adicionar um plugin de build que os remove em produção (ou um lint rule `no-console`).

### 3.5 Ficheiros gigantes
`ChartContainer.js` (3125 linhas!), `SupervisorDesktopView.js` (1403), `PaymentAdminPage.js` (1309), `DocumentModal.js` (1126), `UserManagement.js` (1048). São inmanuteníveis e provavelmente re-renderizam em excesso. Candidatos a split por secção/responsabilidade.

### 3.6 Armazenamento de token
O token viaja dentro do objeto `user` em `localStorage` (`authService.js:107`, `AuthManager.js`). É prática comum mas vulnerável a XSS (qualquer script na página lê o token). Com CSP ausente (§1.2), o risco de XSS é maior. Não é para mudar já, mas é o tipo de coisa que, combinada com falta de CSP, merece atenção a prazo (idealmente token de acesso em memória + refresh em cookie httpOnly).

---

## 4. Frontend-v2 (Vite) + Portal Cliente

O v2 é claramente o trabalho mais cuidado: arquitetura feature-based, Grid v2 100% migrado (**zero** `<Grid item>`), `useSearch` usado em 33 sítios, só 46 `console.log`. Bom estado geral.

### 4.1 `operationStore` ainda guarda dados de servidor
Dos quatro stores apontados em junho, três (`tasks`, `epi`, `equipamentos`) já não fazem fetch — bom. Mas `features/operations/store/operationStore.js` mantém `operations: []` + `fetchOperations()` + `pagination` (10 referências a fetch). Continua a duplicar a cache do React Query. Migrar para um hook `useOperations`. `telemetryStore` guarda `sensors`/`analysisData` mas é mais defensável (resultado de pesquisa efémera, não uma listagem canónica) — avaliar caso a caso.

### 4.2 `EmptyState` continua quase não usado
Só 2 ficheiros em `features/` usam `EmptyState`, apesar de o `CLAUDE.md` exigir o estado vazio no padrão "loading→success→error→empty". Recomendação de maior alavancagem (inalterada de junho): integrar `EmptyState` como fallback automático no `DataTable` partilhado — resolve o gap em todas as listagens de uma vez.

### 4.3 Ficheiros gigantes (pior do que no CRA)
`InstalacaoPage.jsx` tem **3149 linhas** (cresceu desde junho, eram 2185!). Seguem-se `OperatorTabletPage.jsx` (1544), `DocumentDetailsModal.jsx` (1393), `CreateDocumentModal.jsx` (1136), `ClientContractsPage.jsx` (1113), `routeConfig.js` (1078). O `InstalacaoPage` é o caso mais urgente de decomposição — 3000+ linhas num só componente é praticamente impossível de rever ou testar.

### 4.4 Duas `TasksPage.jsx` diferentes
`features/tasks/pages/TasksPage.jsx` (949) e `features/operations/pages/TasksPage.jsx` (937) — nomes iguais, propósitos diferentes, mas partilham conceitos de Kanban/lista/filtros. Avaliar uma base `<KanbanBoard/>` partilhada.

### 4.5 Portal Cliente — segurança de acesso
Os guards estão corretos: `PortalRoutes.jsx` usa `<ProtectedRoute requiredPermission="portal.access">` por rota e `portal.invoices.view` para faturas. `/payments/me` filtra por `entity_pk` do JWT (bom, sem IDOR). **Ponto a verificar manualmente:** `/payments/invoice/<document_id>` (`payment_routes.py:150`) recebe um `document_id` arbitrário — confirmar que `get_invoice_data()` valida que o documento pertence à entidade do utilizador autenticado, senão é um IDOR (um cliente vê a fatura de outro). Não consegui confirmar a validação só pela rota; é o achado que mais merece um teste dedicado.

---

## 5. Website Público

Pequeno (16k linhas) e razoavelmente limpo — **zero `console.log`**, SEO via `react-helmet-async`, cookie banner com fallback para `localStorage` bloqueado (bem pensado para Edge/modo privado).

### 5.1 SEO por página incompleto
`SeoHead` só é importado em 3 sítios (`HomePage`, `PageLayout`, o próprio componente). Se o `PageLayout` o aplica a todas as páginas com defaults, ok; mas páginas-chave (notícias individuais, procedimentos, candidaturas) beneficiam de meta tags próprias (title/description/og). Confirmar cobertura real.

### 5.2 `dangerouslySetInnerHTML` sem sanitização visível — `NoticiaPage.jsx:99`
```jsx
dangerouslySetInnerHTML={{ __html: noticia.conteudo_html }}
```
O `conteudo_html` vem do CMS backend. Se o editor de notícias permite HTML arbitrário e algum utilizador com acesso ao CMS for comprometido, é XSS armazenado servido a todos os visitantes. Não vi `DOMPurify` no website (`grep` sem resultados). **Recomendação:** sanitizar com `DOMPurify.sanitize()` antes de injetar, mesmo que a origem seja "confiável" — defesa em profundidade.

### 5.3 Tudo carregado sem lazy loading
`App.jsx` importa as 38 páginas estaticamente (incl. `JogoPage.jsx` com **5774 linhas** e `Minijogos.jsx` 1126). O jogo AINTAR Kids sozinho deve dominar o bundle inicial de um site institucional. **Recomendação:** `React.lazy()` + `Suspense` para as rotas pesadas (jogo, organograma), para não penalizar o carregamento da homepage.

---

## 6. Performance — visão transversal

| Área | Observação | Ação |
|---|---|---|
| Bundle v2 | `index-DX98JxR0.js` = **1.69 MB** (não-gzip). `mui-vendor` 520KB, `charts-vendor` 396KB, `DataGrid` 384KB | Já há code-splitting de vendors ✅. O chunk `index` de 1.7MB sugere que faltam `lazy()` nas rotas de features. Verificar com `rollup-plugin-visualizer`. |
| Website | Sem lazy loading; jogo de 5774 linhas no bundle inicial | `React.lazy` nas rotas pesadas (§5.3) |
| Backend | `find_all` sem paginação; listagens grandes sem `LIMIT` (`etar_ee_service`, `operations_service`, `documents/core`) | Paginação no `BaseRepository` (§2.1) |
| Backend | `etar_ee_service.py:588` tinha `UNION ALL ... LIMIT 1` — confirmar que não corre em loop (N+1) | Rever |
| CRA | `ChartContainer.js` 3125 linhas — re-renders prováveis | Split + memoização |
| DB | Não avaliei índices (fora do alcance de análise estática) | Correr `EXPLAIN ANALYZE` nas queries de dashboard/listagem sob dados reais |

Nota honesta: performance real só se mede com a app a correr e dados de produção. O acima são *cheiros* de código, não medições.

---

## 7. Higiene de Repositório

- **`.gitignore:101` tem `~.superpowers/`** (com til) em vez de `.superpowers/` → 43 ficheiros da ferramenta de brainstorming estão staged para commit. Corrigir a linha e `git rm -r --cached .superpowers/`.
- `.playwright-mcp/` também aparece staged — adicionar ao `.gitignore`.
- Scripts de debug/teste versionados em `backend/` (§2.4) e na raiz (`diagnostico.ps1`, `brincadeira.vbs`, `update_pass.ps1`).
- Três versões de `Relatorio_Gestao_2025_TI_AINTAR*.docx` e `organograma-*.png` duplicados na raiz — mover para `docs/` ou remover.
- `package.json.backup` no `frontend/` — apagar.

Nada disto é grave, mas um repositório limpo é mais fácil de rever e reduz a hipótese de commitar algo sensível por engano (ver §1.1).

---

## 8. Plano de Execução Priorizado

### Fase 1 — Segurança urgente (esta semana, esforço baixo)
- [ ] **1.1** Remover `teste_sibs_*.py` do repo **e do histórico**; invalidar assinaturas SIBS por precaução
- [ ] **1.2** Remover `/debug-test` e `/test-minimal` de `emission_routes.py`; guard de ambiente para blueprints de debug
- [ ] **1.3** Remover default `aintar-wa-2025` (backend + microserviço + `ecosystem.config.js`); falhar arranque sem `WA_API_KEY`
- [ ] **1.4** `@require_permission('whatsapp.send')` nas 9 rotas WhatsApp em falta
- [ ] **1.5** Rate limiting em `document/create_direct`, `/contacto`, `/avaliacoes`, `/concursal/candidatura`
- [ ] **1.6** Confirmar (com teste) que `/payments/invoice/<id>` valida ownership — senão corrigir IDOR
- [ ] **1.7** Corrigir `.gitignore` `~.superpowers/` → `.superpowers/` + `git rm --cached`

### Fase 2 — Higiene e consolidação (baixo esforço, alto retorno)
- [ ] **2.1** Eliminar `config.py` duplicado (manter uma fonte)
- [ ] **2.2** Limpar scripts de debug de `backend/` e raiz
- [ ] **2.3** Escolher **uma** lib de toast no CRA; remover as outras duas
- [ ] **2.4** Remover 360 `console.log` do CRA (lint rule `no-console` + plugin de build)
- [ ] **2.5** Apagar `pages/Documents/` OU `pages/ModernDocuments/` (a que estiver morta)
- [ ] **2.6** Sanitizar `dangerouslySetInnerHTML` no website com DOMPurify
- [ ] **2.7** `React.lazy` nas rotas pesadas do website (jogo, organograma)

### Fase 3 — Estratégico (decisão + planeamento)
- [ ] **3.1** Decidir e documentar o destino do `frontend/` CRA (data de corte + backlog de migração)
- [ ] **3.2** Estratégia de testes: começar por pagamentos e webhook SIBS no backend
- [ ] **3.3** Adicionar CSP ao Nginx

### Fase 4 — Dívida técnica estrutural (médio/longo prazo, oportunístico)
- [ ] **4.1** Paginação no `BaseRepository` + `GenericCrudService`
- [ ] **4.2** Resolver nesting de `db_session_manager` (começar por caixa/pagamentos)
- [ ] **4.3** Migrar `operationStore` para React Query
- [ ] **4.4** Integrar `EmptyState` no `DataTable` partilhado
- [ ] **4.5** Decompor `InstalacaoPage.jsx` (3149 linhas) e `ChartContainer.js` (3125)
- [ ] **4.6** Auditar escritas diretas em `tb_*` vs regra do CLAUDE.md; documentar exceções

---

## 9. Nota Final — o que está mesmo bem

Para não deixar só a lista de problemas: este é um projeto **notavelmente completo para um único programador**. Backend com service layer coerente, dois frontends modernos (React 19, MUI 7, Vite), website institucional, portal de cliente, integração de pagamentos real, reconhecimento facial para ponto, WebSockets, e — talvez o mais impressionante — uma base de conhecimento (Obsidian Vault) e um `CLAUDE.md` que documentam padrões a sério. A disciplina de ter corrigido a maioria dos achados de junho mostra que o processo funciona.

Os riscos reais são poucos e concentrados: **fechar a superfície de segurança (Fase 1), decidir o destino do frontend antigo (3.1) e começar a testar a camada de pagamentos (3.2).** O resto é dívida técnica normal de um projeto que cresceu depressa, e o plano acima ataca-a por ordem de retorno.

---

*Relatório gerado por análise assistida com verificação manual dos achados de maior severidade (ficheiro + linha). Âmbito: os cinco componentes do projeto AINTAR. Limitações: análise estática, sem execução da app nem pentest nem medição de performance sob carga. Data: 2026-07-06.*
