import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Dialog,
  DialogActions, DialogContent, DialogTitle, FormGroup,
  FormControlLabel, Checkbox, Grid, Chip, CircularProgress
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import api from '../../services/api';
import { notifySuccess, notifyError } from '../../components/common/Toaster/ThemedToaster';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedInterfaces, setSelectedInterfaces] = useState([]);

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

      // Actualizar lista local
      setUsers(users.map(user =>
        user.pk === selectedUser.pk
          ? { ...user, interface: selectedInterfaces }
          : user
      ));

      notifySuccess('Permissões actualizadas');
      setOpenDialog(false);
    } catch (error) {
      notifyError('Erro ao actualizar permissões');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestão de Permissões
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Perfil</TableCell>
              <TableCell>Interfaces</TableCell>
              <TableCell>Acções</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.pk}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Chip label={user.profil === '0' ? 'Admin' : 'User'} />
                </TableCell>
                <TableCell>
                  {user.interface?.length || 0} interfaces
                </TableCell>
                <TableCell>
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog(user)}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Editar Permissões - {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
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
                label={item.name}
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