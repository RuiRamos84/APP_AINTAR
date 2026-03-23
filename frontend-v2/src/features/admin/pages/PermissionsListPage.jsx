import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Divider,
  Tooltip,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tab,
  Tabs,
  Button,
  Card,
  CardContent,
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  alpha,
  useTheme,
  useMediaQuery,
  Skeleton,
} from '@mui/material';
import {
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
  AccountTree as DepsIcon,
  Category as CategoryIcon,
  Numbers as NumbersIcon,
  GroupWork as GroupIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout';
import { Loading } from '@/shared/components/feedback';
import { useInterfaces } from '@/core/contexts/MetadataContext';
import {
  groupPermissionsByCategory,
  getPermissionLabel,
} from '@/core/utils/permissionHelpers';
import {
  listPermissionGroups,
  syncPermissionGroup,
  renamePermissionGroup,
  deletePermissionGroup,
} from '@/services/permissionGroupsService';
import { notification } from '@/core/services/notification';
import PermissionGroupDialog from '../components/PermissionGroupDialog';

// ════════════════════════════════════════════════════════════════════════════
// Sub-componentes de apresentação
// ════════════════════════════════════════════════════════════════════════════

const DepChip = ({ permId, interfaces }) => (
  <Chip
    label={getPermissionLabel(permId, interfaces)}
    size="small" variant="outlined"
    sx={{ height: 18, fontSize: '0.6rem', maxWidth: 130 }}
  />
);

const PermissionRow = ({ perm, interfaces }) => {
  const theme = useTheme();
  return (
    <TableRow hover sx={{
      ...(perm.is_critical && { borderLeft: `3px solid ${theme.palette.error.main}` }),
      ...(perm.is_sensitive && !perm.is_critical && { borderLeft: `3px solid ${theme.palette.warning.main}` }),
    }}>
      <TableCell sx={{ width: 72, py: 1 }}>
        <Chip label={perm.pk} size="small" color="primary" variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
      </TableCell>
      <TableCell sx={{ py: 1, minWidth: 160 }}>
        <Typography variant="body2" fontWeight={600} lineHeight={1.3}>
          {perm.label || perm.value}
        </Typography>
        {perm.value && perm.label && (
          <Typography variant="caption" color="text.secondary"
            sx={{ fontFamily: 'monospace', display: 'block', mt: 0.25 }}>
            {perm.value}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ py: 1, color: 'text.secondary', maxWidth: 260 }}>
        <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
          {perm.description || '—'}
        </Typography>
      </TableCell>
      <TableCell sx={{ py: 1, minWidth: 160 }}>
        {perm.requires?.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
            {perm.requires.map(d => <DepChip key={d} permId={d} interfaces={interfaces} />)}
          </Stack>
        ) : <Typography variant="caption" color="text.disabled">—</Typography>}
      </TableCell>
      <TableCell sx={{ py: 1 }}>
        {perm.groups?.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
            {perm.groups.map(g => (
              <Chip key={g} label={g} size="small" color="primary" variant="outlined"
                sx={{ height: 18, fontSize: '0.6rem' }} />
            ))}
          </Stack>
        ) : <Typography variant="caption" color="text.disabled">—</Typography>}
      </TableCell>
      <TableCell sx={{ py: 1, width: 110 }}>
        <Stack direction="row" spacing={0.5}>
          {perm.is_critical  && <Chip label="Crítica"  size="small" color="error"   sx={{ height: 20, fontSize: '0.65rem' }} />}
          {perm.is_sensitive && <Chip label="Sensível" size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem' }} />}
        </Stack>
      </TableCell>
    </TableRow>
  );
};

const PermissionCard = ({ perm, interfaces }) => {
  const theme = useTheme();
  return (
    <Paper variant="outlined" sx={{
      p: 1.5,
      ...(perm.is_critical && { borderLeft: `3px solid ${theme.palette.error.main}` }),
      ...(perm.is_sensitive && !perm.is_critical && { borderLeft: `3px solid ${theme.palette.warning.main}` }),
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip label={perm.pk} size="small" color="primary" variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
          <Typography variant="body2" fontWeight={600}>{perm.label || perm.value}</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {perm.is_critical  && <Chip label="Crítica"  size="small" color="error"   sx={{ height: 18, fontSize: '0.6rem' }} />}
          {perm.is_sensitive && <Chip label="Sensível" size="small" color="warning" sx={{ height: 18, fontSize: '0.6rem' }} />}
        </Stack>
      </Box>
      {perm.value && perm.label && (
        <Typography variant="caption" color="text.secondary"
          sx={{ fontFamily: 'monospace', display: 'block', mb: 0.5 }}>
          {perm.value}
        </Typography>
      )}
      {perm.description && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {perm.description}
        </Typography>
      )}
      {perm.groups?.length > 0 && (
        <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5, mt: 0.5 }}>
          {perm.groups.map(g => (
            <Chip key={g} label={g} size="small" color="primary" variant="outlined"
              sx={{ height: 18, fontSize: '0.6rem' }} />
          ))}
        </Stack>
      )}
      {perm.requires?.length > 0 && (
        <Box sx={{ mt: 0.75, pt: 0.75, borderTop: `1px solid ${useTheme().palette.divider}` }}>
          <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
            {perm.requires.map(d => <DepChip key={d} permId={d} interfaces={interfaces} />)}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

const GroupCard = ({ group, onEdit, onRename, onDelete }) => {
  const theme = useTheme();
  return (
    <Card variant="outlined" sx={{
      height: '100%', display: 'flex', flexDirection: 'column',
      transition: 'box-shadow 0.15s', '&:hover': { boxShadow: 3 },
    }}>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 1.5, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}>
            <GroupIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {group.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {group.permission_count} permissão{group.permission_count !== 1 ? 'ões' : ''}
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<PeopleIcon sx={{ fontSize: '0.85rem !important' }} />}
          label={`${group.permission_count} permissões`}
          size="small" color="primary" variant="outlined"
          sx={{ height: 22, fontSize: '0.7rem' }}
        />
      </CardContent>
      <CardActions sx={{ pt: 0, px: 1.5, pb: 1.5, gap: 0.5 }}>
        <Button size="small" startIcon={<EditIcon />} onClick={() => onEdit(group)} sx={{ flex: 1 }}>
          Editar
        </Button>
        <Tooltip title="Renomear">
          <IconButton size="small" onClick={() => onRename(group)}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Eliminar">
          <IconButton size="small" color="error" onClick={() => onDelete(group)}>
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

// ── Estatística compacta para o header ────────────────────────────────────
const StatItem = ({ value, label, color }) => (
  <Box sx={{ textAlign: 'center', px: 1.5 }}>
    <Typography variant="h6" fontWeight={700} lineHeight={1}
      color={color ? `${color}.main` : 'text.primary'}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
      {label}
    </Typography>
  </Box>
);

// ════════════════════════════════════════════════════════════════════════════
// PermissionsListPage
// ════════════════════════════════════════════════════════════════════════════
const PermissionsListPage = () => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { interfaces, isLoading, refreshMetadata } = useInterfaces();

  // ── Tab activo ────────────────────────────────────────────────────────────
  const [tab, setTab] = useState(0);

  // ── Tab Permissões ────────────────────────────────────────────────────────
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filter,         setFilter]         = useState('all');
  const [expandedPanels, setExpandedPanels] = useState(new Set());

  // ── Tab Grupos ────────────────────────────────────────────────────────────
  const [groups,        setGroups]        = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupDialog,   setGroupDialog]   = useState({ open: false, group: null });
  const [renameDialog,  setRenameDialog]  = useState({ open: false, group: null, name: '' });
  const [deleteDialog,  setDeleteDialog]  = useState({ open: false, group: null });
  const [groupSearch,   setGroupSearch]   = useState('');

  // ── Carregar grupos ───────────────────────────────────────────────────────
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await listPermissionGroups();
      setGroups(res?.groups || []);
    } catch {
      notification.error('Erro ao carregar grupos');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const handleTabChange = (_, v) => {
    setTab(v);
    if (v === 1 && groups.length === 0) fetchGroups();
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:      interfaces.length,
    categories: Object.keys(groupPermissionsByCategory(interfaces)).length,
    critical:   interfaces.filter(i => i.is_critical).length,
    sensitive:  interfaces.filter(i => i.is_sensitive).length,
    withDeps:   interfaces.filter(i => i.requires?.length > 0).length,
  }), [interfaces]);

  // ── Filtrar permissões ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = interfaces;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      r = r.filter(p =>
        p.label?.toLowerCase().includes(s) ||
        p.value?.toLowerCase().includes(s) ||
        p.description?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s) ||
        String(p.pk).includes(s)
      );
    }
    if (filter === 'critical')  r = r.filter(p => p.is_critical);
    if (filter === 'sensitive') r = r.filter(p => p.is_sensitive);
    return r;
  }, [interfaces, searchTerm, filter]);

  const grouped    = useMemo(() => groupPermissionsByCategory(filtered), [filtered]);
  const categories = useMemo(() => Object.keys(grouped), [grouped]);

  const handleTogglePanel = (cat) => setExpandedPanels(prev => {
    const next = new Set(prev);
    next.has(cat) ? next.delete(cat) : next.add(cat);
    return next;
  });

  // ── Grupos CRUD ───────────────────────────────────────────────────────────
  const handleSaveGroup = async (name, permissions) => {
    try {
      await syncPermissionGroup(name, permissions);
      notification.success(`Grupo "${name}" guardado`);
      setGroupDialog({ open: false, group: null });
      await Promise.all([fetchGroups(), refreshMetadata()]);
    } catch {
      notification.error('Erro ao guardar grupo');
    }
  };

  const handleRenameConfirm = async () => {
    const { group, name } = renameDialog;
    if (!name.trim()) return;
    try {
      await renamePermissionGroup(group.name, name.trim());
      notification.success(`Grupo renomeado para "${name.trim()}"`);
      setRenameDialog({ open: false, group: null, name: '' });
      await Promise.all([fetchGroups(), refreshMetadata()]);
    } catch {
      notification.error('Erro ao renomear grupo');
    }
  };

  const handleDeleteConfirm = async () => {
    const { group } = deleteDialog;
    try {
      await deletePermissionGroup(group.name);
      notification.success(`Grupo "${group.name}" eliminado`);
      setDeleteDialog({ open: false, group: null });
      await Promise.all([fetchGroups(), refreshMetadata()]);
    } catch {
      notification.error('Erro ao eliminar grupo');
    }
  };

  const filteredGroups = useMemo(() => {
    if (!groupSearch) return groups;
    const s = groupSearch.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(s));
  }, [groups, groupSearch]);

  // ── Actions do ModulePage (direita do header) ─────────────────────────────
  const headerActions = (
    <Stack direction="row" alignItems="center" spacing={0}>
      <StatItem value={stats.total}      label="permissões"  color="primary" />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem value={stats.categories} label="categorias"  />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem value={stats.critical}   label="críticas"    color="error" />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem value={stats.sensitive}  label="sensíveis"   color="warning" />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem value={stats.withDeps}   label="c/ deps"     color="info" />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem value={groups.length}    label="grupos"      color="success" />
      <Divider orientation="vertical" flexItem sx={{ ml: 0.5, mr: 1 }} />
      <Tooltip title="Recarregar metadados">
        <span>
          <IconButton size="small" onClick={() => { refreshMetadata(); if (tab === 1) fetchGroups(); }} disabled={isLoading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );

  if (isLoading) return <Loading />;

  return (
    <ModulePage
      title="Gestão de Permissões"
      subtitle="Fonte única de verdade: tabela ts_interface"
      icon={SecurityIcon}
      breadcrumbs={[{ label: 'Permissões' }]}
      actions={headerActions}
    >
      {/* ── Barra tabs + controlos ────────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 2,
          px: 1,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {/* Tabs — lado esquerdo */}
        <Tabs
          value={tab}
          onChange={handleTabChange}
          sx={{ flexShrink: 0, '& .MuiTab-root': { minHeight: 48, fontSize: '0.875rem' } }}
        >
          <Tab
            icon={<SecurityIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label="Permissões"
          />
          <Tab
            icon={<GroupIcon sx={{ fontSize: 17 }} />}
            iconPosition="start"
            label={`Grupos${groups.length ? ` (${groups.length})` : ''}`}
          />
        </Tabs>

        {/* Separador vertical */}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Controlos — lado direito */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', py: 0.75 }}>
          {tab === 0 && (
            <>
              <ToggleButtonGroup
                value={filter} exclusive size="small"
                onChange={(_, v) => v && setFilter(v)}
                sx={{ height: 34 }}
              >
                <ToggleButton value="all"       sx={{ px: 1.25, fontSize: '0.75rem' }}>Todas</ToggleButton>
                <ToggleButton value="critical"  sx={{ px: 1.25, fontSize: '0.75rem' }}>
                  <WarningIcon sx={{ fontSize: 13, mr: 0.5, color: 'error.main' }} />Críticas
                </ToggleButton>
                <ToggleButton value="sensitive" sx={{ px: 1.25, fontSize: '0.75rem' }}>
                  <LockIcon sx={{ fontSize: 13, mr: 0.5, color: 'warning.main' }} />Sensíveis
                </ToggleButton>
              </ToggleButtonGroup>

              <TextField
                size="small" placeholder="Pesquisar permissões…"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                sx={{ width: { xs: '100%', sm: 220 } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17 }} /></InputAdornment>,
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm('')}>
                        <ClearIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap' }}>
                {filtered.length} · {categories.length} cat.
              </Typography>

              <Box sx={{ ml: 'auto', display: 'flex', gap: 0.25 }}>
                <Tooltip title="Expandir todas">
                  <IconButton size="small" onClick={() => setExpandedPanels(new Set(categories))}>
                    <UnfoldMoreIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Recolher todas">
                  <IconButton size="small" onClick={() => setExpandedPanels(new Set())}>
                    <UnfoldLessIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </>
          )}

          {tab === 1 && (
            <>
              <TextField
                size="small" placeholder="Pesquisar grupos…"
                value={groupSearch} onChange={e => setGroupSearch(e.target.value)}
                sx={{ width: { xs: '100%', sm: 220 } }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 17 }} /></InputAdornment>,
                  endAdornment: groupSearch && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setGroupSearch('')}>
                        <ClearIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ ml: 'auto' }}>
                <Button
                  variant="contained" size="small" startIcon={<AddIcon />}
                  onClick={() => setGroupDialog({ open: true, group: null })}
                >
                  Novo grupo
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 0 — PERMISSÕES
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 0 && (
        categories.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <SecurityIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">Nenhuma permissão encontrada</Typography>
          </Paper>
        ) : categories.map(category => {
          const perms      = grouped[category];
          const critCount  = perms.filter(p => p.is_critical).length;
          const sensCount  = perms.filter(p => p.is_sensitive).length;
          const isExpanded = expandedPanels.has(category);

          return (
            <Accordion
              key={category}
              expanded={isExpanded}
              onChange={() => handleTogglePanel(category)}
              disableGutters elevation={0}
              sx={{
                mb: 1, border: `1px solid ${theme.palette.divider}`, borderRadius: 1,
                '&:before': { display: 'none' },
                '&.Mui-expanded': { borderColor: alpha(theme.palette.primary.main, 0.3) },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}
                sx={{ minHeight: 52, '& .MuiAccordionSummary-content': { my: 1 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>{category}</Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Chip label={perms.length} size="small" color="primary"
                      variant={isExpanded ? 'filled' : 'outlined'}
                      sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700 }} />
                    {critCount > 0 && (
                      <Chip label={`${critCount} crít.`} size="small" color="error" variant="outlined"
                        sx={{ height: 22, fontSize: '0.65rem' }} />
                    )}
                    {sensCount > 0 && (
                      <Chip label={`${sensCount} sens.`} size="small" color="warning" variant="outlined"
                        sx={{ height: 22, fontSize: '0.65rem' }} />
                    )}
                  </Stack>
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{
                p: 0, bgcolor: alpha(theme.palette.background.default, 0.5),
                borderTop: `1px solid ${theme.palette.divider}`,
              }}>
                {isMobile ? (
                  <Box sx={{ p: 1.5 }}>
                    <Grid container spacing={1}>
                      {perms.map(perm => (
                        <Grid size={12} key={perm.pk}>
                          <PermissionCard perm={perm} interfaces={interfaces} />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.background.paper, 0.8) }}>
                          <TableCell sx={{ fontWeight: 700, width: 72 }}>ID</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Label / Código</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Descrição</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Requer</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Grupos</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 110 }}>Flags</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {perms.map(perm => (
                          <PermissionRow key={perm.pk} perm={perm} interfaces={interfaces} />
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1 — GRUPOS
      ════════════════════════════════════════════════════════════════════ */}
      {tab === 1 && (
        groupsLoading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map(i => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
          </Grid>
        ) : filteredGroups.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <GroupIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {groupSearch ? 'Nenhum grupo encontrado' : 'Sem grupos definidos'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {groupSearch
                ? 'Ajusta a pesquisa'
                : 'Cria o primeiro grupo para organizar conjuntos de permissões.'}
            </Typography>
            {!groupSearch && (
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => setGroupDialog({ open: true, group: null })}>
                Criar primeiro grupo
              </Button>
            )}
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filteredGroups.map(group => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={group.name}>
                <GroupCard
                  group={group}
                  onEdit={g => setGroupDialog({ open: true, group: g })}
                  onRename={g => setRenameDialog({ open: true, group: g, name: g.name })}
                  onDelete={g => setDeleteDialog({ open: true, group: g })}
                />
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <PermissionGroupDialog
        open={groupDialog.open}
        group={groupDialog.group
          ? { name: groupDialog.group.name, permission_ids: groupDialog.group.permission_ids }
          : null}
        onClose={() => setGroupDialog({ open: false, group: null })}
        onSave={handleSaveGroup}
      />

      <Dialog
        open={renameDialog.open}
        onClose={() => setRenameDialog({ open: false, group: null, name: '' })}
        maxWidth="xs" fullWidth
      >
        <DialogTitle>Renomear grupo</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            autoFocus fullWidth size="small" label="Novo nome"
            value={renameDialog.name}
            onChange={e => setRenameDialog(prev => ({ ...prev, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleRenameConfirm()}
            inputProps={{ maxLength: 60 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialog({ open: false, group: null, name: '' })}>Cancelar</Button>
          <Button onClick={handleRenameConfirm} variant="contained" disabled={!renameDialog.name.trim()}>
            Renomear
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, group: null })}
        maxWidth="xs" fullWidth
      >
        <DialogTitle>Eliminar grupo</DialogTitle>
        <DialogContent>
          <Typography>
            Tens a certeza que queres eliminar o grupo <strong>"{deleteDialog.group?.name}"</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            O grupo será removido de todas as permissões. Esta acção não pode ser revertida.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, group: null })}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
};

export default PermissionsListPage;
