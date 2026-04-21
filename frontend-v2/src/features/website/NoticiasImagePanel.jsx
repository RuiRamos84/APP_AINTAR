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
  const [images, setImages]         = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [uploading, setUploading]   = useState(false);
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
      qc.invalidateQueries({ queryKey: QUERY_KEY });
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
      qc.invalidateQueries({ queryKey: QUERY_KEY });
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
      qc.invalidateQueries({ queryKey: QUERY_KEY });
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
