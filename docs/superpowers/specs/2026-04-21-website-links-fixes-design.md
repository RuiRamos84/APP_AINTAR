# Design: Correção de Botões/Links/Acessos do Website

## Contexto
Auditoria completa ao website AINTAR revelou links mortos, números placeholder, navegação em falta e ausência de backend para o formulário de contacto.

## Âmbito

### 1. Páginas Legais
- Criar `website/src/pages/PoliticaPrivacidadePage.jsx`
- Criar `website/src/pages/TermosUtilizacaoPage.jsx`
- Rotas: `/politica-privacidade` e `/termos-utilizacao`
- Estrutura: PageLayout + PageHeader + conteúdo RGPD em blocos
- Atualizar `website/src/App.jsx` com as duas rotas
- Atualizar `website/src/components/layout/Footer.jsx` (linhas 227-228) com `<Link>`
- Atualizar `website/src/components/ui/ContactForm.jsx` (linha 143) com `<Link>`

### 2. Números Reais
- `website/src/components/layout/Footer.jsx` linha 179: WhatsApp → `wa.me/351927242740`
- `website/src/pages/clientes/ClientesPage.jsx` linha 115: emergências → `tel:+351963612484`, label "Piquete 24 Horas"

### 3. Navbar — Clientes Dropdown
- `website/src/components/layout/Navbar.jsx` array `navMenu`: adicionar `{ label: 'Área de Clientes', href: '/clientes' }` como primeiro item do dropdown "Clientes"

### 4. Footer — Âncoras Saneamento
- `website/src/pages/saneamento/SaneamentoPage.jsx`: adicionar `id="alta"`, `id="baixa"`, `id="efluentes"` às secções correspondentes
- `website/src/components/layout/Footer.jsx` footerLinks.servicos: atualizar hrefs para `/saneamento#alta`, `/saneamento#baixa`, `/saneamento#efluentes`

### 5. Backend — Endpoint `/api/contact`
- Criar `backend/app/routes/contact_routes.py`
- Rota pública `POST /api/contact` (sem JWT)
- Payload: `nome`, `email`, `telefone` (opcional), `assunto`, `mensagem`
- Validação Pydantic
- Envia email para `geral@aintar.pt` via Flask-Mail
- Registar blueprint em `backend/app/__init__.py`

## Decisões
- Sem BD para contactos — apenas email
- Conteúdo das páginas legais baseado em RGPD para entidade pública portuguesa
- React Router `<Link to="/path#anchor">` suporta navegação com hash nativamente
- Endpoint sem autenticação (formulário público do website)

## Ficheiros a criar
- `website/src/pages/PoliticaPrivacidadePage.jsx`
- `website/src/pages/TermosUtilizacaoPage.jsx`
- `backend/app/routes/contact_routes.py`

## Ficheiros a modificar
- `website/src/App.jsx`
- `website/src/components/layout/Footer.jsx`
- `website/src/components/layout/Navbar.jsx`
- `website/src/components/ui/ContactForm.jsx`
- `website/src/pages/clientes/ClientesPage.jsx`
- `website/src/pages/saneamento/SaneamentoPage.jsx`
- `backend/app/__init__.py`
