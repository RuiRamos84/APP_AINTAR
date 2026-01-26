/**
 * UserPermissionsDialog
 * Modal avançado para editar permissões de utilizadores
 *
 * Features:
 * - Agrupamento de permissões por categoria
 * - Dependências automáticas (cascata para cima ao adicionar)
 * - Remoção em cascata (remove dependentes ao remover)
 * - Templates de permissões rápidas
 * - Visualização de mudanças antes de guardar
 * - Pesquisa de permissões
 * - Seleção/deseleção de grupos completos
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
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { useInterfaces } from '@/core/contexts/MetadataContext';
import {
  PERMISSION_TEMPLATES,
  getPermissionDependencies,
  getPermissionDependents,
  resolvePermissionDependencies,
  getPermissionChanges,
  groupPermissionsByCategory,
  getPermissionLabel,
} from '@/core/utils/permissionHelpers';
import { notification } from '@/core/services/notification';

const UserPermissionsDialog = ({ open, user, onClose, onSave }) => {
  const { interfaces } = useInterfaces();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
  });

  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabIndex, setTabIndex] = useState(0); // 0 = Permissões, 1 = Templates, 2 = Resumo

  // Inicializar permissões selecionadas quando user mudar
  useEffect(() => {
    if (user?.interface) {
      setSelectedPermissions(user.interface);
    } else {
      setSelectedPermissions([]);
    }
  }, [user]);

  // Agrupar permissões por categoria
  const groupedPermissions = useMemo(() => {
    return groupPermissionsByCategory(interfaces);
  }, [interfaces]);

  // Filtrar permissões pela pesquisa
  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groupedPermissions;

    const searchLower = searchTerm.toLowerCase();
    const filtered = {};

    Object.entries(groupedPermissions).forEach(([category, permissions]) => {
      const matchingPerms = permissions.filter(perm =>
        perm.label?.toLowerCase().includes(searchLower) ||
        perm.value?.toLowerCase().includes(searchLower) ||
        perm.pk?.toString().includes(searchLower)
      );

      if (matchingPerms.length > 0) {
        filtered[category] = matchingPerms;
      }
    });

    return filtered;
  }, [groupedPermissions, searchTerm]);

  // Calcular mudanças
  const changes = useMemo(() => {
    return getPermissionChanges(user?.interface || [], selectedPermissions);
  }, [user, selectedPermissions]);

  /**
   * Handle permission toggle with automatic dependency resolution
   */
  const handlePermissionToggle = (permissionId) => {
    const isSelected = selectedPermissions.includes(permissionId);

    if (isSelected) {
      // ===== REMOVER PERMISSÃO + DEPENDENTES (CASCATA PARA BAIXO) =====
      const dependents = getPermissionDependents(permissionId, selectedPermissions);

      if (dependents.length > 0) {
        // Construir lista completa de remoções
        const toRemove = new Set([permissionId]);
        const queue = [...dependents];

        while (queue.length > 0) {
          const current = queue.shift();
          if (!toRemove.has(current)) {
            toRemove.add(current);
            const moreDependents = getPermissionDependents(current, selectedPermissions);
            queue.push(...moreDependents);
          }
        }

        // Notificar remoção em cascata
        const removedNames = Array.from(toRemove)
          .filter(id => id !== permissionId)
          .map(id => getPermissionLabel(id, interfaces))
          .join(', ');

        if (removedNames) {
          notification.warning(`Também a remover dependentes: ${removedNames}`, {
            autoClose: 5000,
          });
        }

        // Remover todas
        setSelectedPermissions(selectedPermissions.filter(id => !toRemove.has(id)));
      } else {
        // Sem dependentes, remover apenas esta
        setSelectedPermissions(selectedPermissions.filter(id => id !== permissionId));
      }
    } else {
      // ===== ADICIONAR PERMISSÃO + DEPENDÊNCIAS (CASCATA PARA CIMA) =====
      const dependencies = getPermissionDependencies(permissionId);
      const missingDeps = dependencies.filter(dep => !selectedPermissions.includes(dep));

      if (missingDeps.length > 0) {
        // Notificar dependências adicionadas
        const depsNames = missingDeps.map(dep => getPermissionLabel(dep, interfaces)).join(', ');
        notification.info(`Dependências adicionadas: ${depsNames}`, { autoClose: 4000 });
      }

      // Adicionar permissão + dependências
      const newPermissions = [...new Set([...selectedPermissions, permissionId, ...missingDeps])];
      setSelectedPermissions(newPermissions);
    }
  };

  /**
   * Handle category toggle (select/deselect all in category)
   */
  const handleCategoryToggle = (categoryPermissions) => {
    const categoryIds = categoryPermissions.map(p => p.pk);
    const allSelected = categoryIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      // Deselecionar todas do grupo
      setSelectedPermissions(selectedPermissions.filter(id => !categoryIds.includes(id)));
    } else {
      // Selecionar todas do grupo (com dependências resolvidas)
      const resolved = resolvePermissionDependencies([...selectedPermissions, ...categoryIds]);
      setSelectedPermissions(resolved);
    }
  };

  /**
   * Handle template application
   */
  const handleApplyTemplate = (templateName) => {
    const template = PERMISSION_TEMPLATES[templateName];
    if (template) {
      const resolved = resolvePermissionDependencies([
        ...selectedPermissions,
        ...template.permissions,
      ]);
      setSelectedPermissions(resolved);
      notification.success(`Template "${templateName}" aplicado`);
      setTabIndex(0); // Voltar para tab de permissões
    }
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    onSave(selectedPermissions);
  };

  /**
   * Render permission checkbox
   */
  const renderPermissionCheckbox = (permission) => {
    const isSelected = selectedPermissions.includes(permission.pk);
    const isNew = changes.added.includes(permission.pk);
    const isRemoved = changes.removed.includes(permission.pk);

    return (
      <FormControlLabel
        key={permission.pk}
        control={
          <Checkbox
            checked={isSelected}
            onChange={() => handlePermissionToggle(permission.pk)}
            size="small"
          />
        }
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">{permission.label || permission.value}</Typography>
            <Chip label={permission.pk} size="small" variant="outlined" />
            {permission.is_critical && (
              <Chip label="Crítica" size="small" color="error" />
            )}
            {permission.is_sensitive && (
              <Chip label="Sensível" size="small" color="warning" />
            )}
            {isNew && <Chip label="NOVO" size="small" color="success" />}
            {isRemoved && <Chip label="REMOVER" size="small" color="error" />}
          </Box>
        }
      />
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6">Gerir Permissões</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.name || user?.username}
            </Typography>
          </Box>
          {changes.hasChanges && !isMobile && (
            <Chip
              label={`${changes.added.length} novas, ${changes.removed.length} removidas`}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        {/* Tabs */}
        <Tabs
          value={tabIndex}
          onChange={(_, newValue) => setTabIndex(newValue)}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{ mb: 2 }}
        >
          <Tab label="Permissões" sx={{ minWidth: isMobile ? 0 : 160 }} />
          <Tab label="Templates" sx={{ minWidth: isMobile ? 0 : 160 }} />
          <Tab label={isMobile ? 'Resumo' : `Resumo ${changes.hasChanges ? '(*)' : ''}`} sx={{ minWidth: isMobile ? 0 : 160 }} />
        </Tabs>

        {/* Tab 0: Permissões */}
        {tabIndex === 0 && (
          <Box>
            {/* Search */}
            <TextField
              fullWidth
              placeholder="Pesquisar permissões..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            {/* Grouped Permissions */}
            {Object.entries(filteredGroups).map(([category, permissions]) => {
              const categoryIds = permissions.map(p => p.pk);
              const allSelected = categoryIds.every(id => selectedPermissions.includes(id));
              const someSelected = categoryIds.some(id => selectedPermissions.includes(id));

              return (
                <Accordion key={category} defaultExpanded={Object.keys(filteredGroups).length <= 3}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={() => handleCategoryToggle(permissions)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {category}
                      </Typography>
                      <Chip
                        label={permissions.length}
                        size="small"
                        color={allSelected ? 'primary' : 'default'}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {permissions.map(perm => renderPermissionCheckbox(perm))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}

            {Object.keys(filteredGroups).length === 0 && (
              <Alert severity="info">Nenhuma permissão encontrada para "{searchTerm}"</Alert>
            )}
          </Box>
        )}
        
        {/* Tab 1: Templates */}
        {tabIndex === 1 && (
          <Grid container spacing={2}>
            {Object.entries(PERMISSION_TEMPLATES).map(([name, template]) => (
              <Grid size={{ xs: 12, sm: 6 }} key={name}>
                <Box
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: 'action.hover',
                    },
                  }}
                  onClick={() => handleApplyTemplate(name)}
                >
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {template.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {template.permissions.length} permissões
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Tab 2: Resumo de Mudanças */}
        {tabIndex === 2 && (
          <Box>
            {changes.hasChanges ? (
              <>
                {/* Adições */}
                {changes.added.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      <CheckCircleIcon sx={{ fontSize: 18, mr: 1, color: 'success.main' }} />
                      A Adicionar ({changes.added.length})
                    </Typography>
                    <List dense>
                      {changes.added.map(permId => (
                        <ListItem key={permId}>
                          <ListItemIcon>
                            <CheckBoxIcon color="success" />
                          </ListItemIcon>
                          <ListItemText primary={getPermissionLabel(permId, interfaces)} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {/* Remoções */}
                {changes.removed.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      <CancelIcon sx={{ fontSize: 18, mr: 1, color: 'error.main' }} />
                      A Remover ({changes.removed.length})
                    </Typography>
                    <List dense>
                      {changes.removed.map(permId => (
                        <ListItem key={permId}>
                          <ListItemIcon>
                            <CheckBoxOutlineBlankIcon color="error" />
                          </ListItemIcon>
                          <ListItemText primary={getPermissionLabel(permId, interfaces)} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="info" icon={<InfoIcon />}>
                Sem mudanças para guardar
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!changes.hasChanges}
          startIcon={<SecurityIcon />}
        >
          Guardar Mudanças
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserPermissionsDialog;
