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
  Alert,
  Stack,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
  alpha,
  useMediaQuery,
  useTheme,
  Collapse,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useInterfaces } from '@/core/contexts/MetadataContext';
import {
  getPermissionDependencies,
  getPermissionDependents,
  resolvePermissionDependencies,
  getPermissionChanges,
  groupPermissionsByCategory,
  getPermissionLabel,
} from '@/core/utils/permissionHelpers';
import { notification } from '@/core/services/notification';

const PROFILE_COLORS = {
  '0': '#d32f2f', '1': '#1565c0', '2': '#2e7d32',
  '3': '#e65100', '4': '#6a1b9a', '5': '#d32f2f',
};
const getAvatarColor = (profil) => PROFILE_COLORS[profil] || '#546e7a';
const getInitials = (name, username) => {
  const src = name || username || '?';
  return src.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
};

const UserPermissionsDialog = ({ open, user, onClose, onSave }) => {
  const { interfaces } = useInterfaces();
  const theme = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('sm'),  { noSsr: true });
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'),    { noSsr: true });

  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPanels, setExpandedPanels] = useState(new Set());
  const [summaryOpen, setSummaryOpen] = useState(false); // mobile: painel resumo

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setSelectedPermissions(user?.interfaces || []);
      setSearchTerm('');
      setExpandedPanels(new Set());
      setSummaryOpen(false);
    }
  }, [open, user]);

  // Agrupar por categoria (fonte: BD)
  const groupedPermissions = useMemo(() => groupPermissionsByCategory(interfaces), [interfaces]);

  // Grupos definidos (fonte: campo groups[] de cada permissão na BD)
  const permissionGroups = useMemo(() => {
    const map = {};
    interfaces.forEach(perm => {
      (perm.groups || []).forEach(groupName => {
        if (!map[groupName]) map[groupName] = [];
        map[groupName].push(perm.pk);
      });
    });
    return Object.entries(map)
      .map(([name, ids]) => ({ name, permission_ids: ids }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }));
  }, [interfaces]);

  // Filtrar pela pesquisa
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedPermissions;
    const s = searchTerm.toLowerCase();
    const filtered = {};
    Object.entries(groupedPermissions).forEach(([cat, perms]) => {
      const match = perms.filter(p =>
        p.label?.toLowerCase().includes(s) ||
        p.value?.toLowerCase().includes(s) ||
        String(p.pk).includes(s)
      );
      if (match.length) filtered[cat] = match;
    });
    return filtered;
  }, [groupedPermissions, searchTerm]);

  // Auto-expandir ao pesquisar
  useEffect(() => {
    if (searchTerm) setExpandedPanels(new Set(Object.keys(filteredGroups)));
  }, [filteredGroups, searchTerm]);

  // Alterações face ao original
  const changes = useMemo(() =>
    getPermissionChanges(user?.interfaces || [], selectedPermissions),
    [user, selectedPermissions]
  );
  const addedSet   = useMemo(() => new Set(changes.added),   [changes.added]);
  const removedSet = useMemo(() => new Set(changes.removed), [changes.removed]);

  // ── Toggle individual com cascata ──────────────────────────────────────
  const handlePermissionToggle = (permId) => {
    const isSelected = selectedPermissions.includes(permId);

    if (isSelected) {
      const dependents = getPermissionDependents(permId, selectedPermissions, interfaces);
      const toRemove = new Set([permId]);
      const queue = [...dependents];
      while (queue.length) {
        const cur = queue.shift();
        if (!toRemove.has(cur)) {
          toRemove.add(cur);
          getPermissionDependents(cur, selectedPermissions, interfaces).forEach(d => queue.push(d));
        }
      }
      const removedNames = Array.from(toRemove)
        .filter(id => id !== permId)
        .map(id => getPermissionLabel(id, interfaces))
        .filter(Boolean)
        .join(', ');
      if (removedNames) notification.warning(`Também removido: ${removedNames}`, { duration: 4000 });
      setSelectedPermissions(selectedPermissions.filter(id => !toRemove.has(id)));
    } else {
      const deps = getPermissionDependencies(permId, interfaces);
      const missing = deps.filter(d => !selectedPermissions.includes(d));
      if (missing.length) {
        const names = missing.map(d => getPermissionLabel(d, interfaces)).filter(Boolean).join(', ');
        notification.info(`Dependências adicionadas: ${names}`, { duration: 3000 });
      }
      setSelectedPermissions([...new Set([...selectedPermissions, permId, ...missing])]);
    }
  };

  // ── Toggle de categoria inteira ────────────────────────────────────────
  const handleCategoryToggle = (categoryPerms) => {
    const catIds = categoryPerms.map(p => p.pk);
    const allSelected = catIds.every(id => selectedPermissions.includes(id));
    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter(id => !catIds.includes(id)));
    } else {
      const resolved = resolvePermissionDependencies([...selectedPermissions, ...catIds], interfaces);
      setSelectedPermissions(resolved);
    }
  };


  // ── Expandir / Recolher todos ──────────────────────────────────────────
  const handleExpandAll  = () => setExpandedPanels(new Set(Object.keys(filteredGroups)));
  const handleCollapseAll = () => setExpandedPanels(new Set());
  const handleTogglePanel = (cat) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const avatarColor = getAvatarColor(user?.profil);

  // ── Painel de resumo (partilhado entre desktop e mobile) ───────────────
  const SummaryPanel = () => (
    <Box sx={{ p: 2 }}>
      {/* Estatísticas */}
      <Box
        sx={{
          display: 'flex', gap: 1, mb: 2, p: 1.5, borderRadius: 1,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
        }}
      >
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={700} color="primary.main" lineHeight={1}>{selectedPermissions.length}</Typography>
          <Typography variant="caption" color="text.secondary">ativas</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={700} color="success.main" lineHeight={1}>{changes.added.length}</Typography>
          <Typography variant="caption" color="text.secondary">a adicionar</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={700} color="error.main" lineHeight={1}>{changes.removed.length}</Typography>
          <Typography variant="caption" color="text.secondary">a remover</Typography>
        </Box>
      </Box>

      {/* Lista de alterações */}
      {changes.hasChanges ? (
        <Stack spacing={1.5}>
          {changes.added.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                <Typography variant="caption" fontWeight={700} color="success.main">
                  A adicionar ({changes.added.length})
                </Typography>
              </Box>
              <Stack spacing={0.25}>
                {changes.added.map(id => (
                  <Typography
                    key={id} variant="caption"
                    sx={{ display: 'block', pl: 2, color: 'success.dark',
                          borderLeft: `2px solid ${alpha(theme.palette.success.main, 0.4)}` }}
                  >
                    {getPermissionLabel(id, interfaces)}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
          {changes.removed.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                <CancelIcon sx={{ fontSize: 14, color: 'error.main' }} />
                <Typography variant="caption" fontWeight={700} color="error.main">
                  A remover ({changes.removed.length})
                </Typography>
              </Box>
              <Stack spacing={0.25}>
                {changes.removed.map(id => (
                  <Typography
                    key={id} variant="caption"
                    sx={{ display: 'block', pl: 2, color: 'error.dark', textDecoration: 'line-through',
                          borderLeft: `2px solid ${alpha(theme.palette.error.main, 0.4)}` }}
                  >
                    {getPermissionLabel(id, interfaces)}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary">Sem alterações pendentes.</Typography>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Grupos definidos na BD */}
      <Typography variant="caption" fontWeight={700} color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1.25 }}>
        Grupos
      </Typography>
      {permissionGroups.length === 0 ? (
        <Typography variant="caption" color="text.disabled">
          Sem grupos definidos. Cria grupos em Gestão de Permissões.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {permissionGroups.map(({ name, permission_ids }) => {
            const selCount = permission_ids.filter(id => selectedPermissions.includes(id)).length;
            const allSel = selCount === permission_ids.length;
            const partial = selCount > 0 && !allSel;
            return (
              <Box
                key={name}
                onClick={() => {
                  if (allSel) {
                    setSelectedPermissions(selectedPermissions.filter(id => !permission_ids.includes(id)));
                  } else {
                    const resolved = resolvePermissionDependencies([...selectedPermissions, ...permission_ids], interfaces);
                    setSelectedPermissions(resolved);
                  }
                }}
                sx={{
                  p: 1.25, borderRadius: 1, cursor: 'pointer',
                  border: `1px solid ${allSel ? theme.palette.primary.main : partial ? theme.palette.warning.main : theme.palette.divider}`,
                  bgcolor: allSel ? alpha(theme.palette.primary.main, 0.06) : partial ? alpha(theme.palette.warning.main, 0.04) : 'transparent',
                  transition: 'all 0.15s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={600}>{name}</Typography>
                  <Chip
                    label={`${selCount}/${permission_ids.length}`}
                    size="small"
                    variant={allSel ? 'filled' : 'outlined'}
                    color={allSel ? 'primary' : partial ? 'warning' : 'default'}
                    sx={{ height: 18, fontSize: '0.65rem' }}
                  />
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );

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
          <Avatar
            sx={{
              width: 38, height: 38, fontSize: '0.85rem',
              bgcolor: avatarColor,
              boxShadow: `0 0 0 3px ${alpha(avatarColor, 0.2)}`,
            }}
          >
            {getInitials(user?.name, user?.username)}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {user?.name || user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{user?.username} · Gerir permissões
            </Typography>
          </Box>
          {changes.hasChanges && (
            <Chip
              label={`+${changes.added.length} / -${changes.removed.length}`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ flexShrink: 0 }}
            />
          )}
        </Box>
      </DialogTitle>

      {/* ── Conteúdo ────────────────────────────────────────────────────── */}
      <DialogContent sx={{ p: 0, display: 'flex', overflow: 'hidden' }}>
        <Grid container sx={{ flex: 1, overflow: 'hidden', height: '100%' }}>

          {/* ── Painel esquerdo: lista de permissões ─────────────────────── */}
          <Grid
            size={{ xs: 12, md: 8 }}
            sx={{
              display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%',
              borderRight: isDesktop ? `1px solid ${theme.palette.divider}` : 'none',
            }}
          >
            {/* Barra de pesquisa e controlos */}
            <Box
              sx={{
                px: 2, py: 1.5,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex', gap: 1, alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <TextField
                size="small" fullWidth
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
                <IconButton size="small" onClick={handleExpandAll}>
                  <UnfoldMoreIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Recolher todos">
                <IconButton size="small" onClick={handleCollapseAll}>
                  <UnfoldLessIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 48 }}>
                {selectedPermissions.length}/{interfaces.length}
              </Typography>
            </Box>

            {/* Accordions por categoria */}
            <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {Object.entries(filteredGroups).map(([category, perms]) => {
                const catIds = perms.map(p => p.pk);
                const selCount = catIds.filter(id => selectedPermissions.includes(id)).length;
                const allSel = selCount === perms.length;
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
                      ...(selCount > 0 && !allSel && {
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
                          onChange={() => handleCategoryToggle(perms)}
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
                          color={allSel ? 'primary' : 'default'}
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
                        {perms.map(perm => {
                          const isSelected = selectedPermissions.includes(perm.pk);
                          const isNew     = addedSet.has(perm.pk);
                          const isRemoved = removedSet.has(perm.pk);

                          return (
                            <Grid size={{ xs: 12, sm: 6 }} key={perm.pk}>
                              <Box
                                sx={{
                                  borderRadius: 1,
                                  pl: 0.5,
                                  ...(isNew && {
                                    bgcolor: alpha(theme.palette.success.main, 0.07),
                                    borderLeft: `2px solid ${theme.palette.success.main}`,
                                  }),
                                  ...(isRemoved && {
                                    bgcolor: alpha(theme.palette.error.main, 0.07),
                                    borderLeft: `2px solid ${theme.palette.error.main}`,
                                  }),
                                }}
                              >
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      size="small"
                                      checked={isSelected}
                                      onChange={() => handlePermissionToggle(perm.pk)}
                                      sx={{ py: 0.5 }}
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                        <Typography variant="body2">
                                          {perm.label || perm.value}
                                        </Typography>
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
                              </Box>
                            </Grid>
                          );
                        })}
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

            {/* Mobile: botão para mostrar/esconder painel de resumo */}
            {!isDesktop && (
              <Box
                sx={{
                  borderTop: `1px solid ${theme.palette.divider}`,
                  px: 2, py: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', flexShrink: 0,
                }}
                onClick={() => setSummaryOpen(v => !v)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" fontWeight={600}>
                    Resumo e templates
                  </Typography>
                  {changes.hasChanges && (
                    <Chip label={`+${changes.added.length}/-${changes.removed.length}`} size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />
                  )}
                </Box>
                <ExpandLessIcon sx={{ fontSize: 18, transform: summaryOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
              </Box>
            )}

            {/* Mobile: painel resumo colapsável */}
            {!isDesktop && (
              <Collapse in={summaryOpen} sx={{ flexShrink: 0, overflowY: 'auto', maxHeight: '40vh' }}>
                <SummaryPanel />
              </Collapse>
            )}
          </Grid>

          {/* ── Painel direito: resumo + grupos (apenas desktop) ─────────── */}
          {isDesktop && (
            <Grid
              size={{ md: 4 }}
              sx={{ overflowY: 'auto', height: '100%', minHeight: 0 }}
            >
              <SummaryPanel />
            </Grid>
          )}
        </Grid>
      </DialogContent>

      {/* ── Ações ──────────────────────────────────────────────────────── */}
      <DialogActions sx={{ borderTop: `1px solid ${theme.palette.divider}`, px: 2.5, py: 1.5 }}>
        <Button onClick={onClose} size="small">Cancelar</Button>
        <Button
          onClick={() => onSave(selectedPermissions)}
          variant="contained"
          size="small"
          disabled={!changes.hasChanges}
          startIcon={<SaveIcon />}
        >
          {changes.hasChanges
            ? `Guardar (+${changes.added.length} / -${changes.removed.length})`
            : 'Sem alterações'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserPermissionsDialog;
