# Design: Galeria de Imagens nas Notícias

## Contexto

O sistema de notícias do website AINTAR suporta atualmente uma única imagem por notícia (`imagem_url` em `tb_site_noticia`). Pretende-se expandir para suporte a múltiplas imagens com galeria pública (carousel + lightbox) e painel de gestão integrado no CMS.

## Decisões

- Sem limite de imagens por notícia
- A **1ª imagem da galeria** (menor `ordem`) é sempre a imagem principal — usada nos cards de listagem e no hero da notícia
- `tb_site_noticia.imagem_url` mantém-se como campo **cacheado** (sincronizado pelo backend após cada mutação da galeria), garantindo retrocompatibilidade com todas as views/queries existentes
- Imagens têm **legenda opcional** (VARCHAR 300)
- Galeria pública: **carousel com lightbox** ao clicar
- CMS: **painel integrado** no formulário de notícia com upload múltiplo e reordenação drag-and-drop (usando `react-dnd` já instalado)
- Upload lazy: novas imagens fazem POST imediatamente (não aguarda "Guardar notícia")

## Base de Dados

### Tabela nova (já criada)
```sql
CREATE TABLE tb_site_noticia_imagem (
    pk           INTEGER PRIMARY KEY DEFAULT fs_nextcode(),
    noticia_fk   INTEGER NOT NULL REFERENCES tb_site_noticia(pk) ON DELETE CASCADE,
    imagem_url   VARCHAR(500) NOT NULL,
    ordem        SMALLINT NOT NULL DEFAULT 0,
    legenda      VARCHAR(300),
    data_criacao TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ON tb_site_noticia_imagem(noticia_fk, ordem);
```

### Campo existente
`tb_site_noticia.imagem_url` — mantém-se, sincronizado automaticamente pelo backend com a URL da imagem de menor `ordem`. Fica NULL quando a galeria está vazia.

## Âmbito

### 1. Backend — Novos endpoints CMS

Ficheiro: `backend/app/routes/website_routes.py`  
Blueprint: `website_cms_bp`  
Todos com: `@jwt_required()`, `@token_required`, `@require_permission('website.edit')`, `@set_session`, `@api_error_handler`

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/noticias/<pk>/imagens` | Listar imagens de uma notícia (array ordenado) |
| `POST` | `/noticias/<pk>/imagens` | Upload de 1+ imagens (multipart/form-data, campo `files[]`) |
| `PATCH` | `/noticias/<pk>/imagens/ordem` | Reordenar — body: `[{pk, ordem}, ...]` |
| `PATCH` | `/noticias/<pk>/imagens/<img_pk>` | Atualizar legenda — body: `{legenda}` |
| `DELETE` | `/noticias/<pk>/imagens/<img_pk>` | Eliminar imagem e ficheiro físico |

### 2. Backend — Serviços

Ficheiro: `backend/app/services/website_service.py` (adicionar ao existente)

- `cms_get_noticia_imagens(noticia_pk)` — SELECT * FROM `tb_site_noticia_imagem` WHERE `noticia_fk=pk` ORDER BY `ordem`
- `cms_upload_noticia_imagens(noticia_pk, files, current_user)` — guarda ficheiros em `FILES_DIR/website/noticias/{ano}/`, insere em `tb_site_noticia_imagem` com `ordem = MAX(ordem)+1`, sincroniza `imagem_url`
- `cms_reorder_noticia_imagens(noticia_pk, ordem_list)` — UPDATE em massa com `[{pk, ordem}]`, sincroniza `imagem_url`
- `cms_update_noticia_imagem_legenda(noticia_pk, img_pk, legenda)` — UPDATE `legenda` simples
- `cms_delete_noticia_imagem(noticia_pk, img_pk)` — elimina ficheiro físico + registo DB, sincroniza `imagem_url`
- `_sync_noticia_imagem_url(noticia_pk)` — helper privado: SELECT `imagem_url` WHERE `ordem = MIN(ordem)` → UPDATE `tb_site_noticia.imagem_url`

### 3. Backend — Endpoint público atualizado

`GET /api/v1/website/noticias/<pk>` passa a incluir:
```json
{
  "imagens": [
    {"pk": 1, "url": "2026/foto1.jpg", "ordem": 0, "legenda": "Vista geral"},
    {"pk": 2, "url": "2026/foto2.jpg", "ordem": 1, "legenda": null}
  ]
}
```

### 4. Frontend CMS — Painel de imagens

**Componente novo:** `frontend-v2/src/features/website/NoticiasImagePanel.jsx`

**Integrado em:** `frontend-v2/src/features/website/pages/WebsiteNoticiasPage.jsx` — adicionado como secção dentro do Dialog de edição de notícia (já existente), visível apenas quando `form.pk` está definido (notícia já guardada)

Funcionalidades:
- Zona de drop (`<input type="file" multiple accept="image/*">`) com visual drag-and-drop
- Barra de progresso por ficheiro durante upload
- Grelha de miniaturas (MUI `Grid`): miniatura, campo legenda editável inline (`TextField`), botão eliminar com confirmação (`Dialog` MUI), handle drag para reordenar
- Badge "Principal" (`Chip`) na miniatura de `ordem = 0`
- Reordenação via `react-dnd` (já instalado em `frontend-v2`) — faz `PATCH /imagens/ordem` com debounce 500ms
- Estado local gerido com `useState` + `useCallback`; dados carregados com `useQuery(['cms','noticias', pk, 'imagens'])`

**Serviço CMS:** `frontend-v2/src/features/website/api/websiteCmsService.js` — adicionar:
```js
export const getNoticiasImagens = (pk) => api.get(`${BASE}/noticias/${pk}/imagens`);
export const uploadNoticiasImagens = (pk, files) => { /* FormData com files[] */ };
export const reorderNoticiasImagens = (pk, ordemList) => api.patch(`${BASE}/noticias/${pk}/imagens/ordem`, ordemList);
export const updateNoticiasImagemLegenda = (pk, imgPk, legenda) => api.patch(`${BASE}/noticias/${pk}/imagens/${imgPk}`, { legenda });
export const deleteNoticiasImagem = (pk, imgPk) => api.delete(`${BASE}/noticias/${pk}/imagens/${imgPk}`);
```

### 5. Frontend Website — Galeria pública

**Componente novo:** `website/src/components/ui/ImageGallery.jsx`

Props: `images: [{pk, url, ordem, legenda}]`

Comportamento:
- Se `images.length <= 1`: não renderiza nada (o hero já mostra a imagem)
- Se `images.length >= 2`: renderiza secção "Galeria" abaixo do conteúdo do artigo
- Carousel com setas ◀ ▶ e dots indicadores de posição (state local `useState`)
- Clique na imagem abre lightbox a ecrã inteiro
- Lightbox: navegação por teclado (← → Esc via `useEffect` + keydown listener), fundo escuro semitransparente, legenda por baixo da imagem se existir
- Sem biblioteca externa — apenas React + Tailwind CSS (consistente com o resto do `website/`)

**Ficheiro modificado:** `website/src/pages/comunicacao/NoticiaPage.jsx`
- Importar `ImageGallery`
- Passar `noticia.imagens ?? []` ao componente após o bloco de conteúdo HTML
- Usar `fileUrl()` existente para converter URLs das imagens da galeria

## Ficheiros a criar
- `frontend-v2/src/features/website/NoticiasImagePanel.jsx`
- `website/src/components/ui/ImageGallery.jsx`

## Ficheiros a modificar
- `backend/app/routes/website_routes.py` — 5 novos endpoints CMS + atualizar endpoint público
- `backend/app/services/website_service.py` — 5 funções novas + helper `_sync_noticia_imagem_url`
- `frontend-v2/src/features/website/api/websiteCmsService.js` — 5 funções novas
- `frontend-v2/src/features/website/pages/WebsiteNoticiasPage.jsx` — integrar `NoticiasImagePanel` no Dialog de edição
- `website/src/pages/comunicacao/NoticiaPage.jsx` — integrar `ImageGallery`
