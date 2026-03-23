import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControlLabel,
  Checkbox,
  Button,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Tooltip,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  Group as GroupIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useInterfaces } from '@/core/contexts/MetadataContext';
import { updateUserPermissions } from '@/services/userService';
import { notification } from '@/core/services/notification';
import { PERMISSION_GROUPS } from '@/core/config/permissionMap';
import {
  getPermissionDependencies,
  getPermissionDependents,
  resolvePermissionDependencies,
  getPermissionChanges,
} from '@/core/utils/permissionHelpers';
import { Loading } from '@/shared/components/feedback';

// Etiquetas legíveis para os perfis pré-definidos
const GROUP_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  OPERADOR:    'Operador',
  TECNICO:     'Técnico',
  FINANCEIRO:  'Financeiro',
  GESTOR:      'Gestor',
  ADMIN:       'Admin',
};

export const UserPermissionsEditor = ({ userId, currentPermissions = [], onSave }) => {
  const theme = useTheme();
  const { interfaces, isLoading } = useInterfaces();

  const [selected, setSelected] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Inicializar com as permissões atuais (normalizar para números)
  useEffect(() => {
    setSelected(new Set(currentPermissions.map(Number)));
  }, [currentPermissions]);

  // Agrupar por categoria (fonte: BD via MetadataContext)
  const groupedByCategory = useMemo(() => (
    interfaces.reduce((acc, iface) => {
      const cat = iface.category || 'Outros';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(iface);
      return acc;
    }, {})
  ), [interfaces]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: interfaces.length,
    selected: selected.size,
  }), [interfaces.length, selected.size]);

  // Alterações face às permissões originais
  const changes = useMemo(() => (
    getPermissionChanges(currentPermissions.map(Number), Array.from(selected))
  ), [currentPermissions, selected]);

  // ── Toggle individual com resolução de dependências da BD ──────────────
  const handleToggle = (permId) => {
    const next = new Set(selected);

    if (next.has(permId)) {
      // Remover + dependentes em cascata
      const dependents = getPermissionDependents(permId, Array.from(next), interfaces);
      next.delete(permId);
      dependents.forEach(d => next.delete(d));

      if (dependents.length > 0) {
        const names = dependents
          .map(d => interfaces.find(i => i.pk === d)?.label || `#${d}`)
          .join(', ');
        notification.warning(`Também removido: ${names}`, { duration: 4000 });
      }
    } else {
      // Adicionar + dependências em cascata
      const deps = getPermissionDependencies(permId, interfaces);
      const missing = deps.filter(d => !next.has(d));
      next.add(permId);
      missing.forEach(d => next.add(d));

      if (missing.length > 0) {
        const names = missing
          .map(d => interfaces.find(i => i.pk === d)?.label || `#${d}`)
          .join(', ');
        notification.info(`Dependências adicionadas: ${names}`, { duration: 3000 });
      }
    }

    setSelected(next);
  };

  // ── Toggle de categoria inteira ────────────────────────────────────────
  const handleToggleCategory = (perms) => {
    const next = new Set(selected);
    const allSelected = perms.every(p => next.has(p.pk));

    if (allSelected) {
      perms.forEach(p => next.delete(p.pk));
    } else {
      const ids = perms.map(p => p.pk);
      const resolved = resolvePermissionDependencies([...Array.from(next), ...ids], interfaces);
      resolved.forEach(id => next.add(id));
    }
    setSelected(next);
  };

  // ── Aplicar perfil pré-definido ────────────────────────────────────────
  const handleApplyGroup = (groupName, groupPerms) => {
    if (!window.confirm(`Substituir permissões pelo perfil "${GROUP_LABELS[groupName] || groupName}"?`)) return;
    const resolved = resolvePermissionDependencies(groupPerms.map(Number), interfaces);
    setSelected(new Set(resolved));
    notification.success(`Perfil "${GROUP_LABELS[groupName] || groupName}" aplicado`);
  };

  // ── Guardar ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const permArray = Array.from(selected);
      await updateUserPermissions(userId, permArray);
      notification.success('Permissões atualizadas com sucesso');
      if (onSave) onSave(permArray);
    } catch (err) {
      notification.error(err.message || 'Erro ao guardar permissões');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loading />;

  // Perfis a mostrar (excluir SUPER_ADMIN e ADMIN que são "tudo")
  const mainGroups = ['OPERADOR', 'TECNICO', 'FINANCEIRO', 'GESTOR'];

  return (
    <Box>
      {/* ── Cabeçalho com stats e guardar ─────────────────────────────── */}
      <Paper
        sx={{
          p: 2, mb: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.04),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between">
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <SecurityIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                Permissões & Acessos
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {stats.selected} de {stats.total} permissões ativas
              {changes.hasChanges && (
                <Chip
                  label={`+${changes.added.length} / -${changes.removed.length}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                />
              )}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving || !changes.hasChanges}
            sx={{ minWidth: 160 }}
          >
            {isSaving ? 'A guardar…' : 'Guardar alterações'}
          </Button>
        </Stack>
      </Paper>

      {/* ── Perfis rápidos ─────────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1.5 }}>
          Aplicar perfil base
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
          {mainGroups.map(name => (
            <Chip
              key={name}
              icon={<GroupIcon />}
              label={GROUP_LABELS[name]}
              onClick={() => handleApplyGroup(name, PERMISSION_GROUPS[name])}
              variant="outlined"
              color="primary"
              clickable
              size="small"
              sx={{ m: '0 !important' }}
            />
          ))}
          <Chip
            icon={<CheckCircleIcon />}
            label="Admin completo"
            onClick={() => handleApplyGroup('ADMIN', PERMISSION_GROUPS.ADMIN)}
            variant="outlined"
            color="error"
            clickable
            size="small"
            sx={{ m: '0 !important' }}
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Ao aplicar um perfil as permissões atuais são substituídas. Pode ajustar individualmente depois.
        </Typography>
      </Paper>

      {/* ── Aviso de alterações pendentes ─────────────────────────────── */}
      {changes.hasChanges && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 2 }}
          action={
            <Button size="small" color="inherit" onClick={handleSave} disabled={isSaving}>
              Guardar
            </Button>
          }
        >
          Existem alterações não guardadas ({changes.added.length} adicionadas, {changes.removed.length} removidas).
        </Alert>
      )}

      {/* ── Lista de permissões por categoria (fonte: BD) ─────────────── */}
      <Box>
        {Object.entries(groupedByCategory).map(([category, perms], idx) => {
          const selectedCount = perms.filter(p => selected.has(p.pk)).length;
          const allSelected = selectedCount === perms.length;
          const isIndeterminate = selectedCount > 0 && !allSelected;
          const panelId = `panel-${idx}`;

          return (
            <Accordion
              key={category}
              expanded={expanded === panelId}
              onChange={(_, open) => setExpanded(open ? panelId : false)}
              disableGutters
              sx={{
                mb: 1,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                '&:before': { display: 'none' },
                ...(selectedCount > 0 && {
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                }),
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 1, gap: 1 }}>
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={isIndeterminate}
                    onClick={e => { e.stopPropagation(); handleToggleCategory(perms); }}
                    sx={{ p: 0.5 }}
                  />
                  <Typography variant="body2" fontWeight={600} sx={{ flexGrow: 1 }}>
                    {category}
                  </Typography>
                  <Chip
                    label={`${selectedCount}/${perms.length}`}
                    size="small"
                    color={allSelected ? 'primary' : selectedCount > 0 ? 'default' : 'default'}
                    variant={allSelected ? 'filled' : 'outlined'}
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                </Box>
              </AccordionSummary>

              <AccordionDetails sx={{ bgcolor: alpha(theme.palette.background.default, 0.5), borderTop: `1px solid ${theme.palette.divider}`, pt: 2 }}>
                <Grid container spacing={1.5}>
                  {perms.map(perm => (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={perm.pk}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selected.has(perm.pk)}
                            onChange={() => handleToggle(perm.pk)}
                            size="small"
                            sx={{ py: 0.5 }}
                          />
                        }
                        label={
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                              <Typography variant="body2" component="span">
                                {perm.label || perm.value}
                              </Typography>
                              {perm.is_critical && (
                                <Chip label="Crítica" size="small" color="error" sx={{ height: 16, fontSize: '0.6rem' }} />
                              )}
                              {perm.is_sensitive && (
                                <Chip label="Sensível" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem' }} />
                              )}
                            </Box>
                            {perm.description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                                {perm.description}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Botão guardar repetido no fundo para formulários longos */}
      {interfaces.length > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving || !changes.hasChanges}
          >
            {isSaving ? 'A guardar…' : 'Guardar alterações'}
          </Button>
        </Box>
      )}
    </Box>
  );
};
