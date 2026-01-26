import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Dialog, Accordion, AccordionSummary, AccordionDetails,
  DialogActions, DialogContent, DialogTitle, FormGroup,
  FormControlLabel, Checkbox, Grid, Chip, CircularProgress,
  Alert, Tabs, Tab, Card, CardContent, List, ListItem,
  ListItemText, TextField, FormControl, InputLabel,
  Select, MenuItem, TableSortLabel, Tooltip, Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { notifySuccess, notifyError, notifyInfo, notifyWarning } from '../../components/common/Toaster/ThemedToaster';
import { PROFILE_LABELS, getProfileColor } from '../../config/profileSystem';
import {
  PERMISSION_IDS,
  PERMISSION_METADATA,
  PERMISSION_TEMPLATES,
  getPermissionMetadata,
  groupPermissionsByCategory,
  getPermissionDependencies,
  resolvePermissionDependencies,
  getPermissionDependents,
  getPermissionChanges
} from '../../config/permissionConfig';
import permissionMetadataService from '../../services/permissionMetadataService';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedInterfaces, setSelectedInterfaces] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [tab, setTab] = useState(0);
  const [modalSearch, setModalSearch] = useState('');

  // ============ BULK SELECTION ============
  const [selectedUsers, setSelectedUsers] = useState([]); // Array de user IDs
  const [openBulkDialog, setOpenBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState(''); // 'add', 'remove', 'template'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, interfacesRes] = await Promise.all([
        api.get('/user/users'),
        api.get('/user/interfaces')
      ]);
      setUsers(usersRes.data);
      setInterfaces(interfacesRes.data);

      // ✅ CARREGAR METADADOS NO CACHE GLOBAL
      permissionMetadataService.loadMetadata(interfacesRes.data);
      console.log('[UserManagement] Metadados carregados:', permissionMetadataService.getStats());
    } catch (error) {
      notifyError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user) => {
    setSelectedUser(user);
    setSelectedInterfaces(user.interface || []);
    setOpenDialog(true);
    setModalSearch(''); // Limpar pesquisa ao abrir
  };

  const handleInterfaceChange = (interfaceId, checked) => {
    if (checked) {
      // ============================================================
      // ADICIONAR PERMISSÃO + DEPENDÊNCIAS (CASCATA PARA CIMA)
      // ============================================================
      const dependencies = getPermissionDependencies(interfaceId);
      const missingDeps = dependencies.filter(dep => !selectedInterfaces.includes(dep));

      if (missingDeps.length > 0) {
        // Notificar sobre cada dependência adicionada
        const depsText = missingDeps.map(dep => `"${getPermissionMetadata(dep).label}"`).join(', ');
        notifyInfo(`✅ Dependências adicionadas automaticamente: ${depsText}`, { autoClose: 4000 });
      }

      // Adicionar permissão + dependências sem duplicados
      const newInterfaces = [...new Set([...selectedInterfaces, interfaceId, ...missingDeps])];
      setSelectedInterfaces(newInterfaces);

    } else {
      // ============================================================
      // REMOVER PERMISSÃO + DEPENDENTES (CASCATA PARA BAIXO)
      // ============================================================

      // Encontrar todas as permissões que dependem desta
      const directDependents = getPermissionDependents(interfaceId, selectedInterfaces);

      if (directDependents.length > 0) {
        // Construir lista completa de remoções (incluindo dependentes dos dependentes)
        const toRemove = new Set([interfaceId]);
        const queue = [...directDependents];

        while (queue.length > 0) {
          const current = queue.shift();
          if (!toRemove.has(current)) {
            toRemove.add(current);
            // Adicionar dependentes deste à fila
            const moreDependents = getPermissionDependents(current, selectedInterfaces);
            queue.push(...moreDependents);
          }
        }

        // Notificar sobre remoção em cascata
        const removedList = Array.from(toRemove)
          .filter(id => id !== interfaceId)
          .map(id => `"${getPermissionMetadata(id).label}"`)
          .join(', ');

        if (removedList) {
          notifyWarning(`⚠️ Também a remover permissões dependentes: ${removedList}`, { autoClose: 5000 });
        }

        // Remover todas de uma vez
        setSelectedInterfaces(
          selectedInterfaces.filter(id => !toRemove.has(id))
        );
      } else {
        // Sem dependentes, remover apenas esta
        setSelectedInterfaces(selectedInterfaces.filter(id => id !== interfaceId));
      }
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/user/users/${selectedUser.user_id}/interfaces`, {
        interfaces: selectedInterfaces
      });

      setUsers(users.map(user =>
        user.user_id === selectedUser.user_id
          ? { ...user, interface: selectedInterfaces }
          : user
      ));

      notifySuccess('Permissões actualizadas');

      // Remove o foco de qualquer elemento focado antes de fechar o modal
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }

      // Pequeno delay para garantir que o foco é removido antes de fechar
      setTimeout(() => {
        setOpenDialog(false);
      }, 50);
    } catch (error) {
      notifyError('Erro ao actualizar');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Filtragem
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(lowercasedQuery) ||
        user.username.toLowerCase().includes(lowercasedQuery) ||
        String(user.user_id).includes(lowercasedQuery)
      );
    }

    if (profileFilter) {
      filtered = filtered.filter(user => String(user.profil) === String(profileFilter));
    }

    // Ordenação
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [users, searchQuery, profileFilter, sortConfig]);

  const groupedInterfaces = useMemo(() => {
    if (!interfaces) return {};
    // Usar a função do permissionConfig para agrupar com metadados
    return groupPermissionsByCategory(interfaces);
  }, [interfaces]);

  const handleGroupChange = (groupItems, checked) => {
    const groupIds = groupItems.map(item => item.pk || item.id);
    if (checked) {
      // Adicionar apenas os IDs que não estão já selecionados e resolver dependências
      const resolved = resolvePermissionDependencies([...selectedInterfaces, ...groupIds]);
      setSelectedInterfaces(resolved);
    } else {
      setSelectedInterfaces(selectedInterfaces.filter(id => !groupIds.includes(id)));
    }
  };

  const handleTemplateApply = (templateName) => {
    const template = PERMISSION_TEMPLATES[templateName];
    if (template) {
      const resolved = resolvePermissionDependencies([...selectedInterfaces, ...template.permissions]);
      setSelectedInterfaces(resolved);
      notifySuccess(`Template "${templateName}" aplicado`);
    }
  };

  const changeSummary = useMemo(() => {
    if (!selectedUser) return { added: [], removed: [], hasChanges: false };
    return getPermissionChanges(selectedUser.interface || [], selectedInterfaces);
  }, [selectedUser, selectedInterfaces]);

  // ============================================================
  // BULK SELECTION HANDLERS
  // ============================================================

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredAndSortedUsers.map(u => u.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkAddPermission = () => {
    setBulkAction('add');
    setOpenBulkDialog(true);
  };

  const handleBulkRemovePermission = () => {
    setBulkAction('remove');
    setOpenBulkDialog(true);
  };

  const handleBulkApplyTemplate = () => {
    setBulkAction('template');
    setOpenBulkDialog(true);
  };

  const handleBulkActionSubmit = async (permissionsToAdd = [], permissionsToRemove = [], templateName = null) => {
    try {
      const promises = selectedUsers.map(userId => {
        const user = users.find(u => u.user_id === userId);
        if (!user) return null;

        let newInterfaces = [...(user.interface || [])];

        if (bulkAction === 'add') {
          // Adicionar permissões
          const resolved = resolvePermissionDependencies([...newInterfaces, ...permissionsToAdd]);
          newInterfaces = resolved;
        } else if (bulkAction === 'remove') {
          // Remover permissões
          newInterfaces = newInterfaces.filter(id => !permissionsToRemove.includes(id));
        } else if (bulkAction === 'template' && templateName) {
          // Aplicar template
          const template = PERMISSION_TEMPLATES[templateName];
          if (template) {
            const resolved = resolvePermissionDependencies([...newInterfaces, ...template.permissions]);
            newInterfaces = resolved;
          }
        }

        return api.put(`/user/users/${userId}/interfaces`, { interfaces: newInterfaces });
      });

      await Promise.all(promises.filter(p => p !== null));

      // Recarregar dados
      await loadData();

      notifySuccess(`Permissões atualizadas para ${selectedUsers.length} utilizador(es)`);
      setOpenBulkDialog(false);
      setSelectedUsers([]);
    } catch (error) {
      notifyError('Erro ao atualizar permissões em massa');
      console.error(error);
    }
  };

  const renderGeneralPermissions = () => {
    const allSelected = selectedUsers.length === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0;
    const someSelected = selectedUsers.length > 0 && selectedUsers.length < filteredAndSortedUsers.length;

    return (
      <>
        {/* Bulk Actions Toolbar */}
        {selectedUsers.length > 0 && (
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" fontWeight={600}>
                {selectedUsers.length} utilizador(es) selecionado(s)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleBulkAddPermission}
                  startIcon={<EditIcon />}
                >
                  Adicionar Permissão
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleBulkApplyTemplate}
                  startIcon={<SecurityIcon />}
                >
                  Aplicar Template
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleBulkRemovePermission}
                  startIcon={<ClearIcon />}
                  sx={{ bgcolor: 'white' }}
                >
                  Remover Permissão
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setSelectedUsers([])}
                  sx={{ color: 'white' }}
                >
                  Limpar Seleção
                </Button>
              </Box>
            </Box>
          </Paper>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell sortDirection={sortConfig.key === 'name' ? sortConfig.direction : false}>
                  <TableSortLabel
                    active={sortConfig.key === 'name'}
                    direction={sortConfig.key === 'name' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('name')}
                  >
                    Utilizador
                  </TableSortLabel>
                </TableCell>
            <TableCell sortDirection={sortConfig.key === 'profil' ? sortConfig.direction : false}>
              <TableSortLabel
                active={sortConfig.key === 'profil'}
                direction={sortConfig.key === 'profil' ? sortConfig.direction : 'asc'}
                onClick={() => handleSort('profil')}
              >
                Perfil
              </TableSortLabel>
            </TableCell>
            <TableCell>Interfaces</TableCell>
            <TableCell>Acções</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAndSortedUsers.map(user => (
            <TableRow key={user.user_id} hover selected={selectedUsers.includes(user.user_id)}>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedUsers.includes(user.user_id)}
                  onChange={() => handleSelectUser(user.user_id)}
                />
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {user.user_id} • {user.username}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={PROFILE_LABELS[user.profil] || `Perfil ${user.profil}`}
                  color={getProfileColor(user.profil)}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(user.interface || []).slice(0, 3).map(intId => {
                    const metadata = getPermissionMetadata(intId);
                    return (
                      <Tooltip key={intId} title={metadata.description}>
                        <Chip label={metadata.label} size="small" variant="outlined" />
                      </Tooltip>
                    );
                  })}
                  {(user.interface || []).length > 3 && (
                    <Chip
                      label={`+${user.interface.length - 3} mais`}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                  {(!user.interface || user.interface.length === 0) && (
                    <Typography variant="caption" color="text.secondary">
                      Sem permissões
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Button
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenDialog(user)}
                  size="small"
                >
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </>
  );
};

  const renderPaymentPermissions = () => (
    <Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Permissões de Pagamento:</strong> Baseadas no perfil do utilizador e IDs específicos.
          Para alterar, editar directamente no backend.
        </Typography>
      </Alert>

      <Grid container spacing={2}>
        {/* Gestão de Pagamentos */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentIcon />
                Gestão de Pagamentos
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Utilizadores com permissão para ver e aprovar pagamentos manuais ({getPermissionMetadata(PERMISSION_IDS.ADMIN_PAYMENTS).label} - ID {PERMISSION_IDS.ADMIN_PAYMENTS}).
              </Typography>
              <List dense>
                {users.filter(u => u.interface?.includes(PERMISSION_IDS.ADMIN_PAYMENTS)).map(user => (
                  <ListItem key={user.user_id}>
                    <ListItemText
                      primary={user.name}
                      secondary={`ID: ${user.user_id}`}
                    />
                    <Chip label="Admin Pagamentos" color="primary" size="small" />
                  </ListItem>
                ))}
                {users.filter(u => u.interface?.includes(PERMISSION_IDS.ADMIN_PAYMENTS)).length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="Nenhum utilizador configurado"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Numerário */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon />
                Pagamentos Numerário
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Utilizadores com permissão para processar pagamentos em numerário ({getPermissionMetadata(PERMISSION_IDS.PAYMENTS_CASH_ACTION).label} - ID {PERMISSION_IDS.PAYMENTS_CASH_ACTION}).
              </Typography>
              <List dense>
                {users.filter(u => u.interface?.includes(PERMISSION_IDS.PAYMENTS_CASH_ACTION)).map(user => (
                  <ListItem key={user.user_id}>
                    <ListItemText
                      primary={user.name}
                      secondary={`ID: ${user.user_id}`}
                    />
                    <Chip label="Numerário" color="success" size="small" />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Permissões por Perfil */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Permissões por Utilizador
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Utilizador</TableCell>
                      <TableCell>Perfil</TableCell>
                      <TableCell>Métodos Disponíveis</TableCell>
                      <TableCell>Permissões Especiais</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedUsers.map(user => {
                      const userInterfaces = user.interface || [];
                      const isPaymentAdmin = userInterfaces.includes(PERMISSION_IDS.ADMIN_PAYMENTS);
                      const canProcessCash = userInterfaces.includes(PERMISSION_IDS.PAYMENTS_CASH_ACTION);
                      const canUseMbway = userInterfaces.includes(PERMISSION_IDS.PAYMENTS_MBWAY);
                      const canUseMunicipality = userInterfaces.includes(PERMISSION_IDS.PAYMENTS_MUNICIPALITY);
                      return (
                        <TableRow key={user.user_id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {user.user_id}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={PROFILE_LABELS[user.profil] || `Perfil ${user.profil}`}
                              color={getProfileColor(user.profil)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {/* MB WAY, Multibanco, Transferência */}
                              {canUseMbway && (
                                <>
                                  <Chip label="MB WAY" size="small" variant="outlined" />
                                  <Chip label="Multibanco" size="small" variant="outlined" />
                                  <Chip label="Transferência" size="small" variant="outlined" />
                                </>
                              )}
                              {/* Numerário */}
                              {canProcessCash && (
                                <Chip
                                  label="Numerário"
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                />
                              )}
                              {/* Municípios */}
                              {canUseMunicipality && (
                                <Chip label="Municípios" size="small" variant="outlined" />
                              )}

                              {!canUseMbway && !canProcessCash && !canUseMunicipality && (
                                <Typography variant="caption" color="text.secondary">
                                  Sem métodos
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {isPaymentAdmin && (
                                <Chip label="Admin Pagamentos" color="primary" size="small" />
                              )}
                              {canProcessCash && (
                                <Chip label="Proc. Numerário" color="success" size="small" />
                              )}
                              {user.profil === '0' && (
                                <Chip label="Super Admin" color="error" size="small" />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestão de Permissões
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Pesquisar por nome, username ou ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Filtrar por Perfil</InputLabel>
              <Select
                value={profileFilter}
                label="Filtrar por Perfil"
                onChange={(e) => setProfileFilter(e.target.value)}
              >
                <MenuItem value="">Todos os Perfis</MenuItem>
                {Object.entries(PROFILE_LABELS).map(([id, label]) => (
                  <MenuItem key={id} value={id}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { setSearchQuery(''); setProfileFilter(''); }}
              startIcon={<ClearIcon />}
            >
              Limpar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Interfaces Gerais" />
          <Tab label="Permissões Pagamento" />
        </Tabs>
      </Paper>

      {tab === 0 && renderGeneralPermissions()}
      {tab === 1 && renderPaymentPermissions()}

      {/* Dialog Ações em Massa */}
      <BulkActionsDialog
        open={openBulkDialog}
        onClose={() => setOpenBulkDialog(false)}
        action={bulkAction}
        selectedCount={selectedUsers.length}
        interfaces={interfaces}
        onSubmit={handleBulkActionSubmit}
      />

      {/* Dialog Edição Individual */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle>
          <Box>
            <Typography variant="h6">Editar Permissões - {selectedUser?.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {selectedInterfaces.length} permissões selecionadas
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Preview de Mudanças */}
          {changeSummary.hasChanges && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                Alterações pendentes:
              </Typography>
              {changeSummary.addedCount > 0 && (
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  ➕ {changeSummary.addedCount} permissões a adicionar
                </Typography>
              )}
              {changeSummary.removedCount > 0 && (
                <Typography variant="caption" display="block">
                  ➖ {changeSummary.removedCount} permissões a remover
                </Typography>
              )}
            </Alert>
          )}

          {/* Templates Rápidos */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Templates rápidos:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(PERMISSION_TEMPLATES).map(([name, template]) => (
                <Tooltip key={name} title={template.description}>
                  <Chip
                    label={name}
                    onClick={() => handleTemplateApply(name)}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </Tooltip>
              ))}
            </Box>
            <Divider sx={{ mt: 2 }} />
          </Box>

          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
            <Typography variant="body2">
              Permissões controlam acesso a funcionalidades. Dependências são adicionadas automaticamente.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            size="small"
            placeholder="Pesquisar permissão..."
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            autoComplete="off"
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {Object.entries(groupedInterfaces).map(([category, items]) => {
              const filteredItems = items.filter(item => {
                // Passar o objeto completo para usar dados da BD
                const metadata = getPermissionMetadata(item.pk || item.id, item);
                const searchLower = modalSearch.toLowerCase();
                return (
                  metadata.label.toLowerCase().includes(searchLower) ||
                  metadata.description.toLowerCase().includes(searchLower) ||
                  metadata.key.toLowerCase().includes(searchLower)
                );
              });

              if (filteredItems.length === 0) return null;

              const allSelected = filteredItems.every(item => selectedInterfaces.includes(item.pk || item.id));
              const someSelected = filteredItems.some(item => selectedInterfaces.includes(item.pk || item.id));

              return (
                <Accordion key={category} defaultExpanded={!!modalSearch}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleGroupChange(filteredItems, e.target.checked)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontWeight: 600 }}>{category}</Typography>
                          <Chip
                            label={`${filteredItems.filter(i => selectedInterfaces.includes(i.pk || i.id)).length}/${filteredItems.length}`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup sx={{ pl: 2 }}>
                      {filteredItems.map(item => {
                        // Passar o objeto completo para usar dados da BD
                        const metadata = getPermissionMetadata(item.pk || item.id, item);
                        const permId = item.pk || item.id;
                        const hasDependencies = (metadata.requires || []).length > 0;

                        return (
                          <FormControlLabel
                            key={permId}
                            control={
                              <Checkbox
                                checked={selectedInterfaces.includes(permId)}
                                onChange={(e) => handleInterfaceChange(permId, e.target.checked)}
                              />
                            }
                            label={
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight={500}>
                                    {metadata.label}
                                  </Typography>
                                  {metadata.isCritical && (
                                    <Chip label="Crítica" size="small" color="error" sx={{ height: 18 }} />
                                  )}
                                  {metadata.isSensitive && (
                                    <Chip label="Sensível" size="small" color="warning" sx={{ height: 18 }} />
                                  )}
                                  {hasDependencies && (
                                    <Tooltip title="Tem dependências">
                                      <InfoIcon fontSize="small" color="info" />
                                    </Tooltip>
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {metadata.description}
                                </Typography>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                                  {metadata.key} • ID: {permId}
                                </Typography>
                              </Box>
                            }
                          />
                        );
                      })}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ============================================================================
// COMPONENTE: Bulk Actions Dialog
// ============================================================================

const BulkActionsDialog = ({ open, onClose, action, selectedCount, interfaces, onSubmit }) => {
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const handlePermissionToggle = (permId) => {
    setSelectedPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  const handleSubmit = () => {
    if (action === 'add') {
      onSubmit(selectedPermissions, [], null);
    } else if (action === 'remove') {
      onSubmit([], selectedPermissions, null);
    } else if (action === 'template') {
      onSubmit([], [], selectedTemplate);
    }
    setSelectedPermissions([]);
    setSelectedTemplate('');
  };

  const groupedInterfaces = useMemo(() => {
    return groupPermissionsByCategory(interfaces);
  }, [interfaces]);

  const getDialogTitle = () => {
    if (action === 'add') return `Adicionar Permissão a ${selectedCount} Utilizador(es)`;
    if (action === 'remove') return `Remover Permissão de ${selectedCount} Utilizador(es)`;
    if (action === 'template') return `Aplicar Template a ${selectedCount} Utilizador(es)`;
    return 'Ação em Massa';
  };

  const getDialogDescription = () => {
    if (action === 'add') return 'As permissões selecionadas serão adicionadas a todos os utilizadores selecionados (com dependências).';
    if (action === 'remove') return 'As permissões selecionadas serão removidas de todos os utilizadores selecionados.';
    if (action === 'template') return 'O template selecionado será aplicado a todos os utilizadores (adicionando às permissões existentes).';
    return '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{getDialogTitle()}</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {getDialogDescription()}
          </Typography>
        </Alert>

        {action === 'template' ? (
          // Seleção de Template
          <Box>
            <FormControl fullWidth>
              <InputLabel>Selecionar Template</InputLabel>
              <Select
                value={selectedTemplate}
                label="Selecionar Template"
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                {Object.entries(PERMISSION_TEMPLATES).map(([name, template]) => (
                  <MenuItem key={name} value={name}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {template.description} • {template.permissions.length} permissões
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedTemplate && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Permissões incluídas neste template:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                  {PERMISSION_TEMPLATES[selectedTemplate].permissions.map(permId => {
                    const metadata = getPermissionMetadata(permId);
                    return (
                      <Chip key={permId} label={metadata.label} size="small" />
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          // Seleção de Permissões Individuais
          <Box sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {Object.entries(groupedInterfaces).map(([category, items]) => (
              <Accordion key={category}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 600 }}>{category}</Typography>
                  <Chip
                    label={`${items.filter(i => selectedPermissions.includes(i.pk || i.id)).length}/${items.length}`}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <FormGroup>
                    {items.map(item => {
                      const metadata = getPermissionMetadata(item.pk || item.id, item);
                      return (
                        <FormControlLabel
                          key={item.pk || item.id}
                          control={
                            <Checkbox
                              checked={selectedPermissions.includes(item.pk || item.id)}
                              onChange={() => handlePermissionToggle(item.pk || item.id)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{metadata.label}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {metadata.description}
                              </Typography>
                            </Box>
                          }
                        />
                      );
                    })}
                  </FormGroup>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            (action !== 'template' && selectedPermissions.length === 0) ||
            (action === 'template' && !selectedTemplate)
          }
        >
          {action === 'add' ? 'Adicionar' : action === 'remove' ? 'Remover' : 'Aplicar Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserManagement;