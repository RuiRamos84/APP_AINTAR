import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Dialog, Accordion, AccordionSummary, AccordionDetails,
  DialogActions, DialogContent, DialogTitle, FormGroup,
  FormControlLabel, Checkbox, Grid, Chip, CircularProgress,
  Alert, Tabs, Tab, Card, CardContent, List, ListItem,
  ListItemText, TextField, FormControl, InputLabel,
  Select, MenuItem, TableSortLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { notifySuccess, notifyError } from '../../components/common/Toaster/ThemedToaster';
import { PROFILE_LABELS, getProfileColor } from '../../config/profileSystem';

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
      setSelectedInterfaces([...selectedInterfaces, interfaceId]);
    } else {
      setSelectedInterfaces(selectedInterfaces.filter(id => id !== interfaceId));
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/user/users/${selectedUser.pk}/interfaces`, {
        interfaces: selectedInterfaces
      });

      setUsers(users.map(user =>
        user.pk === selectedUser.pk
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
        String(user.pk).includes(lowercasedQuery)
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
    const groups = interfaces.reduce((acc, item) => {
      const category = item.name.split('.')[0] || 'outros';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});
    // Ordenar categorias alfabeticamente
    return Object.keys(groups).sort().reduce(
      (obj, key) => {
        // Ordenar items dentro de cada grupo
        obj[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name));
        return obj;
      }, {}
    );
  }, [interfaces]);

  const handleGroupChange = (groupItems, checked) => {
    const groupIds = groupItems.map(item => item.pk);
    if (checked) {
      // Adicionar apenas os IDs que não estão já selecionados
      const newInterfaces = [...new Set([...selectedInterfaces, ...groupIds])];
      setSelectedInterfaces(newInterfaces);
    } else {
      setSelectedInterfaces(selectedInterfaces.filter(id => !groupIds.includes(id)));
    }
  };

  const renderGeneralPermissions = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
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
            <TableRow key={user.pk}>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ID: {user.pk} • {user.username}
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
                  {(user.interface || []).map(intId => {
                    const int = interfaces.find(i => i.pk === intId);
                    return int ? (
                      <Chip key={intId} label={int.name} size="small" variant="outlined" />
                    ) : null;
                  })}
                  {(!user.interface || user.interface.length === 0) && (
                    <Typography variant="caption" color="text.secondary">
                      Sem interfaces
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
  );

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
                Utilizadores com permissão para ver e aprovar pagamentos manuais (admin.payments - ID 30).
              </Typography>
              <List dense>
                {users.filter(u => u.interface?.includes(30)).map(user => (
                  <ListItem key={user.pk}>
                    <ListItemText
                      primary={user.name}
                      secondary={`ID: ${user.pk}`}
                    />
                    <Chip label="Admin Pagamentos" color="primary" size="small" />
                  </ListItem>
                ))}
                {users.filter(u => u.interface?.includes(30)).length === 0 && (
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
                Utilizadores com permissão para processar pagamentos em numerário (payments.cash.action - ID 730).
              </Typography>
              <List dense>
                {users.filter(u => u.interface?.includes(730)).map(user => (
                  <ListItem key={user.pk}>
                    <ListItemText
                      primary={user.name}
                      secondary={`ID: ${user.pk}`}
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
                      const isPaymentAdmin = userInterfaces.includes(30); // admin.payments
                      const canProcessCash = userInterfaces.includes(730); // payments.cash.action
                      const canUseMbway = userInterfaces.includes(700); // payments.mbway
                      const canUseMunicipality = userInterfaces.includes(740); // payments.municipality
                      return (
                        <TableRow key={user.pk}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {user.pk}
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

      {/* Dialog Edição */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle>
          Editar Interfaces - {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Interfaces controlam acesso a funcionalidades específicas.
              Agrupadas por categoria para facilitar a gestão.
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
              const filteredItems = items.filter(item =>
                item.name.toLowerCase().includes(modalSearch.toLowerCase())
              );

              if (filteredItems.length === 0) return null;

              const allSelected = filteredItems.every(item => selectedInterfaces.includes(item.pk));
              const someSelected = filteredItems.some(item => selectedInterfaces.includes(item.pk));

              return (
                <Accordion key={category} defaultExpanded={!!modalSearch}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={allSelected}
                          indeterminate={someSelected && !allSelected}
                          onClick={(e) => e.stopPropagation()} // Evita que o clique no checkbox expanda/recolha o accordion
                          onChange={(e) => handleGroupChange(filteredItems, e.target.checked)}
                        />
                      }
                      label={<Typography sx={{ fontWeight: 500, textTransform: 'capitalize' }}>{category}</Typography>}
                    />
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup sx={{ pl: 2 }}>
                      {filteredItems.map(item => (
                        <FormControlLabel
                          key={item.pk}
                          control={
                            <Checkbox
                              checked={selectedInterfaces.includes(item.pk)}
                              onChange={(e) => handleInterfaceChange(item.pk, e.target.checked)}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {item.name} <Typography variant="caption" color="text.secondary">(ID: {item.pk})</Typography>
                            </Typography>
                          }
                        />
                      ))}
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

export default UserManagement;