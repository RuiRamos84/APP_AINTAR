# News Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar suporte a múltiplas imagens por notícia, com painel de gestão no CMS (drag-and-drop, upload múltiplo, legendas) e galeria pública em carousel com lightbox.

**Architecture:** Nova tabela `tb_site_noticia_imagem` (já criada em BD) com FK para a notícia. O campo `imagem_url` em `tb_site_noticia` mantém-se como cache da 1ª imagem (menor `ordem`), sincronizado pelo backend após cada mutação. O website público mostra carousel + lightbox abaixo do artigo quando há 2+ imagens.

**Tech Stack:** Flask/SQLAlchemy (backend), React + MUI v7 + react-dnd + TanStack Query (frontend-v2/CMS), React + Tailwind CSS (website público).

---

## Nota: DB já criada

A tabela `tb_site_noticia_imagem` já foi criada manualmente. Verificar estrutura antes de avançar:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'tb_site_noticia_imagem' ORDER BY ordinal_position;
```

Deve ter: `pk`, `noticia_fk`, `imagem_url`, `ordem`, `legenda`, `data_criacao`.

---

### Task 1: Backend — Funções de serviço para galeria

**Files:**
- Modify: `backend/app/services/website_service.py`

- [ ] **Step 1: Adicionar helper `_sync_noticia_imagem_url` e funções de galeria**

Adicionar após a função `cms_upload_noticia_imagem` existente (linha ~449), antes da secção `# ─── CMS — Alertas`:

```python
def _sync_noticia_imagem_url(session, noticia_pk: int):
    """Sincroniza imagem_url da notícia com a 1ª imagem da galeria (menor ordem)."""
    row = session.execute(text("""
        SELECT imagem_url FROM tb_site_noticia_imagem
        WHERE noticia_fk = :pk
        ORDER BY ordem ASC
        LIMIT 1
    """), {'pk': noticia_pk}).fetchone()
    new_url = row[0] if row else None
    session.execute(
        text("UPDATE tb_site_noticia SET imagem_url = :url WHERE pk = :pk"),
        {'url': new_url, 'pk': noticia_pk}
    )


@api_error_handler
def cms_get_noticia_imagens(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        rows = session.execute(text("""
            SELECT pk, imagem_url, ordem, legenda
            FROM tb_site_noticia_imagem
            WHERE noticia_fk = :pk
            ORDER BY ordem ASC
        """), {'pk': pk}).mappings().all()
        result = []
        for r in rows:
            item = dict(r)
            item['url'] = _file_url('noticias', item['imagem_url'])
            result.append(item)
        return {'imagens': result}, 200


@api_error_handler
def cms_upload_noticia_imagens(pk: int, files: list, current_user: str):
    with db_session_manager(current_user) as session:
        noticia = session.execute(
            text("SELECT pk FROM tb_site_noticia WHERE pk = :pk"), {'pk': pk}
        ).fetchone()
        if not noticia:
            raise ResourceNotFoundError('Notícia', pk)

        max_ordem = session.execute(text("""
            SELECT COALESCE(MAX(ordem), -1) FROM tb_site_noticia_imagem WHERE noticia_fk = :pk
        """), {'pk': pk}).scalar()

        uploaded = []
        for i, file in enumerate(files):
            img_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
            filename = _save_website_file(file, 'noticias', img_pk)
            ordem = max_ordem + 1 + i
            session.execute(text("""
                INSERT INTO tb_site_noticia_imagem (pk, noticia_fk, imagem_url, ordem)
                VALUES (:pk, :noticia_fk, :imagem_url, :ordem)
            """), {'pk': img_pk, 'noticia_fk': pk, 'imagem_url': filename, 'ordem': ordem})
            uploaded.append({'pk': img_pk, 'url': _file_url('noticias', filename), 'ordem': ordem, 'legenda': None})

        _sync_noticia_imagem_url(session, pk)
        logger.info(f"{len(files)} imagem(ns) adicionada(s) à notícia {pk} por {current_user}")
        return {'imagens': uploaded}, 200


@api_error_handler
def cms_reorder_noticia_imagens(pk: int, ordem_list: list, current_user: str):
    with db_session_manager(current_user) as session:
        for item in ordem_list:
            session.execute(text("""
                UPDATE tb_site_noticia_imagem
                SET ordem = :ordem
                WHERE pk = :img_pk AND noticia_fk = :noticia_pk
            """), {'ordem': item['ordem'], 'img_pk': item['pk'], 'noticia_pk': pk})
        _sync_noticia_imagem_url(session, pk)
        return {'message': 'Ordem atualizada'}, 200


@api_error_handler
def cms_update_noticia_imagem_legenda(noticia_pk: int, img_pk: int, legenda: str, current_user: str):
    with db_session_manager(current_user) as session:
        session.execute(text("""
            UPDATE tb_site_noticia_imagem
            SET legenda = :legenda
            WHERE pk = :img_pk AND noticia_fk = :noticia_pk
        """), {'legenda': legenda or None, 'img_pk': img_pk, 'noticia_pk': noticia_pk})
        return {'message': 'Legenda atualizada'}, 200


@api_error_handler
def cms_delete_noticia_imagem(noticia_pk: int, img_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        row = session.execute(text("""
            SELECT imagem_url FROM tb_site_noticia_imagem
            WHERE pk = :img_pk AND noticia_fk = :noticia_pk
        """), {'img_pk': img_pk, 'noticia_pk': noticia_pk}).fetchone()
        if not row:
            raise ResourceNotFoundError('Imagem', img_pk)

        _delete_website_file('noticias', row[0])
        session.execute(text("""
            DELETE FROM tb_site_noticia_imagem WHERE pk = :img_pk AND noticia_fk = :noticia_pk
        """), {'img_pk': img_pk, 'noticia_pk': noticia_pk})
        _sync_noticia_imagem_url(session, noticia_pk)
        logger.info(f"Imagem {img_pk} removida da notícia {noticia_pk} por {current_user}")
        return {'message': 'Imagem eliminada'}, 200
```

- [ ] **Step 2: Atualizar `get_noticia_public` para incluir array `imagens`**

Substituir a função `get_noticia_public` existente (linhas 128-143):

```python
@api_error_handler
def get_noticia_public(pk: int):
    from app import db
    row = db.session.execute(text("""
        SELECT pk, titulo, resumo, conteudo_html, ts_categoria, categoria,
               imagem_url, destaque, data_publicacao, data_criacao
        FROM vbl_site_noticia
        WHERE pk = :pk AND ts_estado = 2
    """), {'pk': pk}).mappings().fetchone()

    if not row:
        raise ResourceNotFoundError('Notícia', pk)

    item = _serialize(row)
    item['imagem_url'] = _file_url('noticias', item.get('imagem_url'))

    imgs = db.session.execute(text("""
        SELECT pk, imagem_url, ordem, legenda
        FROM tb_site_noticia_imagem
        WHERE noticia_fk = :pk
        ORDER BY ordem ASC
    """), {'pk': pk}).mappings().all()

    item['imagens'] = [
        {
            'pk': i['pk'],
            'url': _file_url('noticias', i['imagem_url']),
            'ordem': i['ordem'],
            'legenda': i['legenda'],
        }
        for i in imgs
    ]

    return {'noticia': item}, 200
```

- [ ] **Step 3: Verificar manualmente que o ficheiro não tem erros de sintaxe**

```bash
cd backend && python -c "from app.services.website_service import cms_get_noticia_imagens; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/website_service.py
git commit -m "feat: adicionar serviços de galeria de imagens para notícias"
```

---

### Task 2: Backend — Rotas para galeria

**Files:**
- Modify: `backend/app/routes/website_routes.py`

- [ ] **Step 1: Atualizar imports no topo do ficheiro**

Na linha 19, substituir a linha de imports das funções CMS de notícias:

```python
    cms_list_noticias, cms_get_noticia, cms_save_noticia, cms_delete_noticia, cms_upload_noticia_imagem,
    cms_get_noticia_imagens, cms_upload_noticia_imagens, cms_reorder_noticia_imagens,
    cms_update_noticia_imagem_legenda, cms_delete_noticia_imagem,
```

(Substitui a linha 19 que tinha apenas `cms_upload_noticia_imagem`.)

- [ ] **Step 2: Adicionar 5 rotas de galeria após o endpoint `/noticias/<pk>/imagem` existente (linha ~199)**

Após o bloco da rota `cms_noticia_upload` (que termina na linha ~199), adicionar:

```python
@website_cms_bp.route('/noticias/<int:pk>/imagens', methods=['GET'])
@jwt_required()
@token_required
@require_permission('website.view')
@set_session
@api_error_handler
def cms_noticia_imagens_list(pk):
    current_user = get_jwt_identity()
    return cms_get_noticia_imagens(pk, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens', methods=['POST'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagens_upload(pk):
    current_user = get_jwt_identity()
    files = request.files.getlist('files[]')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'erro': 'Nenhum ficheiro fornecido'}), 400
    return cms_upload_noticia_imagens(pk, files, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens/ordem', methods=['PATCH'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagens_reorder(pk):
    current_user = get_jwt_identity()
    data = request.get_json() or []
    return cms_reorder_noticia_imagens(pk, data, current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens/<int:img_pk>', methods=['PATCH'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagem_legenda(pk, img_pk):
    current_user = get_jwt_identity()
    data = request.get_json() or {}
    return cms_update_noticia_imagem_legenda(pk, img_pk, data.get('legenda'), current_user)


@website_cms_bp.route('/noticias/<int:pk>/imagens/<int:img_pk>', methods=['DELETE'])
@jwt_required()
@token_required
@require_permission('website.edit')
@set_session
@api_error_handler
def cms_noticia_imagem_delete(pk, img_pk):
    current_user = get_jwt_identity()
    return cms_delete_noticia_imagem(pk, img_pk, current_user)
```

- [ ] **Step 3: Verificar imports e sintaxe**

```bash
cd backend && python -c "from app.routes.website_routes import website_cms_bp; print('OK')"
```

Esperado: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/website_routes.py
git commit -m "feat: adicionar rotas de galeria de imagens para notícias"
```

---

### Task 3: CMS Service — Funções de API (frontend-v2)

**Files:**
- Modify: `frontend-v2/src/features/website/api/websiteCmsService.js`

- [ ] **Step 1: Substituir `uploadNoticiaImagem` e adicionar funções de galeria**

Substituir a função `uploadNoticiaImagem` existente (linhas 17-21) e adicionar as restantes:

```js
export const uploadNoticiaImagem = (pk, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`${BASE}/noticias/${pk}/imagem`, fd, { headers: { 'Content-Type': undefined } });
};

// ─── Galeria de imagens ───────────────────────────────────────────────────────

export const getNoticiasImagens = (pk) =>
  api.get(`${BASE}/noticias/${pk}/imagens`);

export const uploadNoticiasImagens = (pk, files) => {
  const fd = new FormData();
  files.forEach(f => fd.append('files[]', f));
  return api.post(`${BASE}/noticias/${pk}/imagens`, fd, { headers: { 'Content-Type': undefined } });
};

export const reorderNoticiasImagens = (pk, ordemList) =>
  api.patch(`${BASE}/noticias/${pk}/imagens/ordem`, ordemList);

export const updateNoticiasImagemLegenda = (pk, imgPk, legenda) =>
  api.patch(`${BASE}/noticias/${pk}/imagens/${imgPk}`, { legenda });

export const deleteNoticiasImagem = (pk, imgPk) =>
  api.delete(`${BASE}/noticias/${pk}/imagens/${imgPk}`);
```

(Manter todas as outras funções do ficheiro intactas.)

- [ ] **Step 2: Commit**

```bash
git add frontend-v2/src/features/website/api/websiteCmsService.js
git commit -m "feat: adicionar funções de API para galeria de imagens de notícias"
```

---

### Task 4: CMS — Componente NoticiasImagePanel

**Files:**
- Create: `frontend-v2/src/features/website/NoticiasImagePanel.jsx`

- [ ] **Step 1: Criar o componente**

```jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  AddPhotoAlternate as AddPhotoIcon,
  Delete as DeleteIcon,
  DragHandle as DragIcon,
} from '@mui/icons-material';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import {
  deleteNoticiasImagem,
  getNoticiasImagens,
  reorderNoticiasImagens,
  updateNoticiasImagemLegenda,
  uploadNoticiasImagens,
} from './api/websiteCmsService';

const ITEM_TYPE = 'NOTICIA_IMG';

// ─── Card de imagem individual ────────────────────────────────────────────────

function ImageCard({ img, index, isPrimary, moveImage, onDelete, onLegendaBlur }) {
  const [legenda, setLegenda] = useState(img.legenda ?? '');
  const ref = useRef(null);

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover({ index: from }) {
      if (from !== index) moveImage(from, index);
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (m) => ({ isDragging: m.isDragging() }),
  });

  preview(drop(ref));

  return (
    <Box
      ref={ref}
      sx={{
        display: 'flex', gap: 1.5, alignItems: 'flex-start',
        p: 1.5, borderRadius: 2, border: '1px solid',
        borderColor: isPrimary ? 'primary.main' : 'divider',
        bgcolor: isPrimary ? 'primary.50' : 'background.paper',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <Box ref={drag} sx={{ cursor: 'grab', color: 'text.disabled', pt: 0.5 }}>
        <DragIcon fontSize="small" />
      </Box>

      <Box
        component="img"
        src={img.url}
        alt={legenda || `Imagem ${index + 1}`}
        sx={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isPrimary && (
          <Chip label="Principal" size="small" color="primary" sx={{ mb: 0.5, fontSize: 10 }} />
        )}
        <TextField
          size="small" fullWidth variant="standard"
          placeholder="Legenda (opcional)"
          value={legenda}
          onChange={(e) => setLegenda(e.target.value)}
          onBlur={() => onLegendaBlur(img.pk, legenda)}
          inputProps={{ maxLength: 300 }}
        />
      </Box>

      <Tooltip title="Eliminar imagem">
        <IconButton size="small" color="error" onClick={() => onDelete(img.pk)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ─── Painel principal ─────────────────────────────────────────────────────────

export default function NoticiasImagePanel({ noticiaId }) {
  const qc = useQueryClient();
  const [images, setImages]       = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading] = useState(false);
  const debounceRef = useRef(null);
  const QUERY_KEY   = ['cms', 'noticias', noticiaId, 'imagens'];

  const { data: queryImages } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getNoticiasImagens(noticiaId),
    enabled: !!noticiaId,
    select: (r) => r?.imagens ?? [],
  });

  useEffect(() => {
    if (queryImages) setImages(queryImages);
  }, [queryImages]);

  const reorderMut = useMutation({
    mutationFn: (list) => reorderNoticiasImagens(noticiaId, list),
    onError: () => {
      qc.invalidateQueries(QUERY_KEY);
      notification.error('Erro ao reordenar imagens');
    },
  });

  const legendaMut = useMutation({
    mutationFn: ({ imgPk, legenda }) => updateNoticiasImagemLegenda(noticiaId, imgPk, legenda),
    onError: () => notification.error('Erro ao guardar legenda'),
  });

  const deleteMut = useMutation({
    mutationFn: (imgPk) => deleteNoticiasImagem(noticiaId, imgPk),
    onSuccess: () => {
      qc.invalidateQueries(QUERY_KEY);
      notification.success('Imagem eliminada');
      setDeleteTarget(null);
    },
    onError: () => notification.error('Erro ao eliminar imagem'),
  });

  const moveImage = useCallback((from, to) => {
    setImages(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      const reordered = arr.map((img, idx) => ({ ...img, ordem: idx }));

      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        reorderMut.mutate(reordered.map(img => ({ pk: img.pk, ordem: img.ordem })));
      }, 500);

      return reordered;
    });
  }, [reorderMut]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      await uploadNoticiasImagens(noticiaId, files);
      qc.invalidateQueries(QUERY_KEY);
      notification.success(`${files.length} imagem(ns) adicionada(s)`);
    } catch {
      notification.error('Erro ao fazer upload das imagens');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (!noticiaId) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Guarda a notícia primeiro para adicionar imagens.
      </Typography>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="subtitle2" color="text.secondary">
            {images.length === 0
              ? 'Sem imagens'
              : `${images.length} imagem(ns) · arrasta para reordenar`}
          </Typography>
          <Button
            component="label" variant="outlined" size="small"
            startIcon={uploading ? <CircularProgress size={14} /> : <AddPhotoIcon />}
            disabled={uploading}
          >
            Adicionar fotos
            <input type="file" hidden multiple accept="image/*" onChange={handleUpload} />
          </Button>
        </Stack>

        <Stack spacing={1}>
          {images.map((img, idx) => (
            <ImageCard
              key={img.pk}
              img={img}
              index={idx}
              isPrimary={idx === 0}
              moveImage={moveImage}
              onDelete={(imgPk) => setDeleteTarget(imgPk)}
              onLegendaBlur={(imgPk, legenda) => legendaMut.mutate({ imgPk, legenda })}
            />
          ))}
        </Stack>

        <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
          <DialogTitle>Eliminar imagem?</DialogTitle>
          <DialogContent>
            <Typography>A imagem será eliminada permanentemente.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button color="error" variant="contained"
              onClick={() => deleteMut.mutate(deleteTarget)}
              disabled={deleteMut.isPending}
            >
              Eliminar
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DndProvider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend-v2/src/features/website/NoticiasImagePanel.jsx
git commit -m "feat: criar componente NoticiasImagePanel para gestão de galeria"
```

---

### Task 5: CMS — Integrar NoticiasImagePanel na página de notícias

**Files:**
- Modify: `frontend-v2/src/features/website/pages/WebsiteNoticiasPage.jsx`

- [ ] **Step 1: Atualizar imports**

Substituir a linha de imports do topo:

```jsx
import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  MenuItem, Select, Switch, TextField, Tooltip, Typography, Stack,
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon,
  Newspaper as NewsIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import notification from '@/core/services/notification';
import {
  getNoticias, saveNoticia, deleteNoticia, getMetadados,
} from '../api/websiteCmsService';
import NoticiasImagePanel from '../NoticiasImagePanel';
```

(Removido: `ImageIcon`, `uploadNoticiaImagem`. Adicionado: `Divider`, `NoticiasImagePanel`.)

- [ ] **Step 2: Remover `imgFile` do estado e simplificar `saveMut`**

Substituir o bloco de estado e mutations (linhas 36-66):

```jsx
  const [open, setOpen]         = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savedPk, setSavedPk]   = useState(null);
```

Substituir `saveMut`:

```jsx
  const saveMut = useMutation({
    mutationFn: saveNoticia,
    onSuccess: (res) => {
      qc.invalidateQueries(['cms', 'noticias']);
      if (!form.pk && res?.pk) {
        setForm(f => ({ ...f, pk: res.pk }));
        setSavedPk(res.pk);
      }
      notification.success(form.pk ? 'Notícia atualizada' : 'Notícia criada');
    },
    onError: (e) => notification.error(e.message),
  });
```

- [ ] **Step 3: Atualizar `openNew` e `openEdit`**

```jsx
  const openNew  = () => { setForm(EMPTY); setSavedPk(null); setOpen(true); };
  const openEdit = (row) => {
    setForm({ ...row, data_publicacao: row.data_publicacao ? new Date(row.data_publicacao) : null });
    setSavedPk(row.pk);
    setOpen(true);
  };
```

- [ ] **Step 4: Substituir o bloco de imagem dentro do `<DialogContent>` pelo painel**

Substituir o `<Grid size={12}>` com o `<Stack direction="row"...>` da imagem (linhas 194-206 originais):

```jsx
            {(form.pk || savedPk) && (
              <>
                <Grid size={12}><Divider><Typography variant="caption" color="text.secondary">Imagens</Typography></Divider></Grid>
                <Grid size={12}>
                  <NoticiasImagePanel noticiaId={form.pk ?? savedPk} />
                </Grid>
              </>
            )}
            {!form.pk && !savedPk && (
              <Grid size={12}>
                <Typography variant="caption" color="text.secondary">
                  Guarda a notícia para adicionar imagens.
                </Typography>
              </Grid>
            )}
```

- [ ] **Step 5: Commit**

```bash
git add frontend-v2/src/features/website/pages/WebsiteNoticiasPage.jsx
git commit -m "feat: integrar NoticiasImagePanel na página de gestão de notícias"
```

---

### Task 6: Website público — Componente ImageGallery

**Files:**
- Create: `website/src/components/ui/ImageGallery.jsx`

- [ ] **Step 1: Criar o componente**

```jsx
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

export default function ImageGallery({ images = [] }) {
  const [current, setCurrent]     = useState(0)
  const [lightbox, setLightbox]   = useState(false)

  const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length])
  const open  = (idx) => { setCurrent(idx); setLightbox(true) }
  const close = () => setLightbox(false)

  useEffect(() => {
    if (!lightbox) return
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox, prev, next])

  if (images.length < 2) return null

  const img = images[current]

  return (
    <div className="mt-10">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Galeria
      </h3>

      {/* Carousel */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[16/9] group">
        <img
          src={img.url}
          alt={img.legenda || `Foto ${current + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />

        {/* Overlay click → lightbox */}
        <button
          onClick={() => open(current)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200"
          aria-label="Abrir em ecrã inteiro"
        >
          <ZoomIn size={32} className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow-lg" />
        </button>

        {/* Setas */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors duration-200"
              aria-label="Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors duration-200"
              aria-label="Próxima"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Legenda */}
        {img.legenda && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
            <p className="text-white text-sm">{img.legenda}</p>
          </div>
        )}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-200 ${
              i === current
                ? 'w-5 h-2 bg-aintar-sky'
                : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Foto ${i + 1}`}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative max-w-5xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={img.url}
              alt={img.legenda || `Foto ${current + 1}`}
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />

            {img.legenda && (
              <p className="text-white/80 text-sm text-center mt-3">{img.legenda}</p>
            )}

            {/* Contador */}
            <div className="absolute top-3 left-3 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
              {current + 1} / {images.length}
            </div>

            {/* Fechar */}
            <button
              onClick={close}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-1.5 transition-colors duration-200"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>

            {/* Setas lightbox */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors duration-200"
                  aria-label="Anterior"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors duration-200"
                  aria-label="Próxima"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/ui/ImageGallery.jsx
git commit -m "feat: criar componente ImageGallery para galeria pública de notícias"
```

---

### Task 7: Website público — Integrar galeria em NoticiaPage

**Files:**
- Modify: `website/src/pages/comunicacao/NoticiaPage.jsx`

- [ ] **Step 1: Adicionar import do componente**

Na linha 5, após os imports existentes, adicionar:

```jsx
import ImageGallery from '../../components/ui/ImageGallery'
```

- [ ] **Step 2: Adicionar `<ImageGallery>` após o conteúdo HTML**

Dentro do bloco `{!loading && !error && noticia && (`, após o bloco do conteúdo HTML (após a `</div>` do `dangerouslySetInnerHTML`, linha ~97), adicionar:

```jsx
              {/* Galeria */}
              <ImageGallery images={noticia.imagens ?? []} />
```

O bloco `<article>` completo fica:

```jsx
          {!loading && !error && noticia && (
            <article>
              {/* Meta */}
              <div className="flex items-center gap-3 mb-6 text-sm text-gray-400">
                <span className="px-2.5 py-1 rounded-full bg-aintar-blue/10 text-aintar-blue font-semibold text-xs">
                  {noticia.categoria ?? 'Notícia'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {formatDate(noticia.data_publicacao ?? noticia.data_criacao)}
                </span>
              </div>

              {/* Imagem principal */}
              {noticia.imagem_url && (
                <div className="rounded-2xl overflow-hidden mb-8 aspect-[16/7] bg-gradient-to-br from-aintar-navy to-aintar-blue">
                  <img
                    src={fileUrl(noticia.imagem_url)}
                    alt={noticia.titulo}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
              )}

              {/* Resumo */}
              {noticia.resumo && (
                <p className="text-gray-600 text-lg leading-relaxed mb-6 font-medium">
                  {noticia.resumo}
                </p>
              )}

              {/* Conteúdo HTML */}
              {noticia.conteudo_html && (
                <div
                  className="prose prose-aintar max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: noticia.conteudo_html }}
                />
              )}

              {/* Galeria */}
              <ImageGallery images={noticia.imagens ?? []} />
            </article>
          )}
```

- [ ] **Step 3: Commit**

```bash
git add website/src/pages/comunicacao/NoticiaPage.jsx
git commit -m "feat: integrar galeria de imagens na página pública de notícia"
```

---

## Verificação Final

Após todos os tasks, testar manualmente:

1. **Backend** — `cd backend && python run.py` (sem erros de import)
2. **CMS** — Abrir uma notícia existente no frontend-v2, verificar painel "Imagens" aparece, fazer upload de 2+ fotos, reordenar com drag, editar legenda, eliminar
3. **Website público** — Abrir a notícia no website (`cd website && npm run dev`), confirmar carousel aparece abaixo do artigo, clicar para abrir lightbox, navegar com setas e teclado
4. **Retrocompatibilidade** — Notícias sem galeria continuam a funcionar normalmente (sem carousel, hero image mantém-se)
