# Motion/Animation Improvement Plans

Gerados pela skill `improve-animations` (auditoria de 2026-07-23, commit `a93c46f`) a
pedido do utilizador, cobrindo `website/` e `frontend-v2/`. 21 planos, um por finding
vetado (2 fusões permitidas pelo template quando o mesmo ficheiro/padrão de correção se
repetia). Cada plano é autocontido — path exato, código atual verbatim, valores-alvo
exatos do [AUDIT.md](../.claude/skills/improve-animations/AUDIT.md), passos e critérios
de verificação (mecânicos + feel-check). Nenhum código de produção foi alterado ao
escrever estes planos — só leitura + escrita em `plans/`.

Para executar um plano: `improve-animations execute <plan>` (despacha um subagente
executor num worktree isolado e revê o diff com a bar do `review-animations`), ou
qualquer agente/modelo com acesso ao ficheiro do plano.

## Execução — website/ (2026-07-23)

Os 8 planos do `website/` (001-008) foram implementados e revistos — ver estado na
tabela abaixo. Worktree: `C:\Users\rui.ramos\Desktop\APP-website-motion`, branch
`feature/website-motion-audit`, 3 commits à frente de `master` na altura da execução
(`a93c46f`). Cada plano passou por: executor num worktree isolado → `npm run build`
(reconfirmado independentemente, não só pelo relatório do executor) → revisão contra a
bar de `review-animations` (10 standards, tabela de findings + veredicto Approve/Block).
**Todos aprovados, zero regressões, zero drift entre o código citado nos planos e o
código real.**

**Em falta antes de fazer merge para `master`:**
- **Feel-check visual** — nenhuma das verificações "sinta a animação no browser,
  DevTools Animations panel a 10%, toggle de `prefers-reduced-motion`" foi feita, só a
  verificação mecânica (build). Isto precisa de olhos humanos/browser real.
- **`.gitignore:75` tem uma regra `lib/` genérica** (resíduo de template Python) que
  ignora *qualquer* pasta `lib/` no repo, incluindo a nova `website/src/lib/motion.js`
  criada pelo plano 006. Sem corrigir isto, um `git add -A`/commit normal ignora esse
  ficheiro silenciosamente. Não corrigido ainda — decisão de scope para o utilizador
  (ex.: apagar a regra, ou restringi-la a um path específico se protegia algo real).
- **Merge/PR** — as alterações ficam só no worktree/branch até o utilizador decidir
  como trazê-las para `master` (merge direto ou PR para rever no GitHub primeiro).

## Execução — frontend-v2/ (2026-07-23)

Os 13 planos do `frontend-v2/` (009-021) foram implementados e revistos. Worktree:
`C:\Users\rui.ramos\Desktop\APP-frontend-v2-motion`, branch
`feature/frontend-v2-motion-audit`. Ordem respeitada: 009→010→011→013→020→012→019→
{014,015,016,017,018,021}. **Todos aprovados**, zero regressões, zero drift entre o
código citado nos planos e o código real — incluindo pontos de risco elevado
verificados pessoalmente: apagamento de 15 ficheiros mortos (016, confirmado sem
importadores pendentes e sem tocar no `layout/PageTransition.jsx` vivo) e a colocação
correta dos hooks `useRef`/`useEffect` antes dos early-returns nos 4 gráficos (017,
evita violar a regra dos hooks em runtime). Build completo (`npm run build`) passa com
todos os 13 planos aplicados em conjunto.

Mesma nota do website: falta o feel-check visual (só verificação mecânica foi feita) e
o merge para `master` fica pendente de decisão do utilizador.

## Índice

| # | Plano | App | Sev. | Categoria | Estado |
|---|---|---|---|---|---|
| 001 | [Fix ease-in on PageTransition exit](001-page-transition-easing.md) | website | HIGH | Easing & duration | DONE (build ✓, feel-check pendente) |
| 002 | [transition-all → propriedades explícitas (botões/card)](002-btn-card-transition-all.md) | website | HIGH | Performance | DONE (build ✓, feel-check pendente) |
| 003 | [Remover dupla animação Framer/GSAP no StatCard](003-statssection-dual-engine.md) | website | HIGH | Performance/Coesão | DONE (build ✓, feel-check pendente) |
| 004 | [Arquitetura de reduced-motion (8 ficheiros)](004-reduced-motion-architecture.md) | website | HIGH | Acessibilidade | DONE (build ✓, feel-check pendente) |
| 005 | [transform-origin no dropdown do Navbar](005-navbar-dropdown-origin.md) | website | MEDIUM | Physicalidade/origem | DONE (build ✓, feel-check pendente) |
| 006 | [Tokens de motion no index.css + dedup JogoPage](006-motion-tokens-module.md) | website | MEDIUM | Coesão/tokens | DONE (build ✓, feel-check pendente) |
| 007 | [Animar sucesso de formulários (3 forms)](007-form-success-transitions.md) | website | MEDIUM | Oportunidade perdida | DONE (build ✓, feel-check pendente) |
| 008 | [Motion no lightbox do ImageGallery + crossfade partido](008-image-gallery-lightbox-motion.md) | website | MEDIUM | Oport. perdida/Perf. | DONE (build ✓, feel-check pendente) |
| 009 | [Remover AnimatePresence por linha no DataTable](009-datatable-row-animation.md) | frontend-v2 | HIGH | Performance | DONE (build ✓, feel-check pendente) |
| 010 | [AppBar: height/min-height/font-size → transform](010-appbar-height-to-transform.md) | frontend-v2 | HIGH | Performance | DONE (build ✓, feel-check pendente) |
| 011 | [transition:all → propriedades explícitas (chrome de navegação)](011-nav-chrome-transition-all.md) | frontend-v2 | HIGH | Performance | DONE (build ✓, feel-check pendente) |
| 012 | [Reduced-motion: page transitions, DataTable, AppBar](012-reduced-motion-architecture.md) | frontend-v2 | HIGH | Acessibilidade | DONE (build ✓, feel-check pendente) |
| 013 | [TaskCard: transition explícita + fix scale(0) do badge](013-taskcard-transition-and-scale.md) | frontend-v2 | HIGH | Performance/Physic. | DONE (build ✓, feel-check pendente) |
| 014 | [Tokens de transição no painel de Filtros](014-filtros-panel-height-animation.md) | frontend-v2 | HIGH | Performance | DONE (build ✓, feel-check pendente) |
| 015 | [Fix @keyframes pulse em falta no TaskModal](015-taskmodal-missing-keyframes.md) | frontend-v2 | MEDIUM | Coesão (bug funcional) | DONE (build ✓, feel-check pendente) |
| 016 | [Apagar componentes animation/ui mortos](016-delete-dead-animation-components.md) | frontend-v2 | MEDIUM | Coesão (código morto) | DONE (build ✓, feel-check pendente) |
| 017 | [Duração de entrada consistente nos 4 gráficos](017-chart-animation-duration-consistency.md) | frontend-v2 | MEDIUM | Coesão/tokens | DONE (build ✓, feel-check pendente) |
| 018 | [Fix scale(0) no ComingSoonPage](018-comingsoon-scale-fix.md) | frontend-v2 | LOW | Physicalidade/origem | DONE (build ✓, feel-check pendente) |
| 019 | [Módulo de tokens de motion + consolidar 2 curvas de página](019-motion-tokens-module.md) | frontend-v2 | MEDIUM | Coesão/tokens | DONE (build ✓, feel-check pendente) |
| 020 | [Feedback de "levantar" no drag do kanban + fix drop-zone](020-kanban-drag-feedback.md) | frontend-v2 | MEDIUM | Oport. perdida/Physic. | DONE (build ✓, feel-check pendente) |
| 021 | [Transição de entrada no sucesso do FaceEnrollModal](021-face-enroll-success-transition.md) | frontend-v2 | MEDIUM | Oportunidade perdida | DONE (build ✓, feel-check pendente) |

## Ordem de execução recomendada

`website/` e `frontend-v2/` não partilham nenhum ficheiro — as duas faixas abaixo podem
correr em paralelo (duas pessoas/agentes em simultâneo) sem colisão nenhuma. Dentro de
cada faixa, a ordem importa onde há dependência explícita.

### Faixa A — website/ (independente da faixa B)

```
001 → 002 → 005 → 006 → 003 → 004 → 007 → 008
```

Sem dependências rígidas entre eles — esta é só a ordem por leverage (vitórias triviais
primeiro, a arquitetura grande de reduced-motion a meio, os aditivos por último). 006
cria o módulo de tokens mas nenhum plano posterior depende dele ter corrido primeiro
(cada plano usa os valores literais do AUDIT.md diretamente).

### Faixa B — frontend-v2/ (independente da faixa A)

```
009 → 010 → 011 → 013 → 020 → 012 → 019 → { 014, 015, 016, 017, 018, 021 } (independentes, qualquer ordem)
```

**Dependências explícitas (não trocar esta ordem):**

- **012 depende de 009 e 010 terem corrido primeiro** — as suas secções 2 (DataTable)
  e 3 (AppBar) são condicionais ao que 009/010 deixarem no código; o próprio plano 012
  tem um bloco `## Dependencies` a explicar os dois ramos possíveis.
- **010 e 011 tocam ambos em `AppBar.jsx`**, em ranges de linhas disjuntos (010:
  ~145-222; 011: ~281, ~301) — não colidem, mas correr 010 antes de 011 evita confusão
  de quem está a executar os planos manualmente.
- **011 exclui deliberadamente `TaskColumn.jsx:141`** (`transition: all` na drop-zone do
  kanban) — essa correção foi movida para o plano **020**, que já mexe nesse ficheiro
  para o feedback de drag. Não duplicar a correção no 011.
- **013 e 020 tocam ambos em `TaskCard.jsx`**, em ranges disjuntos (013: linha 285 e
  301-337; 020: linhas 266-271 apenas) — mesma lógica do 010/011, ordem sugerida evita
  confusão mas não é obrigatória.
- **019 evita deliberadamente** os ficheiros `Sidebar.jsx`/`AppBar.jsx`/
  `NotificationCenter.jsx`/`PortalNavbar.jsx` (durações à mão que ficam por consolidar
  nesta ronda) precisamente para não colidir com 010/011 — corre melhor depois desses
  dois, mas não é um bloqueio rígido.
- **016** (apagar código morto) é independente — nenhum outro plano toca
  `shared/components/animation/*` ou `shared/components/ui/{Button,Card,Input,LordiconIcon}/*`.

## Desvios encontrados durante a escrita dos planos (não inventados — confirmados por leitura)

Os dois agentes que escreveram os planos leram sempre o código atual antes de o citar;
onde a descrição original do finding não batia certo com o código real, documentaram o
desvio em vez de inventar. Os mais relevantes:

- **004** — a suposição de que `PageHeader.jsx`/`Footer.jsx` reutilizavam os componentes
  `WaveDivider`/`AnimatedWaveDivider` estava errada: cada um tem a sua própria cópia
  inline duplicada da mesma animação `waveSlide`/`infinite`. O plano trata os 4 ficheiros
  como alvos separados, não 2.
- **009** — a vista mobile do DataTable (`DataTable.jsx:289-298`) tem o mesmo problema de
  replay-on-pagination que a vista desktop, mas não estava no scope original — o agente
  estendeu a correção para a cobrir também (mesmo ficheiro, mesmo padrão).
- **010** — converter tudo para `transform: scale()` como sugerido inicialmente
  partiria o layout: `Sidebar.jsx:60` lê o mesmo booleano `scrolled` para calcular o seu
  próprio `marginTop`/`height`, e o `minHeight` dos `Tabs` funciona como piso. O plano
  converte só o que é seguro (logo, ícone do tab, tamanho de fonte do tab) e documenta
  explicitamente as duas transições de `min-height` que ficam por converter, com a razão
  técnica.
- **017** — confirmado Recharts `^3.8.0`; a prop de easing usa a string documentada
  `"ease-out"`, não aceita cubic-bezier arbitrário.
- **019** — confirmado que `PortalLayout.jsx` não tem nenhum wrapper de transição de
  página (`<Outlet/>` nu) — citado como evidência da falta de padrão único, mas
  deliberadamente fora do scope deste plano (adicionar uma transição de página nova ao
  portal é uma decisão de scope maior, não uma consolidação de tokens).
