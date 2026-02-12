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
  Alert,
  Stack,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { useInterfaces } from '@/core/contexts/MetadataContext';
import { updateUserPermissions } from '@/services/userService';
import { notification } from '@/core/services/notification';
import { PERMISSION_GROUPS, PERMISSIONS } from '@/core/config/permissionMap';
import { Loading } from '@/shared/components/feedback';

export const UserPermissionsEditor = ({ userId, currentPermissions = [], onSave }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { interfaces, isLoading } = useInterfaces();
  
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [expanded, setExpanded] = useState(false); // Controlled accordion state

  // Inicializar permissões selecionadas
  useEffect(() => {
    if (currentPermissions) {
      // Garantir que são números
      const permissionIds = currentPermissions.map(Number);
      setSelectedPermissions(new Set(permissionIds));
    }
  }, [currentPermissions]);

  // Agrupar permissões por categoria
  const groupedPermissions = useMemo(() => {
    return interfaces.reduce((acc, permission) => {
      const category = permission.category || 'Outros';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});
  }, [interfaces]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const total = interfaces.length;
    const selected = selectedPermissions.size;
    const progress = total > 0 ? (selected / total) * 100 : 0;
    return { total, selected, progress };
  }, [interfaces.length, selectedPermissions.size]);

  // Handlers
  const handleTogglePermission = (permissionId) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleToggleCategory = (categoryPermissions) => {
    const newSelected = new Set(selectedPermissions);
    const allSelected = categoryPermissions.every(p => newSelected.has(p.pk));

    if (allSelected) {
      // Remove todas da categoria
      categoryPermissions.forEach(p => newSelected.delete(p.pk));
    } else {
      // Adiciona todas da categoria
      categoryPermissions.forEach(p => newSelected.add(p.pk));
    }
    setSelectedPermissions(newSelected);
  };

  const handleApplyGroup = (groupName, groupPermissions) => {
    // Confirmar se quer substituir ou adicionar? Por enquanto, substitui para ser "perfil"
    if (window.confirm(`Tem certeza que deseja aplicar o perfil "${groupName}"? Isso irá redefinir as permissões atuais.`)) {
      setSelectedPermissions(new Set(groupPermissions));
      notification.success(`Perfil "${groupName}" aplicado! Clique em Guardar para confirmar.`);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const permissionsArray = Array.from(selectedPermissions);
      await updateUserPermissions(userId, permissionsArray);
      notification.success('Permissões atualizadas com sucesso');
      if (onSave) onSave(permissionsArray);
    } catch (error) {
      notification.error(error.message || 'Erro ao guardar permissões');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (isLoading) return <Loading />;

  return (
    <Box>
      {/* Header com Stats e Ações */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight="bold" color="primary.main">
              Gestão de Permissões
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.selected} de {stats.total} permissões ativas
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
            sx={{ minWidth: 150 }}
          >
            {isSaving ? 'A guardar...' : 'Guardar Alterações'}
          </Button>
        </Stack>
      </Paper>

      {/* Quick Actions - Perfis */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold" color="text.secondary">
          APLICAR PERFIL RÁPIDO
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          {Object.entries(PERMISSION_GROUPS).map(([name, permissions]) => (
            <Chip
              key={name}
              icon={<GroupIcon />}
              label={name.replace('_', ' ')}
              onClick={() => handleApplyGroup(name, permissions)}
              variant="outlined"
              color="primary"
              clickable
              sx={{ m: '0 !important' }} 
            />
          ))}
        </Stack>
      </Box>

      {/* Lista de Permissões por Categoria */}
      <Box>
        {Object.entries(groupedPermissions).map(([category, permissions], index) => {
          const selectedCount = permissions.filter(p => selectedPermissions.has(p.pk)).length;
          const isAllSelected = selectedCount === permissions.length;
          const isIndeterminate = selectedCount > 0 && selectedCount < permissions.length;
          const panelId = `panel-${index}`;

          return (
            <Accordion 
              key={category} 
              expanded={expanded === panelId} 
              onChange={handleAccordionChange(panelId)}
              disableGutters
              sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                  <Typography sx={{ width: '40%', flexShrink: 0, fontWeight: 'medium' }}>
                    {category.toUpperCase()}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary', flexGrow: 1 }}>
                    {selectedCount} / {permissions.length} selecionadas
                  </Typography>
                  {/* Select All Checkbox for Category */}
                  <Tooltip title={isAllSelected ? "Desmarcar todas" : "Marcar todas"}>
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCategory(permissions);
                      }}
                      size="small"
                    />
                  </Tooltip>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: 'background.default', borderTop: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                  {permissions.map((permission) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={permission.pk}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selectedPermissions.has(permission.pk)}
                            onChange={() => handleTogglePermission(permission.pk)}
                            name={String(permission.pk)}
                            size="small"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {permission.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {permission.description || permission.label}
                            </Typography>
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
    </Box>
  );
};
