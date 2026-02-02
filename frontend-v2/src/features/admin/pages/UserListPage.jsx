/**
 * UserListPage (Admin)
 * Página de listagem e gestão de utilizadores para administradores
 *
 * Features:
 * - Tabela paginada de utilizadores
 * - Pesquisa por nome, email ou username
 * - Filtros por status (ativo/inativo)
 * - Ações: Editar, Desativar/Ativar, Reset Password, Apagar
 * - Ordenação por colunas
 * - Loading states e error handling
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Grid,
  Checkbox,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useTheme,
  Stack,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LockReset as LockResetIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useUserList } from '../hooks';
import { PageTransition, FadeIn } from '@/shared/components/animation';
import { SearchBar } from '@/shared/components/data';
import { TableSkeleton } from '@/shared/components/feedback';
import { useProfiles } from '@/core/contexts/MetadataContext';
import UserPermissionsDialog from '../components/UserPermissionsDialog';
import BulkPermissionsDialog from '../components/BulkPermissionsDialog';
import { updateUserPermissions, bulkUpdatePermissions } from '@/services/userService';
import { notification } from '@/core/services/notification';
import { PERMISSION_TEMPLATES } from '@/core/utils/permissionHelpers';

const UserListPage = () => {
  const navigate = useNavigate();
  const { getProfileName } = useProfiles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), {
    noSsr: true,
  }); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'), {
    noSsr: true,
  }); // 600-900px

  const {
    users,
    totalCount,
    isLoading,
    error,
    page,
    rowsPerPage,
    search,
    sortBy,
    sortOrder,
    setPage,
    setRowsPerPage,
    setSearch,
    setSortBy,
    setSortOrder,
    handleDeleteUser,
    handleToggleStatus,
    handleResetPassword,
    refetch,
  } = useUserList();

  // Menu de ações
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Diálogos de confirmação
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  // Permissões - Single user
  const [permissionsDialog, setPermissionsDialog] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState(null);

  // Permissões - Bulk operations
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkPermissionsDialog, setBulkPermissionsDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState(null); // 'add', 'remove', 'template'

  /**
   * Abrir menu de ações
   */
  const handleOpenMenu = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  /**
   * Fechar menu de ações
   */
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  /**
   * Navegar para edição
   */
  const handleEdit = () => {
    navigate(`/admin/users/${selectedUser.user_id}/edit`);
    handleCloseMenu();
  };

  /**
   * Confirmar exclusão
   */
  const handleConfirmDelete = async () => {
    const success = await handleDeleteUser(selectedUser.user_id);
    if (success) {
      setDeleteDialog(false);
      handleCloseMenu();
    }
  };

  /**
   * Confirmar reset de password
   */
  const handleConfirmResetPassword = async () => {
    const result = await handleResetPassword(selectedUser.user_id);
    if (result) {
      setTempPassword(result.temp_password);
    }
  };

  /**
   * Toggle status (ativar/desativar)
   */
  const handleToggle = async () => {
    await handleToggleStatus(selectedUser.user_id, !selectedUser.active);
    handleCloseMenu();
  };

  /**
   * Mudança de página
   */
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  /**
   * Mudança de rows per page
   */
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  /**
   * Mudança de ordenação
   */
  const handleSort = (column) => {
    const isAsc = sortBy === column && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  };

  /**
   * Obter iniciais do nome
   */
  const getInitials = (name, username) => {
    const displayName = name || username || '?';
    return displayName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  /**
   * ===== BULK SELECTION =====
   */
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedUsers(users.map(u => u.user_id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  /**
   * ===== PERMISSIONS - SINGLE USER =====
   */
  const handleManagePermissions = () => {
    setUserForPermissions(selectedUser);
    setPermissionsDialog(true);
    handleCloseMenu();
  };

  const handleSavePermissions = async (permissions) => {
    try {
      await updateUserPermissions(userForPermissions.user_id, permissions);
      notification.success('Permissões atualizadas com sucesso');
      setPermissionsDialog(false);
      setUserForPermissions(null);
      refetch();
    } catch (error) {
      notification.error(error.message || 'Erro ao atualizar permissões');
    }
  };

  /**
   * ===== PERMISSIONS - BULK OPERATIONS =====
   */
  const handleOpenBulkPermissions = (action) => {
    setBulkAction(action);
    setBulkPermissionsDialog(true);
  };

  const handleBulkPermissionsConfirm = async (data) => {
    try {
      const selectedUsersData = users.filter(u => selectedUsers.includes(u.user_id));

      await bulkUpdatePermissions(selectedUsers, {
        action: bulkAction,
        ...data,
      });

      notification.success(
        `Permissões atualizadas para ${selectedUsers.length} utilizador(es)`
      );

      setBulkPermissionsDialog(false);
      setSelectedUsers([]);
      refetch();
    } catch (error) {
      notification.error(error.message || 'Erro ao atualizar permissões em massa');
    }
  };

  return (
    <PageTransition variant="slideUp">
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <FadeIn direction="down">
          <Box
            sx={{
              mb: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
            <Typography
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              fontWeight="bold"
              sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' } }}
            >
              Gestão de Utilizadores
            </Typography>
            <Button
              variant="contained"
              startIcon={!isMobile && <AddIcon />}
              onClick={() => navigate('/admin/users/new')}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "large"}
            >
              {isMobile ? '+ Novo' : 'Novo Utilizador'}
            </Button>
          </Box>
        </FadeIn>

      {/* Filtros e Pesquisa */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <SearchBar
            searchTerm={search}
            onSearch={setSearch}
          />
          <Button
            variant="outlined"
            startIcon={!isMobile && <RefreshIcon />}
            onClick={refetch}
            disabled={isLoading}
            size={isMobile ? "small" : "medium"}
          >
            Atualizar
          </Button>
        </Box>
      </Paper>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedUsers.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Toolbar
            sx={{
              pl: { xs: 1, sm: 2 },
              pr: { xs: 1, sm: 1 },
              bgcolor: 'primary.lighter',
              minHeight: { xs: 56, sm: 64 },
            }}
          >
            <Typography
              sx={{ flex: '1 1 100%' }}
              color="primary"
              variant={isMobile ? "body2" : "subtitle1"}
              component="div"
            >
              {selectedUsers.length} {isMobile ? 'selecionado(s)' : 'utilizador(es) selecionado(s)'}
            </Typography>

            {isMobile ? (
              /* Mobile: Stack compacto */
              <Stack direction="row" spacing={0.5}>
                <IconButton size="small" onClick={() => handleOpenBulkPermissions('add')} title="Adicionar">
                  <PersonAddIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleOpenBulkPermissions('remove')} title="Remover">
                  <PersonRemoveIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleOpenBulkPermissions('template')} title="Template">
                  <AssignmentIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={handleClearSelection} title="Limpar">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              /* Desktop: Com tooltips */
              <>
                <Tooltip title="Adicionar Permissões">
                  <IconButton onClick={() => handleOpenBulkPermissions('add')}>
                    <PersonAddIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remover Permissões">
                  <IconButton onClick={() => handleOpenBulkPermissions('remove')}>
                    <PersonRemoveIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Aplicar Template">
                  <IconButton onClick={() => handleOpenBulkPermissions('template')}>
                    <AssignmentIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Limpar Seleção">
                  <IconButton onClick={handleClearSelection}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Toolbar>
        </Paper>
      )}

      {/* Conteúdo */}
      {isLoading ? (
        <FadeIn>
          <TableSkeleton rows={rowsPerPage} columns={7} showPagination />
        </FadeIn>
      ) : isMobile ? (
        /* MOBILE VIEW - Cards */
        <FadeIn delay={0.1}>
          <Stack spacing={2}>
            {users.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  Nenhum utilizador encontrado
                </Typography>
              </Paper>
            ) : (
              users.map((user) => {
                const isSelected = selectedUsers.includes(user.user_id);
                return (
                  <Card
                    key={user.user_id}
                    variant="outlined"
                    sx={{
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderWidth: isSelected ? 2 : 1,
                      '&:hover': { boxShadow: 2 }
                    }}
                  >
                    <CardContent sx={{ pb: 1 }}>
                      {/* Header com Avatar e Checkbox */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelectUser(user.user_id)}
                          size="small"
                        />
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: 'primary.main',
                            fontSize: '0.875rem'
                          }}
                        >
                          {getInitials(user.name, user.username)}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight="bold" noWrap>
                            {user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            ID: {user.user_id}
                          </Typography>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenMenu(e, user)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      {/* Informações */}
                      <Stack spacing={1}>
                        {user.name && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Nome
                            </Typography>
                            <Typography variant="body2">{user.name}</Typography>
                          </Box>
                        )}

                        {user.email && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Email
                            </Typography>
                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                              {user.email}
                            </Typography>
                          </Box>
                        )}

                        {/* Chips de Status e Perfil */}
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 1 }}>
                          <Chip
                            label={getProfileName(parseInt(user.profil))}
                            size="small"
                            color={user.profil === '0' ? 'error' : user.profil === '1' ? 'primary' : 'default'}
                          />
                          {user.active ? (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Ativo"
                              size="small"
                              color="success"
                            />
                          ) : (
                            <Chip
                              icon={<BlockIcon />}
                              label="Pendente"
                              size="small"
                              color="warning"
                            />
                          )}
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })
            )}

            {/* Paginação Mobile */}
            {users.length > 0 && (
              <Paper>
                <TablePagination
                  component="div"
                  count={totalCount}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[10, 20, 50]}
                  labelRowsPerPage="Por página:"
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} de ${count}`
                  }
                />
              </Paper>
            )}
          </Stack>
        </FadeIn>
      ) : (
        /* DESKTOP/TABLET VIEW - Table */
        <FadeIn delay={0.1}>
          <Paper sx={{ overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                        checked={users.length > 0 && selectedUsers.length === users.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                        onClick={() => handleSort('user_id')}
                      >
                        ID
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box
                        sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                        onClick={() => handleSort('username')}
                      >
                        Username
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Box
                        sx={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                        onClick={() => handleSort('name')}
                      >
                        Nome
                      </Box>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Email</TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Perfil</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                        <Typography variant="body1" color="text.secondary">
                          Nenhum utilizador encontrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const isSelected = selectedUsers.includes(user.user_id);
                      return (
                        <TableRow
                          key={user.user_id}
                          hover
                          selected={isSelected}
                          onClick={() => handleSelectUser(user.user_id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleSelectUser(user.user_id)}
                            />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {user.user_id}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Typography variant="body2" fontWeight="medium">
                              {user.username}
                            </Typography>
                          </TableCell>
                          <TableCell
                            onClick={(e) => e.stopPropagation()}
                            sx={{ display: { xs: 'none', md: 'table-cell' } }}
                          >
                            {user.name || '-'}
                          </TableCell>
                          <TableCell
                            onClick={(e) => e.stopPropagation()}
                            sx={{ display: { xs: 'none', md: 'table-cell' } }}
                          >
                            {user.email || '-'}
                          </TableCell>
                          <TableCell
                            onClick={(e) => e.stopPropagation()}
                            sx={{ display: { xs: 'none', lg: 'table-cell' } }}
                          >
                            <Chip
                              label={getProfileName(parseInt(user.profil))}
                              size="small"
                              color={user.profil === '0' ? 'error' : user.profil === '1' ? 'primary' : 'default'}
                            />
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {user.active ? (
                              <Chip
                                icon={<CheckCircleIcon />}
                                label={isTablet ? 'Ativo' : 'Validado'}
                                size="small"
                                color="success"
                              />
                            ) : (
                              <Chip
                                icon={<BlockIcon />}
                                label="Pendente"
                                size="small"
                                color="warning"
                              />
                            )}
                          </TableCell>
                          <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                            <IconButton
                              size="small"
                              onClick={(e) => handleOpenMenu(e, user)}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Paginação Desktop */}
            {users.length > 0 && (
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelRowsPerPage="Linhas por página:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                }
              />
            )}
          </Paper>
        </FadeIn>
      )}

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={handleManagePermissions}>
          <SecurityIcon fontSize="small" sx={{ mr: 1 }} />
          Gerir Permissões
        </MenuItem>
        <MenuItem onClick={handleToggle}>
          {selectedUser?.active ? (
            <>
              <BlockIcon fontSize="small" sx={{ mr: 1 }} />
              Desativar
            </>
          ) : (
            <>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
              Ativar
            </>
          )}
        </MenuItem>
        <MenuItem onClick={() => {
          setResetPasswordDialog(true);
          handleCloseMenu();
        }}>
          <LockResetIcon fontSize="small" sx={{ mr: 1 }} />
          Reset Password
        </MenuItem>
        <MenuItem onClick={() => {
          setDeleteDialog(true);
          handleCloseMenu();
        }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
          <Typography color="error">Apagar</Typography>
        </MenuItem>
      </Menu>

      {/* Diálogo de Confirmação - Apagar */}
      <Dialog
        open={deleteDialog}
        onClose={() => setDeleteDialog(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja apagar o utilizador <strong>{selectedUser?.username}</strong>?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Apagar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmação - Reset Password */}
      <Dialog
        open={resetPasswordDialog}
        onClose={() => {
          setResetPasswordDialog(false);
          setTempPassword(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          {!tempPassword ? (
            <DialogContentText>
              Tem certeza que deseja resetar a password do utilizador <strong>{selectedUser?.username}</strong>?
              Uma password temporária será gerada.
            </DialogContentText>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Password resetada com sucesso!
              </Alert>
              <Typography variant="body2" gutterBottom>
                Password temporária para <strong>{selectedUser?.username}</strong>:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '1.2rem' }}>
                {tempPassword}
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Certifique-se de copiar e enviar esta password ao utilizador. Ela não será mostrada novamente.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!tempPassword ? (
            <>
              <Button onClick={() => setResetPasswordDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmResetPassword} color="primary" variant="contained">
                Resetar Password
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setResetPasswordDialog(false);
              setTempPassword(null);
            }} variant="contained">
              Fechar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Diálogo de Permissões - Single User */}
      {userForPermissions && (
        <UserPermissionsDialog
          open={permissionsDialog}
          user={userForPermissions}
          onClose={() => {
            setPermissionsDialog(false);
            setUserForPermissions(null);
          }}
          onSave={handleSavePermissions}
        />
      )}

      {/* Diálogo de Permissões - Bulk */}
      <BulkPermissionsDialog
        open={bulkPermissionsDialog}
        selectedUsers={users.filter(u => selectedUsers.includes(u.user_id))}
        action={bulkAction}
        onClose={() => {
          setBulkPermissionsDialog(false);
          setBulkAction(null);
        }}
        onConfirm={handleBulkPermissionsConfirm}
      />
      </Container>
    </PageTransition>
  );
};

export default UserListPage;
