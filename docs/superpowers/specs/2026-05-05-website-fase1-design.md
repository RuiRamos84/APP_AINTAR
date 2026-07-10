ç# Design: Website Público AINTAR — Fase 1 (Crítico)

## Contexto

O website público AINTAR (`website/` folder) é uma aplicação Vite + React 19 + Tailwind CSS v4 + Framer Motion. Avaliado em ~7/10. A Fase 1 resolve as três lacunas críticas: ausência de transições de página, ausência de meta tags SEO, e ausência de banner RGPD.

## Stack

- React 19 + Vite 8 + React Router DOM v7
- Framer Motion 12 (já instalado — zero novas deps para transições e cookie consent)
- `react-helmet-async` (nova dep — única adição da Fase 1, padrão da indústria para SEO em SPAs React)

---

## 1. Transições de Página

### Problema

`App.jsx` renderiza rotas com corte abrupto — zero animação entre navegações.

### Solução

`AnimatePresence` do Framer Motion a nível do router com `mode="wait"`.

### Arquitetura

**Novo componente:** `website/src/components/ui/PageTransition.jsx`

```
motion.div
  variants: { initial: {opacity:0, y:12}, enter: {opacity:1, y:0}, exit: {opacity:0, y:-8} }
  transition entrada: duration 0.35s, ease [0.22, 1, 0.36, 1]
  transition saída:  duration 0.20s, ease easeIn
```

**Modificação em `App.jsx`:**
- Extrair conteúdo de `App()` para `AppRoutes()` interno (necessário para usar `useLocation` dentro de `<BrowserRouter>`)
- `AppRoutes` lê `useLocation()` e envolve `<Routes location={location} key={location.key}>` com `<AnimatePresence mode="wait" initial={false}>`
- Cada `<Route element={...}>` fica envolvido: `<Route path="/" element={<PageTransition><HomePage /></PageTransition>} />`

### Ficheiros

| Ação | Ficheiro |
|---|---|
| Criar | `website/src/components/ui/PageTransition.jsx` |
| Modificar | `website/src/App.jsx` |

---

## 2. SEO — Meta Tags por Página

### Problema

Zero `<title>`, `<meta description>`, Open Graph. Google indexa mal, partilhas sociais sem preview.

### Solução

`react-helmet-async` + componente `SeoHead` + integração no `PageLayout`.

### Arquitetura

**Instalação:** `npm install react-helmet-async` (no diretório `website/`)

**`main.jsx`:** envolver `<App />` com `<HelmetProvider>`

**Novo componente:** `website/src/components/ui/SeoHead.jsx`

Props:
- `title` (string) — formatado como `"[title] — AINTAR"`, ou título completo se omitido
- `description` (string)
- `image` (string, default: `"/logos/logo-horizontal-color.png"`)
- `canonical` (string, opcional)

Emite: `<title>`, `<meta name="description">`, `<meta property="og:title/description/image/type/url">`, `<link rel="canonical">` quando fornecido.

**`PageLayout.jsx`:** recebe props `seoTitle` e `seoDescription` e renderiza `<SeoHead>` automaticamente — cobre todas as páginas interiores com uma única alteração.

**Páginas com SEO manual** (não usam PageLayout ou têm conteúdo dinâmico):

| Página | title | description | image |
|---|---|---|---|
| `HomePage` | `AINTAR — Gestão Sustentável dos Sistemas de Saneamento` | `Servimos os municípios da região Centro de Portugal com rigor técnico, inovação e compromisso com o ambiente.` | logo-horizontal-color.png |
| `NoticiaPage` | `[noticia.titulo] — AINTAR` | `noticia.resumo` | `fileUrl(noticia.imagem_url)` ou logo |

**Todas as outras páginas:** passam `seoTitle` e `seoDescription` ao `PageLayout` via props. Exemplos:

| Página | seoTitle | seoDescription |
|---|---|---|
| `QuemSomosPage` | `Quem Somos` | `Conheça a AINTAR — associação que gere os sistemas intermunicipais de saneamento na região Centro.` |
| `ContactosPage` | `Contactos` | `Contacte a AINTAR: telefone, email e localização da sede em Carregal do Sal.` |
| `NoticiasPage` | `Notícias` | `Acompanhe as últimas notícias e comunicados da AINTAR.` |
| `SaneamentoPage` | `Sistemas de Saneamento` | `Gestão de 700 km de rede de coletores, 145 ETARs e 91 elevatórias nos 4 municípios associados.` |
| (restantes) | `[título da página]` | descrição contextual curta |

### Ficheiros

| Ação | Ficheiro |
|---|---|
| Instalar dep | `website/package.json` (react-helmet-async) |
| Modificar | `website/src/main.jsx` |
| Criar | `website/src/components/ui/SeoHead.jsx` |
| Modificar | `website/src/components/layout/PageLayout.jsx` |
| Modificar | `website/src/pages/HomePage.jsx` |
| Modificar | `website/src/pages/comunicacao/NoticiaPage.jsx` |
| Modificar | ~20 páginas interiores (adicionar seoDescription a PageLayout — seoTitle reutiliza o `title` já existente) |

---

## 3. Banner Cookie Consent (RGPD)

### Problema

Ausente — legalmente obrigatório para qualquer website público português (Lei 41/2004 e RGPD).

### Solução

Componente custom sem novas dependências. Usa Framer Motion (já presente) e classes CSS já existentes (`glass`, cores AINTAR).

### Arquitetura

**Novo componente:** `website/src/components/ui/CookieBanner.jsx`

Comportamento:
1. Ao montar, verifica `localStorage.getItem('aintar_consent')`
2. Se ausente: exibe banner com animação slide-up (`AnimatePresence` + `motion.div`, `y: 100 → 0`)
3. Botão **"Aceitar Todos"** (btn-primary): grava `aintar_consent = 'all'`, fecha
4. Botão **"Apenas Essenciais"** (btn-outline): grava `aintar_consent = 'essential'`, fecha
5. Link **"Saber mais"** aponta para `/politica-privacidade`

Visual:
- Posição: `fixed bottom-0 left-0 right-0 z-[60]`
- Fundo: `glass` + `border-t border-aintar-sky/20`
- Layout: texto à esquerda + dois botões à direita (coluna em mobile)

**`Footer.jsx`:** adicionar link **"Gerir Cookies"** na barra inferior (junto a Política de Privacidade), que limpa o localStorage e recarrega a página para re-exibir o banner.

**`App.jsx`:** renderizar `<CookieBanner />` uma única vez no topo da árvore (fora das rotas).

### Ficheiros

| Ação | Ficheiro |
|---|---|
| Criar | `website/src/components/ui/CookieBanner.jsx` |
| Modificar | `website/src/App.jsx` (já modificado para transições — adicionar `<CookieBanner />`) |
| Modificar | `website/src/components/layout/Footer.jsx` |

---

## Resumo de Ficheiros

| Tipo | Quantidade | Ficheiros |
|---|---|---|
| Novos | 3 | `PageTransition.jsx`, `SeoHead.jsx`, `CookieBanner.jsx` |
| Modificados | ~25 | `App.jsx`, `main.jsx`, `PageLayout.jsx`, `Footer.jsx`, `HomePage.jsx`, `NoticiaPage.jsx`, + ~20 páginas interiores |
| Nova dep | 1 | `react-helmet-async` |

## Ordem de Implementação

1. Instalar `react-helmet-async`
2. Criar `PageTransition.jsx` + modificar `App.jsx` (transições)
3. Criar `SeoHead.jsx` + modificar `main.jsx` + `PageLayout.jsx` (SEO base)
4. Adicionar SEO a `HomePage` e `NoticiaPage`
5. Adicionar `seoTitle`/`seoDescription` a todas as páginas interiores
6. Criar `CookieBanner.jsx` + atualizar `App.jsx` e `Footer.jsx`
