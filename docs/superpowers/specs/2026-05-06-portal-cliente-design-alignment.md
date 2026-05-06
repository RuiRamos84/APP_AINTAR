# Spec: Portal Cliente — Alinhamento Visual com o Website

**Data:** 2026-05-06
**Âmbito:** `frontend-v2/src/features/portal/` + `frontend-v2/src/shared/components/layout/Portal*`
**Abordagem escolhida:** Opção A — Manter MUI v7, aproximar design ao website

---

## Contexto

O website AINTAR (`website/`) usa Tailwind CSS v4 + Framer Motion + Lucide React com um design system visual rico (gradientes, glass effects, wave transitions, animações). O Portal do Cliente (`frontend-v2/`) usa MUI v7 e apresenta uma experiência visual desalinhada: tipografia diferente, navbar estática, páginas planas, auth sem identidade de marca.

O objetivo é minimizar essa diferença sem migrar o stack (MUI permanece), focando nos 6 pontos de maior impacto visual.

---

## Secção 1 — Tipografia & Tokens

### O que muda
- Instalar `@fontsource/plus-jakarta-sans` e `@fontsource/inter` no `frontend-v2`
- Actualizar `frontend-v2/src/styles/tokens/typography.js`:
  - `fontFamily.display` → `'Plus Jakarta Sans', system-ui, sans-serif`
  - `fontFamily.primary` → `'Inter', system-ui, sans-serif`
- Importar as fontes em `frontend-v2/src/main.jsx`
- Corrigir logo paths em `PortalNavbar` e `PortalFooter`:
  - Colorido: `/logos/logo-horizontal-color.png`
  - Branco: `/logos/logo-horizontal-white.png`

### Ficheiros afectados
- `frontend-v2/src/styles/tokens/typography.js`
- `frontend-v2/src/main.jsx`
- `frontend-v2/src/shared/components/layout/PortalNavbar.jsx`
- `frontend-v2/src/shared/components/layout/PortalFooter.jsx`

---

## Secção 2 — PortalNavbar Redesign

### O que muda
O AppBar MUI estático é substituído por uma navbar com comportamento idêntico ao website:

**Comportamento de scroll:**
- `scrollY === 0`: background transparente, logo colorido
- `scrollY > 60`: glass effect (`backdrop-filter: blur(12px)`, `background: rgba(255,255,255,0.85)`), sombra subtil, border-bottom `rgba(0,0,0,0.06)`

**Elementos visuais:**
- Entrada animada: slide-down com Framer Motion (`y: -80 → 0`, duration 0.5s, ease easeOut)
- Barra de progresso de scroll: 2px em `aintar-sky` (#29B5E8), posicionada no bottom do header, usando `useScroll` + `useSpring` do Framer Motion
- Links de navegação: estilo pill (`borderRadius: 100`, px 2, hover com `bgcolor: aintar-light`)
- Altura: `80px` no topo → `64px` após scroll (transição CSS)

**Mobile:**
- Botão hambúrguer com ícone Menu/Close
- Menu dropdown animado com Framer Motion (opacity + translateY)
- Link "Área de Cliente" destaque no fundo do menu mobile

**Sem alterações:** estrutura de links (Pedidos, Faturas), avatar com dropdown, NotificationCenter, theme toggle.

### Ficheiros afectados
- `frontend-v2/src/shared/components/layout/PortalNavbar.jsx` — rewrite completo do JSX/estilo

---

## Secção 3 — PortalAuthLayout (novo componente)

### O que é
Novo componente `PortalAuthLayout` que substitui o layout de auth genérico nas rotas do portal. Activado pela flag `IS_PORTAL` existente em `@/core/config/appContext`.

### Layout split screen
```
┌─────────────────────────┬──────────────────────────┐
│  Painel AINTAR          │  Formulário               │
│  (hidden em mobile)     │                           │
│  Gradiente navy→blue    │  Logo (mobile only)       │
│  Logo branco grande     │  Título da página         │
│  Tagline institucional  │  Form content             │
│  Decorações blur        │  Link "Voltar ao website" │
└─────────────────────────┴──────────────────────────┘
```

**Painel esquerdo (md+):**
- Background: `linear-gradient(135deg, #0A1628 0%, #1B5E8E 100%)`
- Logo: `/logos/logo-horizontal-white.png`, height 40px
- Tagline: "Gestão responsável dos sistemas de saneamento na região Centro."
- Decorações: 2 círculos com `border-radius: 50%`, blur 80px, `aintar-sky` 6% e `aintar-teal` 4% de opacidade

**Painel direito:**
- Background: `background.paper` (branco em light, navy em dark)
- Logo colorido pequeno no topo (só em mobile, height 28px)
- `Outlet` renderiza o formulário
- Link "← Voltar ao website" no rodapé do painel

**Sem Navbar nem Footer** — experiência focada na autenticação.

### Ficheiros afectados
- `frontend-v2/src/shared/components/layout/PortalAuthLayout.jsx` — novo ficheiro
- `frontend-v2/src/core/routing/PortalRoutes.jsx` — usar `PortalAuthLayout` nas rotas de auth do portal

---

## Secção 4 — PortalLayout & Atmosfera das Páginas

### O que muda

**Background do PortalLayout:**
Substituir o `bgcolor: '#f8fafc'` por:
```js
background: 'radial-gradient(ellipse at top center, #EFF6FC 0%, #ffffff 60%)'
```

**Accent decorativo:**
Elemento `Box` absoluto no canto superior direito do layout, sem pointer events:
- Círculo 600px, `bgcolor: '#29B5E8'`, `opacity: 0.03`, `borderRadius: '50%'`, `filter: 'blur(80px)'`
- Posicionado: `top: -200px`, `right: -200px`

**PortalPageHeader — novo componente partilhado:**
Componente `PortalPageHeader` em `frontend-v2/src/shared/components/layout/`.

```
┌────────────────────────────────────────────────────┐
│ ▌ Título da Página          [Acção Primária]        │
│   Subtítulo descritivo opcional                    │
└────────────────────────────────────────────────────┘
```

Props:
- `title` (string, obrigatório)
- `subtitle` (string, opcional)
- `actions` (ReactNode, opcional)

Estilo:
- Fundo `background.paper`, border-bottom `1px solid divider`
- Accent: `Box` de 3px largura × 28px altura, `bgcolor: 'secondary.main'` (#29B5E8), `borderRadius: 2`, à esquerda do título
- Título: variant `h5`, fontWeight 800, Plus Jakarta Sans
- Animação de entrada: `motion.div` com `initial={{ opacity: 0, y: -8 }}` → `animate={{ opacity: 1, y: 0 }}`, duration 0.3s

Adoptado em todas as páginas do portal: `PortalPedidosPage`, `PortalFacturasPage`, `PortalPerfilPage`, `PortalPedidoDetailPage`, `PortalNovoPedidoPage`.

### Ficheiros afectados
- `frontend-v2/src/shared/components/layout/PortalLayout.jsx`
- `frontend-v2/src/shared/components/layout/PortalPageHeader.jsx` — novo ficheiro
- `frontend-v2/src/features/portal/pages/*.jsx` — substituir cabeçalhos inline por `PortalPageHeader`

---

## Secção 5 — PortalFooter com Wave Transition

### O que muda

**Wave animada no topo do footer:**
Idêntica ao website `Footer.jsx` — duas camadas SVG absolutas:
- Camada 1 (fundo, 12s, reverse): `fill: rgba(255,255,255,0.25)`
- Camada 2 (frente, 8s): `fill: white`
- Altura: 64px, `overflow: hidden`, `pointer-events: none`
- Keyframe `waveSlide` **não existe** no frontend-v2 — adicionar em `frontend-v2/src/styles/global.css`

**Contactos reais:**
Substituir os IconButton placeholder por links funcionais:
- Telefone: `tel:+351232017073`
- Email: `mailto:geral@aintar.pt`
- Facebook: `https://www.facebook.com/aintarjuntospeloambiente/`
- Instagram: `https://www.instagram.com/aintar_juntospeloambiente/`

**Links do bottom bar:**
- Política de Privacidade → `https://aintar.pt/politica-privacidade`
- Termos de Utilização → `https://aintar.pt/termos-utilizacao`
- Livro de Reclamações → `https://www.livroreclamacoes.pt` (externo)

### Ficheiros afectados
- `frontend-v2/src/shared/components/layout/PortalFooter.jsx`
- `frontend-v2/src/styles/global.css` (se `waveSlide` não existir)

---

## Resumo de Ficheiros

| Acção | Ficheiro |
|---|---|
| Modificar | `frontend-v2/src/styles/tokens/typography.js` |
| Modificar | `frontend-v2/src/main.jsx` |
| Modificar | `frontend-v2/src/shared/components/layout/PortalNavbar.jsx` |
| Modificar | `frontend-v2/src/shared/components/layout/PortalLayout.jsx` |
| Modificar | `frontend-v2/src/shared/components/layout/PortalFooter.jsx` |
| Modificar | `frontend-v2/src/core/routing/PortalRoutes.jsx` |
| Modificar | `frontend-v2/src/features/portal/pages/*.jsx` (5 ficheiros) |
| Criar | `frontend-v2/src/shared/components/layout/PortalAuthLayout.jsx` |
| Criar | `frontend-v2/src/shared/components/layout/PortalPageHeader.jsx` |

**Dependências a instalar:**
```bash
cd frontend-v2 && npm install @fontsource/plus-jakarta-sans @fontsource/inter
```

**Assets a copiar:**
Os ficheiros de logo do website não existem em `frontend-v2/public/`. Copiar como parte da implementação:
```
website/public/logos/ → frontend-v2/public/logos/
```
(todos os ficheiros: `logo-horizontal-color.png`, `logo-horizontal-white.png`, etc.)

---

## O que NÃO muda
- Stack MUI v7 — mantido integralmente
- Lógica de auth (`useLogin`, `useAuth`, hooks) — sem alterações
- Backoffice — completamente isolado destas mudanças
- Estrutura de rotas — `PortalRoutes.jsx` apenas troca o layout wrapper de auth
- Componentes de dados (`PedidoCard`, `EstadoPedidoChip`, etc.) — mantidos
