import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
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
  Checkbox,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useTheme,
  Stack,
  Card,
  CardContent,
  Divider,
  Avatar,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
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
  People as PeopleIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout';
import { SearchBar } from '@/shared/components/data';
import SortableHeadCell from '@/shared/components/data/SortableHeadCell';
import { TableSkeleton } from '@/shared/components/feedback';
import { useProfiles } from '@/core/contexts/MetadataContext';
import { useUserList } from '../hooks';
import UserPermissionsDialog from '../components/UserPermissionsDialog';
import BulkPermissionsDialog from '../components/BulkPermissionsDialog';
import { updateUserPermissions, bulkUpdatePermissions } from '@/services/userService';
import { notification } from '@/core/services/notification';

// Cor do avatar baseada no perfil
const PROFILE_COLORS = {
  '0': '#d32f2f', // Super Admin — vermelho
  '1': '#1565c0', // Operador — azul
  '2': '#2e7d32', // Técnico — verde
  '3': '#e65100', // Financeiro — laranja
  '4': '#6a1b9a', // Gestor — roxo
  '5': '#d32f2f', // Admin — vermelho
};

const getAvatarColor = (profil) => PROFILE_COLORS[profil] || '#546e7a';

const getInitials = (name, username) => {
  const src = name || username || '?';
  return src.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
};

// ─── Componente de linha de estatística ────────────────────────────────────
const StatChip = ({ label, value, color }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      px: 2,
      py: 0.75,
      borderRadius: 2,
      bgcolor: alpha(color, 0.08),
      border: `1px solid ${alpha(color, 0.2)}`,
    }}
  >
    <Typography variant="h6" fontWeight="bold" color={color} lineHeight={1}>
      {value}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
  </Box>
);

// ─── Página principal ───────────────────────────────────────────────────────
const UserListPage = () => {
  const navigate = useNavigate();
  const { getProfileName } = useProfiles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  const {
    users,
    totalCount,
    stats,
    isLoading,
    error,
    page,
    rowsPerPage,
    searchInput,
    sortBy,
    sortOrder,
    statusFilter,
    setPage,
    setRowsPerPage,
    setSearchInput,
    setSortBy,
    setSortOrder,
    setStatusFilter,
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

  // Permissões
  const [permissionsDialog, setPermissionsDialog] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState(null);

  // Seleção em massa
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [bulkPermissionsDialog, setBulkPermissionsDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);

  // stats vem do hook (calculado sobre todos os utilizadores filtrados)

  // ── Menu ────────────────────────────────────────────────────────────────
  const handleOpenMenu = (e, user) => { setAnchorEl(e.currentTarget); setSelectedUser(user); };
  const handleCloseMenu = () => setAnchorEl(null);

  // ── Ações ────────────────────────────────────────────────────────────────
  const handleEdit = () => {
    navigate(`/admin/users/${selectedUser.user_id}/edit`);
    handleCloseMenu();
  };

  const handleConfirmDelete = async () => {
    const ok = await handleDeleteUser(selectedUser.user_id);
    if (ok) { setDeleteDialog(false); handleCloseMenu(); }
  };

  const handleConfirmResetPassword = async () => {
    const result = await handleResetPassword(selectedUser.user_id);
    if (result) setTempPassword(result.temp_password);
  };

  const handleToggle = async () => {
    // activa se estiver desativado; desativa nos outros casos
    const activate = selectedUser.status === 'disabled';
    await handleToggleStatus(selectedUser.user_id, activate);
    handleCloseMenu();
  };

  // ── Ordenação ────────────────────────────────────────────────────────────
  const handleSort = (field) => {
    setSortOrder(sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
  };

  // ── Seleção ──────────────────────────────────────────────────────────────
  const handleSelectAll = (e) => {
    setSelectedUsers(e.target.checked ? users.map(u => u.user_id) : []);
  };
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // ── Permissões ──────────────────────────────────────────────────────────
  const handleManagePermissions = () => {
    setUserForPermissions(selectedUser);
    setPermissionsDialog(true);
    handleCloseMenu();
  };

  const handleSavePermissions = async (permissions) => {
    try {
      await updateUserPermissions(userForPermissions.user_id, permissions);
      notification.success('Permissões atualizadas');
      setPermissionsDialog(false);
      setUserForPermissions(null);
      refetch();
    } catch (err) {
      notification.error(err.message || 'Erro ao atualizar permissões');
    }
  };

  const handleBulkPermissionsConfirm = async (data) => {
    try {
      await bulkUpdatePermissions(selectedUsers, { action: bulkAction, ...data });
      notification.success(`Permissões atualizadas para ${selectedUsers.length} utilizador(es)`);
      setBulkPermissionsDialog(false);
      setSelectedUsers([]);
      refetch();
    } catch (err) {
      notification.error(err.message || 'Erro ao atualizar permissões em massa');
    }
  };

  // ── Copiar password temporária ───────────────────────────────────────────
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    notification.success('Password copiada para a área de transferência');
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <ModulePage
      title="Utilizadores"
      subtitle="Gestão de contas, acessos e permissões"
      icon={PeopleIcon}
      color="#d32f2f"
      breadcrumbs={[{ label: 'Utilizadores' }]}
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* Filtro de estado */}
          <ToggleButtonGroup
            value={statusFilter}
            exclusive
            onChange={(_, v) => v && setStatusFilter(v)}
            size="small"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            <ToggleButton value="all"      sx={{ px: 1.5, fontSize: '0.75rem' }}>Todos</ToggleButton>
            <ToggleButton value="active"   sx={{ px: 1.5, fontSize: '0.75rem' }}>Ativos</ToggleButton>
            <ToggleButton value="pending"  sx={{ px: 1.5, fontSize: '0.75rem' }}>Pendentes</ToggleButton>
            <ToggleButton value="disabled" sx={{ px: 1.5, fontSize: '0.75rem' }}>Desativos</ToggleButton>
          </ToggleButtonGroup>

          <SearchBar searchTerm={searchInput} onSearch={setSearchInput} />

          <Tooltip title="Atualizar">
            <span>
              <IconButton onClick={refetch} disabled={isLoading} size="small">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/users/new')}
            size="small"
            sx={{ whiteSpace: 'nowrap' }}
          >
            {isMobile ? 'Novo' : 'Novo Utilizador'}
          </Button>
        </Box>
      }
    >
      {/* Erro */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Estatísticas */}
      {!isLoading && (
        <Stack direction="row" spacing={1.5} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <StatChip label="total"     value={stats.total}    color={theme.palette.text.primary} />
          <StatChip label="ativos"    value={stats.active}   color={theme.palette.success.main} />
          <StatChip label="pendentes" value={stats.pending}  color={theme.palette.warning.main} />
          <StatChip label="desativos" value={stats.disabled} color={theme.palette.error.main} />
        </Stack>
      )}

      {/* Filtro mobile */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, mb: 2 }}>
        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_, v) => v && setStatusFilter(v)}
          size="small"
          fullWidth
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="active">Ativos</ToggleButton>
          <ToggleButton value="pending">Pendentes</ToggleButton>
          <ToggleButton value="disabled">Desativos</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Toolbar de seleção em massa */}
      {selectedUsers.length > 0 && (
        <Paper sx={{ mb: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
          <Toolbar sx={{ minHeight: 52, px: 2, gap: 1 }}>
            <Typography variant="subtitle2" color="primary" sx={{ flex: 1 }}>
              {selectedUsers.length} selecionado(s)
            </Typography>
            <Tooltip title="Adicionar permissões">
              <IconButton size="small" onClick={() => { setBulkAction('add'); setBulkPermissionsDialog(true); }}>
                <PersonAddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remover permissões">
              <IconButton size="small" onClick={() => { setBulkAction('remove'); setBulkPermissionsDialog(true); }}>
                <PersonRemoveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Aplicar template">
              <IconButton size="small" onClick={() => { setBulkAction('template'); setBulkPermissionsDialog(true); }}>
                <AssignmentIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Cancelar seleção">
              <IconButton size="small" onClick={() => setSelectedUsers([])}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </Paper>
      )}

      {/* Conteúdo principal */}
      {isLoading ? (
        <TableSkeleton rows={rowsPerPage} columns={6} showPagination />
      ) : isMobile ? (
        // ── MOBILE: Cards ──────────────────────────────────────────────────
        <Stack spacing={1.5}>
          {users.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Typography color="text.secondary">Nenhum utilizador encontrado</Typography>
            </Paper>
          ) : (
            users.map(user => {
              const isSelected = selectedUsers.includes(user.user_id);
              const avatarColor = getAvatarColor(user.profil);
              return (
                <Card
                  key={user.user_id}
                  variant="outlined"
                  sx={{
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderWidth: isSelected ? 2 : 1,
                  }}
                >
                  <CardContent sx={{ pb: '12px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectUser(user.user_id)}
                        size="small"
                        sx={{ p: 0 }}
                      />
                      <Avatar sx={{ width: 38, height: 38, bgcolor: avatarColor, fontSize: '0.8rem', flexShrink: 0 }}>
                        {getInitials(user.name, user.username)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight="bold" noWrap>
                          {user.name || user.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          @{user.username}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={(e) => handleOpenMenu(e, user)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>

                    {user.email && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, ml: 7 }} noWrap>
                        {user.email}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, ml: 7, flexWrap: 'wrap' }}>
                      <Chip
                        label={getProfileName(parseInt(user.profil))}
                        size="small"
                        sx={{ bgcolor: alpha(avatarColor, 0.12), color: avatarColor, fontWeight: 600, fontSize: '0.7rem' }}
                      />
                      {user.status === 'active' && (
                        <Chip icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />} label="Ativo" size="small" color="success" variant="outlined" />
                      )}
                      {user.status === 'pending' && (
                        <Chip icon={<BlockIcon sx={{ fontSize: '0.85rem !important' }} />} label="Pendente" size="small" color="warning" variant="outlined" />
                      )}
                      {user.status === 'disabled' && (
                        <Chip icon={<BlockIcon sx={{ fontSize: '0.85rem !important' }} />} label="Desativo" size="small" color="error" variant="outlined" />
                      )}
                      {user.interfaces?.length > 0 && (
                        <Chip
                          icon={<SecurityIcon sx={{ fontSize: '0.85rem !important' }} />}
                          label={user.interfaces.length}
                          size="small"
                          variant="outlined"
                          color="default"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}

          {totalCount > 0 && (
            <Paper>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50]}
                labelRowsPerPage="Por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
              />
            </Paper>
          )}
        </Stack>
      ) : (
        // ── DESKTOP: Tabela ────────────────────────────────────────────────
        <Paper sx={{ overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.03) }}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length}
                      checked={users.length > 0 && selectedUsers.length === users.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <SortableHeadCell label="Utilizador" field="username" sortKey={sortBy} sortDir={sortOrder} onSort={handleSort} />
                  <SortableHeadCell label="Email" field="email" sortKey={sortBy} sortDir={sortOrder} onSort={handleSort} sx={{ display: { xs: 'none', md: 'table-cell' } }} />
                  <SortableHeadCell label="Perfil" field="profil" sortKey={sortBy} sortDir={sortOrder} onSort={handleSort} sx={{ display: { xs: 'none', lg: 'table-cell' } }} />
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Permissões</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right" sx={{ pr: 2 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Typography color="text.secondary">Nenhum utilizador encontrado</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map(user => {
                    const isSelected = selectedUsers.includes(user.user_id);
                    const avatarColor = getAvatarColor(user.profil);
                    return (
                      <TableRow
                        key={user.user_id}
                        hover
                        selected={isSelected}
                        sx={{ cursor: 'default' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => handleSelectUser(user.user_id)}
                          />
                        </TableCell>

                        {/* Utilizador */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: avatarColor, fontSize: '0.72rem', flexShrink: 0 }}>
                              {getInitials(user.name, user.username)}
                            </Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {user.name || user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                @{user.username}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Email */}
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>
                            {user.email || '—'}
                          </Typography>
                        </TableCell>

                        {/* Perfil */}
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          <Chip
                            label={getProfileName(parseInt(user.profil))}
                            size="small"
                            sx={{
                              bgcolor: alpha(avatarColor, 0.1),
                              color: avatarColor,
                              fontWeight: 600,
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        </TableCell>

                        {/* Permissões */}
                        <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                          {user.interfaces?.length > 0 ? (
                            <Chip
                              icon={<SecurityIcon sx={{ fontSize: '0.85rem !important' }} />}
                              label={user.interfaces.length}
                              size="small"
                              variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
                        </TableCell>

                        {/* Estado */}
                        <TableCell>
                          {user.status === 'active' && (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />}
                              label="Ativo" size="small" color="success" variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {user.status === 'pending' && (
                            <Chip
                              icon={<BlockIcon sx={{ fontSize: '0.85rem !important' }} />}
                              label="Pendente" size="small" color="warning" variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                          {user.status === 'disabled' && (
                            <Chip
                              icon={<BlockIcon sx={{ fontSize: '0.85rem !important' }} />}
                              label="Desativo" size="small" color="error" variant="outlined"
                              sx={{ height: 22, fontSize: '0.7rem' }}
                            />
                          )}
                        </TableCell>

                        {/* Ações */}
                        <TableCell align="right" sx={{ pr: 1 }}>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => navigate(`/admin/users/${user.user_id}/edit`)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Mais opções">
                            <IconButton size="small" onClick={(e) => handleOpenMenu(e, user)}>
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="Por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
          />
        </Paper>
      )}

      {/* ── Menu de ações ─────────────────────────────────────────────────── */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={handleManagePermissions}>
          <SecurityIcon fontSize="small" sx={{ mr: 1.5 }} />
          Gerir Permissões
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleToggle}>
          {selectedUser?.status === 'disabled' ? (
            <><CheckCircleIcon fontSize="small" sx={{ mr: 1.5, color: 'success.main' }} />Ativar</>
          ) : (
            <><BlockIcon fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} />Desativar</>
          )}
        </MenuItem>
        <MenuItem onClick={() => { setResetPasswordDialog(true); handleCloseMenu(); }}>
          <LockResetIcon fontSize="small" sx={{ mr: 1.5 }} />
          Repor Password
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setDeleteDialog(true); handleCloseMenu(); }} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Apagar
        </MenuItem>
      </Menu>

      {/* ── Diálogo: Apagar ────────────────────────────────────────────────── */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminação</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem a certeza que pretende apagar o utilizador <strong>{selectedUser?.username}</strong>?
            Esta ação é irreversível.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">Apagar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Repor Password ────────────────────────────────────────── */}
      <Dialog
        open={resetPasswordDialog}
        onClose={() => { setResetPasswordDialog(false); setTempPassword(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Repor Password</DialogTitle>
        <DialogContent>
          {!tempPassword ? (
            <DialogContentText>
              Será gerada uma password temporária para <strong>{selectedUser?.username}</strong>.
              O utilizador deverá alterá-la no primeiro acesso.
            </DialogContentText>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ mb: 2 }}>Password reposta com sucesso.</Alert>
              <Typography variant="body2" gutterBottom>
                Password temporária para <strong>{selectedUser?.username}</strong>:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mt: 1,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography
                  sx={{ flex: 1, fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 1 }}
                >
                  {tempPassword}
                </Typography>
                <Tooltip title="Copiar">
                  <IconButton size="small" onClick={handleCopyPassword}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Copie e partilhe esta password com o utilizador. Não será mostrada novamente.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!tempPassword ? (
            <>
              <Button onClick={() => setResetPasswordDialog(false)}>Cancelar</Button>
              <Button onClick={handleConfirmResetPassword} variant="contained">Repor Password</Button>
            </>
          ) : (
            <Button onClick={() => { setResetPasswordDialog(false); setTempPassword(null); }} variant="contained">
              Fechar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Permissões: utilizador individual ────────────────────────────── */}
      {userForPermissions && (
        <UserPermissionsDialog
          open={permissionsDialog}
          user={userForPermissions}
          onClose={() => { setPermissionsDialog(false); setUserForPermissions(null); }}
          onSave={handleSavePermissions}
        />
      )}

      {/* ── Permissões: em massa ──────────────────────────────────────────── */}
      <BulkPermissionsDialog
        open={bulkPermissionsDialog}
        selectedUsers={users.filter(u => selectedUsers.includes(u.user_id))}
        action={bulkAction}
        onClose={() => { setBulkPermissionsDialog(false); setBulkAction(null); }}
        onConfirm={handleBulkPermissionsConfirm}
      />
    </ModulePage>
  );
};

export default UserListPage;
