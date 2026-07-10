# Portal Cliente — Plano de Implementação

> Documento vivo. Actualizar marcadores `[x]` à medida que cada item é concluído.
> Última actualização: 2026-05-05
> Autor: Rui Ramos (com Claude)

---

## 1. Objectivo

Criar uma **área de cliente final** no projecto AINTAR, separada do backoffice (`app.aintar.pt`), permitindo aos clientes:

- Autenticarem-se e gerir o seu perfil
- Consultar os seus pedidos e estado de tramitação
- Submeter novos pedidos (qualquer `tt_doctype`)
- Consultar e pagar facturas (MBWAY, Multibanco/Referência, transferência)
- Receber notificações em tempo real via Socket.IO

A área será acedida em **`clientes.aintar.pt`** e implementada **dentro do `frontend-v2`**, reutilizando toda a infraestrutura (auth JWT, API, permissões, forms, payments, Socket.IO).

---

## 2. Decisões já tomadas

| # | Tema | Decisão |
|---|------|---------|
| 1 | Tipos de pedido | Cliente pode submeter **todos** os `tt_doctype` |
| 2 | Registo | Cliente **regista-se sozinho** (já existem ferramentas de utilizador externo no backoffice) |
| 3 | Pagamento | MBWAY + Referência Multibanco + Transferência |
| 4 | Notificações | Usar **Socket.IO** (mudança de estado, novos eventos) |
| 5 | Subdomínio | **`clientes.aintar.pt`** |

---

## 3. Arquitectura

### 3.1 Princípio
Uma única base de código (`frontend-v2`), uma única build, dois contextos de execução determinados por hostname:

- `app.aintar.pt` → contexto **backoffice** (rotas e layout actuais)
- `clientes.aintar.pt` → contexto **portal** (layout e rotas dedicadas, mesmas APIs)

### 3.2 Componentes envolvidos

```
┌─────────────────────────┐         ┌─────────────────────────┐
│  clientes.aintar.pt     │         │  app.aintar.pt          │
│  (Portal — público)     │         │  (Backoffice — interno) │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                    │
            └──────────────┬─────────────────────┘
                           ▼
            ┌──────────────────────────────────┐
            │  frontend-v2 (mesma build)       │
            │  detecção por hostname →         │
            │  PortalRoutes | BackofficeRoutes │
            └──────────────┬───────────────────┘
                           ▼
            ┌──────────────────────────────────┐
            │  backend Flask                   │
            │  endpoints já existentes +       │
            │  novo perfil 'C' + permissões    │
            │  portal.*                        │
            └──────────────────────────────────┘
```

### 3.3 Permissões e perfil

- Novo perfil `C` na tabela `ts_profile` (Cliente Final)
- Novas permissões granulares em `ts_interface`:
  - `portal.access` — gate de entrada no portal
  - `portal.invoices.view` — listar facturas próprias
  - `portal.payments.pay` — iniciar pagamento
  - `portal.profile.edit` — editar dados próprios
- Reutilizar permissões existentes:
  - `docs.view.owner` — ver pedidos próprios
  - `docs.create` — submeter novos pedidos

### 3.4 Endpoints reaproveitados (já existem no backend)

| Endpoint | Método | Permissão | Uso no portal |
|---|---|---|---|
| `/document_owner` | GET | `docs.view.owner` | Lista de pedidos do cliente |
| `/document/<id>` | GET | `docs.view.owner` | Detalhe do pedido |
| `/create_document` | POST | `docs.create` | Submeter pedido |
| `/add_document_annex` | POST | `docs.create` | Anexar ficheiros |
| `/get_document_anex/<pk>` | GET | — | Download anexos |
| `/payment/mbway` | POST | `portal.payments.pay` | Iniciar MBWAY |
| `/payment/multibanco` | POST | `portal.payments.pay` | Gerar referência MB |
| `/auth/login`, `/register`, `/forgot-password` | POST | público | Auth partilhada |

> **Nota:** endpoints exactos a confirmar na Fase 0 (validar paths e contratos).

---

## 4. Estrutura de ficheiros — `frontend-v2/src/`

```
core/
├── config/
│   ├── appContext.js              [NOVO] detecta hostname → 'portal' | 'backoffice'
│   └── portalRouteConfig.js       [NOVO] rotas + permissões do portal
└── routing/
    ├── BackofficeRoutes.jsx       [NOVO] move-se App.jsx actual para aqui
    └── PortalRoutes.jsx           [NOVO]

features/
└── portal/                        [NOVO MÓDULO]
    ├── pages/
    │   ├── PortalHomePage.jsx
    │   ├── PortalPedidosPage.jsx
    │   ├── PortalPedidoDetailPage.jsx
    │   ├── PortalNovoPedidoPage.jsx
    │   ├── PortalFacturasPage.jsx
    │   ├── PortalPagamentoPage.jsx
    │   ├── PortalPerfilPage.jsx
    │   └── index.js
    ├── components/
    │   ├── PortalHeader.jsx
    │   ├── PortalFooter.jsx
    │   ├── PedidoCard.jsx
    │   ├── EstadoPedidoChip.jsx
    │   ├── NovoPedidoWizard.jsx
    │   ├── FacturaRow.jsx
    │   └── PagamentoMethodSelector.jsx
    ├── hooks/
    │   ├── useMeusPedidos.js
    │   ├── useMinhasFacturas.js
    │   ├── useSubmeterPedido.js
    │   └── usePortalNotifications.js   [Socket.IO]
    ├── api/
    │   └── portalService.js
    └── index.js

shared/components/layout/
├── PortalLayout.jsx               [NOVO]
└── PortalNavbar.jsx               [NOVO]
```

---

## 5. Faseamento

> Cada fase é independente e fica utilizável no fim. Marcar `[x]` quando concluído.

### Fase 0 — Fundações backend (0,5 dia)

- [x] Confirmar endpoints e contratos exactos (params, retornos)
- [x] Perfil `C` (pk=3 "Perfil Cliente") já existe em `ts_profile` — confirmado pelo utilizador
- [x] Script SQL criado em `backend/sql/portal_cliente_fase0.sql` — permissões `portal.*`, `docs.view.owner`, `docs.create` + atribuição ao perfil pk=3
- [x] **Executar script SQL** na base de dados de produção/dev (✅ Executado com sucesso)
- [ ] Validar que `/register` aceita criar utilizador com perfil `C` (Será feito na Fase 2)
- [ ] Smoke test: criar cliente fictício, login, listar `/document_owner` (vazio mas 200 OK)

**Saída:** backend pronto para receber clientes. Nada visível ainda.

### Fase 1 — Split de contexto frontend (0,5 dia)

- [x] Criar `core/config/appContext.js` (detecção hostname + override por env var em dev)
- [x] Criar `core/routing/BackofficeRoutes.jsx` (mover conteúdo actual do `App.jsx`)
- [x] Criar `core/routing/PortalRoutes.jsx` (esqueleto com auth partilhada + placeholder)
- [x] Refactor `App.jsx` para ramificar entre os dois
- [x] Adicionar `VITE_APP_CONTEXT` opcional no `.env` (comentado por defeito)
- [x] **Verificar** que o backoffice continua 100% funcional (regressão zero)

**Saída:** infraestrutura de routing pronta. Portal ainda mostra 404.

### Fase 2 — Layout e auth do portal (1 dia)

- [x] `shared/components/layout/PortalLayout.jsx` (header + outlet + footer)
- [x] `shared/components/layout/PortalNavbar.jsx` (logo, nav horizontal, avatar/sair)
- [x] `shared/components/layout/PortalFooter.jsx` (contactos + links institucionais)
- [x] Adaptar `LoginPage` para variante "portal" (prop ou ramificação por contexto)
- [x] Adaptar `RegisterPage` para criar perfil `C` automaticamente
- [x] `ForgotPasswordPage`/`ResetPasswordPage` partilhadas
- [x] `UnauthorizedPage`/`ForbiddenPage` com variante portal (ações apropriadas)
- [ ] Testar fluxo completo: registo → activação → login → home portal vazia

**Saída:** cliente consegue criar conta e entrar. Home placeholder.

### Fase 3 — Pedidos: lista e detalhe (Concluída)

- [x] `portalService.js` — wrapper sobre `documentsService` existente
- [x] `useMeusPedidos.js` — TanStack Query sobre `/document_owner`
- [x] `PortalPedidosPage.jsx` — lista com `useSearch` + `SearchBar` (padrão obrigatório)
- [x] `PedidoCard.jsx` — card visual mobile-first
- [x] `EstadoPedidoChip.jsx` — chip colorido por `tt_status`
- [x] `PortalPedidoDetailPage.jsx` — detalhe + linha temporal de steps + anexos para download
- [x] Filtros básicos: estado, tipo, data
- [x] Empty state e loading skeleton
- [x] Testar com cliente real que tenha pedidos no histórico

**Saída:** cliente vê o seu histórico de pedidos.

### Fase 4 — Submissão de novo pedido (Concluída)

- [x] `useSubmeterPedido.js` (mutation TanStack Query)
- [x] `NovoPedidoWizard.jsx` com 3 passos:
  - Passo 1: tipo de pedido (`tt_doctype`)
  - Passo 2: campos básicos (morada, descrição)
  - Passo 3: anexos (dropzone) + revisão + submeter
- [x] Validação Zod por passo
- [x] Submissão Multipart (campos + ficheiros)
- [x] Toast de sucesso com redirecionamento para lista
- [x] Tratamento de erros (campos obrigatórios faltam, ficheiro muito grande, etc.)
- [x] Testar fluxo completo até à criação do registo no backend

**Saída:** cliente submete pedidos pelo portal.

### Fase 5 — Facturas e pagamentos (Concluída)

- [x] Endpoint `/payments/me` no backend para listar faturas da entidade
- [x] `useMinhasFaturas.js` — query TanStack
- [x] `PortalFacturasPage.jsx` — lista com estado (Liquidada/Pendente) e valores
- [x] Integração com `PaymentDialog.jsx` (MBWAY, Multibanco) reutilizando componentes existentes
- [x] Lógica de download de fatura (PDF)
- [x] Testar fluxo de pagamento direto pelo portal

**Saída:** cliente paga e consulta faturas pelo portal.

### Fase 6 — Perfil e notificações (Concluída)

- [x] `PortalPerfilPage.jsx` — formulário de atualização de dados da entidade (email, telefone, morada)
- [x] Badge de Notificações na Navbar (reutilizando `NotificationCenter.jsx`)
- [x] Polimento final da UI (Links na Navbar: Pedidos, Faturas, Início)
- [x] Integração completa com o sistema de autenticação e socket do backoffice
- [x] Toast (sonner) ao receber evento + badge no header
- [x] Lista de notificações persistente (popover do header)

**Saída:** cliente recebe notificações em tempo real.

### Fase 7 — Deploy e produção (1 dia)

- [ ] Configurar Nginx: server block para `clientes.aintar.pt` apontar para a mesma build
- [ ] Certificado Let's Encrypt para o subdomínio
- [ ] DNS: registo A/CNAME para `clientes.aintar.pt`
- [ ] CORS no backend: aceitar origin `https://clientes.aintar.pt`
- [ ] Cookies/JWT: confirmar partilha de sessão se necessário (provavelmente domínios separados, sem partilha)
- [ ] Smoke test em produção: registo + login + submeter pedido + pagar
- [ ] Adicionar link "Área de Cliente" no `website/` (botão no header de `aintar.pt`)
- [ ] Documentar no Obsidian vault (`02 - Módulos/Portal Cliente.md`)

**Saída:** portal disponível ao público.

---

## 6. Estado actual

> Onde estamos hoje (2026-05-06):
>
> - [x] **Fase 0 — Plano aprovado** (este documento)
> - [x] Fase 0 — Fundações backend ✅
> - [x] Fase 1 — Split de contexto frontend ✅
> - [x] Fase 2 — Layout e auth do portal ✅ (Falta testar)
> - [x] Fase 3 — Pedidos: lista e detalhe ✅
> - [x] Fase 4 — Submissão de novo pedido ✅
> - [x] Fase 5 — Facturas e pagamentos ✅
> - [x] Fase 6 — Perfil e notificações ✅
> - [~] Fase 7 — Deploy e produção (A iniciar...)

**Próximo passo:** O utilizador deve testar o fluxo de registo, login e visualização da Home Vazia no Portal do Cliente. Quando validado, arrancar com a Fase 3 (lista de pedidos).

---

## 7. Decisões em aberto / a confirmar à medida

| Tema | Pergunta | Quando responder |
|---|---|---|
| Endpoint de facturas | Existe `GET /invoices/by-client` ou precisa ser criado? | Fase 0 |
| Activação de conta | É por email com link, ou imediata? | Fase 2 |
| Validação de NIF/contribuinte no registo | Validar contra `tb_entity` existente? | Fase 2 |
| Limite de tamanho de anexos | Valor actual no backend? | Fase 4 |
| Métodos de pagamento por tipo de factura | Todos os métodos para todas, ou restrições? | Fase 5 |
| Política de retenção de notificações | Quanto tempo guardar histórico? | Fase 6 |

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Cliente vê dados que não são seus por bug de scoping | Permissão `docs.view.owner` já filtra por `ts_client` no backend; testar com 2 contas |
| Webhook SIBS chegar antes do polling do cliente | Já tratado pelo backend; cliente recebe via Socket.IO ou no próximo polling |
| Registo público abre porta a spam de contas falsas | Activação por email obrigatória + rate limit existente |
| Subdomínio expõe build do backoffice | Build é a mesma, mas só rotas portal estão acessíveis no contexto portal; rotas backoffice retornam 404 |
| Sessão JWT mistura entre subdomínios | Domínios separados não partilham cookies — login independente em cada portal (intencional) |

---

## 9. Como retomar uma sessão

Quando voltarmos a este projecto:

1. Ler este documento de cima a baixo
2. Conferir secção **6 — Estado actual** para saber a fase activa
3. Verificar checkboxes da fase corrente — o primeiro `[ ]` é o próximo passo
4. Confirmar que nada mudou no backend desde a última sessão (`git log` em `backend/`)
5. Continuar dali

---

## Anexos

- Decisões arquitecturais discutidas: ver histórico de conversa de 2026-05-05
- Padrões obrigatórios do projecto: `C:\Users\rui.ramos\Desktop\APP\CLAUDE.md`
- Base de conhecimento: `Documents\Obsidian Vault\`
