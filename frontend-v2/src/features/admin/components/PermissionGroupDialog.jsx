/**
 * PermissionGroupDialog
 * Dialog para criar / editar um grupo de permissões.
 * Permite nomear o grupo e selecionar as permissões que lhe pertencem.
 * Usa o mesmo padrão accordion do UserPermissionsDialog.
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  InputAdornment,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  Typography,
  Chip,
  Grid,
  Stack,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  GroupWork as GroupIcon,
} from '@mui/icons-material';
import { useInterfaces } from '@/core/contexts/MetadataContext';
import {
  groupPermissionsByCategory,
  resolvePermissionDependencies,
  getPermissionDependents,
  getPermissionDependencies,
  getPermissionLabel,
} from '@/core/utils/permissionHelpers';
import { notification } from '@/core/services/notification';

// ── PermissionGroupDialog ─────────────────────────────────────────────────
const PermissionGroupDialog = ({ open, group, onClose, onSave }) => {
  const theme   = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  const { interfaces } = useInterfaces();

  // group = { name, permission_ids } | null (novo)
  const isNew = !group?.name;

  const [groupName,      setGroupName]      = useState('');
  const [selected,       setSelected]       = useState(new Set());
  const [searchTerm,     setSearchTerm]     = useState('');
  const [expandedPanels, setExpandedPanels] = useState(new Set());
  const [nameError,      setNameError]      = useState('');

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setGroupName(group?.name || '');
      setSelected(new Set(group?.permission_ids || []));
      setSearchTerm('');
      setExpandedPanels(new Set());
      setNameError('');
    }
  }, [open, group]);

  // Agrupar por categoria
  const grouped    = useMemo(() => groupPermissionsByCategory(interfaces), [interfaces]);

  // Filtrar por pesquisa
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return grouped;
    const s = searchTerm.toLowerCase();
    const out = {};
    Object.entries(grouped).forEach(([cat, perms]) => {
      const match = perms.filter(p =>
        p.label?.toLowerCase().includes(s) ||
        p.value?.toLowerCase().includes(s) ||
        String(p.pk).includes(s)
      );
      if (match.length) out[cat] = match;
    });
    return out;
  }, [grouped, searchTerm]);

  // Auto-expandir ao pesquisar
  useEffect(() => {
    if (searchTerm) setExpandedPanels(new Set(Object.keys(filteredGroups)));
  }, [filteredGroups, searchTerm]);

  // ── Toggle individual com cascata ───────────────────────────────────────
  const handleToggle = (permId) => {
    const next = new Set(selected);
    if (next.has(permId)) {
      const dependents = getPermissionDependents(permId, Array.from(next), interfaces);
      next.delete(permId);
      dependents.forEach(d => next.delete(d));
      if (dependents.length) {
        notification.warning(
          `Também removido: ${dependents.map(d => getPermissionLabel(d, interfaces)).join(', ')}`,
          { duration: 3000 }
        );
      }
    } else {
      const deps    = getPermissionDependencies(permId, interfaces);
      const missing = deps.filter(d => !next.has(d));
      next.add(permId);
      missing.forEach(d => next.add(d));
      if (missing.length) {
        notification.info(
          `Dependências adicionadas: ${missing.map(d => getPermissionLabel(d, interfaces)).join(', ')}`,
          { duration: 3000 }
        );
      }
    }
    setSelected(next);
  };

  // ── Toggle de categoria ─────────────────────────────────────────────────
  const handleToggleCategory = (perms) => {
    const next    = new Set(selected);
    const allSel  = perms.every(p => next.has(p.pk));
    if (allSel) {
      perms.forEach(p => next.delete(p.pk));
    } else {
      const ids      = perms.map(p => p.pk);
      const resolved = resolvePermissionDependencies([...Array.from(next), ...ids], interfaces);
      resolved.forEach(id => next.add(id));
    }
    setSelected(next);
  };

  // ── Accordion controls ──────────────────────────────────────────────────
  const handleTogglePanel = (cat) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };
  const expandAll   = () => setExpandedPanels(new Set(Object.keys(filteredGroups)));
  const collapseAll = () => setExpandedPanels(new Set());

  // ── Guardar ─────────────────────────────────────────────────────────────
  const handleSave = () => {
    const name = groupName.trim();
    if (!name) { setNameError('O nome do grupo é obrigatório'); return; }
    onSave(name, Array.from(selected));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { height: isMobile ? '100%' : '85vh', maxHeight: '85vh' } }}
    >
      {/* ── Título ──────────────────────────────────────────────────────── */}
      <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: alpha(theme.palette.primary.main, 0.12),
            }}
          >
            <GroupIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {isNew ? 'Novo Grupo' : `Editar: ${group.name}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {selected.size} permissão{selected.size !== 1 ? 'ões' : ''} selecionada{selected.size !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <Chip
            label={`${selected.size}/${interfaces.length}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ flexShrink: 0 }}
          />
        </Box>
      </DialogTitle>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Nome do grupo */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, flexShrink: 0 }}>
          <TextField
            label="Nome do grupo"
            value={groupName}
            onChange={e => { setGroupName(e.target.value); setNameError(''); }}
            error={!!nameError}
            helperText={nameError || 'Ex: Operador, Técnico, Gestor de Contratos…'}
            size="small"
            fullWidth
            autoFocus={isNew}
            disabled={!isNew}
            inputProps={{ maxLength: 60 }}
          />
        </Box>

        {/* Barra de pesquisa + controlos */}
        <Box
          sx={{
            px: 2, py: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            display: 'flex', gap: 1, alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Pesquisar permissões…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchTerm('')}>
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Tooltip title="Expandir todos">
            <IconButton size="small" onClick={expandAll}>
              <UnfoldMoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Recolher todos">
            <IconButton size="small" onClick={collapseAll}>
              <UnfoldLessIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Accordions por categoria */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {Object.entries(filteredGroups).map(([category, perms]) => {
            const selCount = perms.filter(p => selected.has(p.pk)).length;
            const allSel   = selCount === perms.length;
            const isExpanded = expandedPanels.has(category);

            return (
              <Accordion
                key={category}
                expanded={isExpanded}
                onChange={() => handleTogglePanel(category)}
                disableGutters
                elevation={0}
                sx={{
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  '&:before': { display: 'none' },
                  ...(selCount > 0 && {
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                  }),
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
                  sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.75 } }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    <Checkbox
                      size="small"
                      checked={allSel}
                      indeterminate={selCount > 0 && !allSel}
                      onChange={() => handleToggleCategory(perms)}
                      onClick={e => e.stopPropagation()}
                      sx={{ p: 0.25 }}
                    />
                    <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>
                      {category}
                    </Typography>
                    <Chip
                      label={`${selCount}/${perms.length}`}
                      size="small"
                      variant={allSel ? 'filled' : 'outlined'}
                      color={allSel ? 'primary' : selCount > 0 ? 'default' : 'default'}
                      sx={{ height: 20, fontSize: '0.65rem', mr: 0.5 }}
                    />
                  </Box>
                </AccordionSummary>

                <AccordionDetails
                  sx={{
                    bgcolor: alpha(theme.palette.background.default, 0.6),
                    borderTop: `1px solid ${theme.palette.divider}`,
                    px: 2, py: 1.5,
                  }}
                >
                  <Grid container spacing={0.5}>
                    {perms.map(perm => (
                      <Grid size={{ xs: 12, sm: 6 }} key={perm.pk}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={selected.has(perm.pk)}
                              onChange={() => handleToggle(perm.pk)}
                              sx={{ py: 0.5 }}
                            />
                          }
                          label={
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="body2">{perm.label || perm.value}</Typography>
                                {perm.is_critical && (
                                  <Chip label="Crítica" size="small" color="error"
                                    sx={{ height: 16, fontSize: '0.6rem' }} />
                                )}
                                {perm.is_sensitive && (
                                  <Chip label="Sensível" size="small" color="warning"
                                    sx={{ height: 16, fontSize: '0.6rem' }} />
                                )}
                              </Box>
                              {perm.description && (
                                <Typography variant="caption" color="text.secondary"
                                  sx={{ display: 'block', lineHeight: 1.3 }}>
                                  {perm.description}
                                </Typography>
                              )}
                            </Box>
                          }
                          sx={{ m: 0, width: '100%', alignItems: 'flex-start' }}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })}

          {Object.keys(filteredGroups).length === 0 && (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nenhuma permissão encontrada para "{searchTerm}"
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* ── Ações ──────────────────────────────────────────────────────── */}
      <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} size="small">Cancelar</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
        >
          {isNew ? 'Criar grupo' : 'Guardar alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PermissionGroupDialog;
