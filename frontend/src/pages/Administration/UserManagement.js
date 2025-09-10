import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Dialog,
  DialogActions, DialogContent, DialogTitle, FormGroup,
  FormControlLabel, Checkbox, Grid, Chip, CircularProgress,
  Alert, Tabs, Tab, Card, CardContent, Switch, List, ListItem,
  ListItemText, ListItemSecondaryAction, Divider
} from '@mui/material';
import {
  Edit as EditIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { notifySuccess, notifyError } from '../../components/common/Toaster/ThemedToaster';
import { PROFILE_LABELS, getProfileColor } from '../../config/profileSystem';


const PAYMENT_ADMIN_IDS = [12]; // Sincronizado com backend
const CASH_PROCESSOR_IDS = [12, 15];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedInterfaces, setSelectedInterfaces] = useState([]);
  const [tab, setTab] = useState(0);

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
      setOpenDialog(false);
    } catch (error) {
      notifyError('Erro ao actualizar');
    }
  };

  const getPaymentPermissions = (user) => {
    const permissions = [];

    // Admin completo
    if (user.profil === '0') {
      permissions.push('Admin Geral');
    }

    // Gestão pagamentos
    if (PAYMENT_ADMIN_IDS.includes(user.pk)) {
      permissions.push('Gestão Pagamentos');
    }

    // Processar CASH
    if (CASH_PROCESSOR_IDS.includes(user.pk)) {
      permissions.push('Numerário');
    }

    // Métodos por perfil
    if (['0', '1', '2', '3'].includes(user.profil)) {
      permissions.push('MB WAY, Multibanco, Transferência');
    }

    if (['0', '2'].includes(user.profil)) {
      permissions.push('Municípios');
    }

    return permissions;
  };

  const renderGeneralPermissions = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Utilizador</TableCell>
            <TableCell>Perfil</TableCell>
            <TableCell>Interfaces</TableCell>
            <TableCell>Acções</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map(user => (
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
                  label={user.profil === '0' ? 'Admin' : `Perfil ${user.profil}`}
                  color={user.profil === '0' ? 'error' : 'default'}
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
                Utilizadores que podem ver e aprovar todos os pagamentos.
              </Typography>
              <List dense>
                {users.filter(u => PAYMENT_ADMIN_IDS.includes(u.pk)).map(user => (
                  <ListItem key={user.pk}>
                    <ListItemText
                      primary={user.name}
                      secondary={`ID: ${user.pk}`}
                    />
                    <Chip label="Admin Pagamentos" color="primary" size="small" />
                  </ListItem>
                ))}
                {users.filter(u => PAYMENT_ADMIN_IDS.includes(u.pk)).length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary="Nenhum utilizador configurado"
                      secondary="IDs permitidos: [12]"
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
                Utilizadores que podem processar pagamentos em dinheiro.
              </Typography>
              <List dense>
                {users.filter(u => CASH_PROCESSOR_IDS.includes(u.pk)).map(user => (
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
                    {users.map(user => {
                      const permissions = getPaymentPermissions(user);
                      const isPaymentAdmin = PAYMENT_ADMIN_IDS.includes(user.pk);
                      const canProcessCash = CASH_PROCESSOR_IDS.includes(user.pk);

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
                              {['0', '1', '2', '3'].includes(user.profil) && (
                                <>
                                  <Chip label="MB WAY" size="small" variant="outlined" />
                                  <Chip label="Multibanco" size="small" variant="outlined" />
                                  <Chip label="Transferência" size="small" variant="outlined" />
                                </>
                              )}

                              {/* Numerário */}
                              {(canProcessCash || ['0', '1'].includes(user.profil)) && (
                                <Chip
                                  label="Numerário"
                                  size="small"
                                  variant="outlined"
                                  color={canProcessCash ? "success" : "default"}
                                />
                              )}

                              {/* Municípios */}
                              {['0', '2'].includes(user.profil) && (
                                <Chip label="Municípios" size="small" variant="outlined" />
                              )}

                              {!['0', '1', '2', '3'].includes(user.profil) && (
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

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Interfaces Gerais" />
          <Tab label="Permissões Pagamento" />
        </Tabs>
      </Paper>

      {tab === 0 && renderGeneralPermissions()}
      {tab === 1 && renderPaymentPermissions()}

      {/* Dialog Edição */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editar Interfaces - {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Interfaces controlam acesso a funcionalidades específicas.
            </Typography>
          </Alert>
          <FormGroup>
            {interfaces.map(item => (
              <FormControlLabel
                key={item.pk}
                control={
                  <Checkbox
                    checked={selectedInterfaces.includes(item.pk)}
                    onChange={(e) => handleInterfaceChange(item.pk, e.target.checked)}
                  />
                }
                label={`${item.name} (ID: ${item.pk})`}
              />
            ))}
          </FormGroup>
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