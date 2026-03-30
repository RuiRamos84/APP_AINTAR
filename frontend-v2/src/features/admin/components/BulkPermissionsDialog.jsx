/**
 * BulkPermissionsDialog
 * Modal para aplicar permissões a múltiplos utilizadores simultaneamente
 *
 * Features:
 * - Adicionar permissões a múltiplos utilizadores
 * - Remover permissões de múltiplos utilizadores
 * - Aplicar templates a múltiplos utilizadores
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  FormControlLabel,
  Checkbox,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  GroupAdd as GroupAddIcon,
  GroupWork as GroupWorkIcon,
  Tune as TemplateIcon,
} from '@mui/icons-material';
import { useInterfaces } from '@/core/contexts/MetadataContext';
import {
  PERMISSION_TEMPLATES,
  groupPermissionsByCategory,
} from '@/core/utils/permissionHelpers';
import { listPermissionGroups } from '@/services/permissionGroupsService';

const BulkPermissionsDialog = ({ open, selectedUsers, action, onClose, onConfirm }) => {
  const { interfaces } = useInterfaces();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tabIndex, setTabIndex] = useState(action === 'template' ? 1 : 0);

  // Grupos dinâmicos da BD
  const [bdGroups, setBdGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Carregar grupos da BD quando o diálogo abre em modo template
  useEffect(() => {
    if (!open || action !== 'template') return;
    setGroupsLoading(true);
    listPermissionGroups()
      .then(res => setBdGroups(
        [...(res?.groups || [])].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' })
        )
      ))
      .catch(() => setBdGroups([]))
      .finally(() => setGroupsLoading(false));
  }, [open, action]);

  // Agrupar permissões
  const groupedPermissions = groupPermissionsByCategory(interfaces);

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleCategoryToggle = (categoryPermissions) => {
    const categoryIds = categoryPermissions.map(p => p.pk);
    const allSelected = categoryIds.every(id => selectedPermissions.includes(id));

    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(id => !categoryIds.includes(id)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...categoryIds])]);
    }
  };

  const handleConfirm = () => {
    if (action === 'template' && selectedTemplate) {
      // Grupo da BD — enviar lista de IDs directamente
      const bdGroup = bdGroups.find(g => g.name === selectedTemplate);
      if (bdGroup) {
        onConfirm({ permissions: bdGroup.permission_ids });
        return;
      }
      // Template hardcoded — enviar nome para o caller resolver
      onConfirm({ templateName: selectedTemplate });
    } else {
      onConfirm({ permissions: selectedPermissions });
    }
  };

  const getDialogTitle = () => {
    switch (action) {
      case 'add':
        return `Adicionar Permissões a ${selectedUsers.length} Utilizador(es)`;
      case 'remove':
        return `Remover Permissões de ${selectedUsers.length} Utilizador(es)`;
      case 'template':
        return `Aplicar Template a ${selectedUsers.length} Utilizador(es)`;
      default:
        return 'Gerir Permissões em Massa';
    }
  };

  const getDialogDescription = () => {
    switch (action) {
      case 'add':
        return 'Selecione as permissões que deseja adicionar a todos os utilizadores selecionados.';
      case 'remove':
        return 'Selecione as permissões que deseja remover de todos os utilizadores selecionados.';
      case 'template':
        return 'Selecione um template para aplicar a todos os utilizadores selecionados.';
      default:
        return '';
    }
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
          <GroupAddIcon />
          <Typography variant="h6">{getDialogTitle()}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="info" sx={{ mb: 2 }} icon={isMobile ? false : undefined}>
          <Typography variant={isMobile ? "body2" : "body1"}>
            {getDialogDescription()}
          </Typography>
        </Alert>

        {action === 'template' ? (
          <Box>
            {/* ── Grupos da BD ─────────────────────────────────── */}
            {groupsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : bdGroups.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <GroupWorkIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2" fontWeight={700} color="primary">
                    Grupos Predefinidos
                  </Typography>
                </Box>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                  {bdGroups.map(group => (
                    <Grid size={{ xs: 12, sm: 6 }} key={group.name}>
                      <Box
                        onClick={() => setSelectedTemplate(group.name)}
                        sx={{
                          p: 1.5,
                          border: '2px solid',
                          borderColor: selectedTemplate === group.name ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          cursor: 'pointer',
                          bgcolor: selectedTemplate === group.name ? 'primary.lighter' : 'background.paper',
                          transition: 'all 0.15s',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700}>
                          {group.name}
                        </Typography>
                        <Chip
                          label={`${group.permission_count} permissões`}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ mt: 0.5, height: 20, fontSize: '0.68rem' }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
                <Divider sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">Templates Base</Typography>
                </Divider>
              </>
            )}

            {/* ── Templates hardcoded ───────────────────────────── */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <TemplateIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                Templates de Sistema
              </Typography>
            </Box>
            <Grid container spacing={1.5}>
              {Object.entries(PERMISSION_TEMPLATES).map(([name, template]) => (
                <Grid size={{ xs: 12, sm: 6 }} key={name}>
                  <Box
                    onClick={() => setSelectedTemplate(name)}
                    sx={{
                      p: 1.5,
                      border: '2px solid',
                      borderColor: selectedTemplate === name ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      cursor: 'pointer',
                      bgcolor: selectedTemplate === name ? 'primary.lighter' : 'background.paper',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                      {template.description}
                    </Typography>
                    <Chip
                      label={`${template.permissions.length} permissões`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.68rem' }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          /* Permissions Selection */
          <Box>
            {Object.entries(groupedPermissions).map(([category, permissions]) => {
              const categoryIds = permissions.map(p => p.pk);
              const allSelected = categoryIds.every(id =>
                selectedPermissions.includes(id)
              );
              const someSelected = categoryIds.some(id =>
                selectedPermissions.includes(id)
              );

              return (
                <Accordion
                  key={category}
                  defaultExpanded={Object.keys(groupedPermissions).length <= 3}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}
                    >
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected && !allSelected}
                        onChange={() => handleCategoryToggle(permissions)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Typography variant="subtitle1" fontWeight="bold">
                        {category}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({permissions.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {permissions.map(perm => (
                        <FormControlLabel
                          key={perm.pk}
                          control={
                            <Checkbox
                              checked={selectedPermissions.includes(perm.pk)}
                              onChange={() => handlePermissionToggle(perm.pk)}
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {perm.label || perm.value} ({perm.pk})
                            </Typography>
                          }
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={
            action === 'template'
              ? !selectedTemplate
              : selectedPermissions.length === 0
          }
        >
          {action === 'add' && 'Adicionar'}
          {action === 'remove' && 'Remover'}
          {action === 'template' && 'Aplicar Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkPermissionsDialog;
