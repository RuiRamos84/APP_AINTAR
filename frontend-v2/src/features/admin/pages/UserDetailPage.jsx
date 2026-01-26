/**
 * UserDetailPage (Admin)
 * Página de visualização e edição de detalhes de utilizador (Admin)
 *
 * Features:
 * - Ver todos os detalhes do utilizador
 * - Editar informações (admin pode editar qualquer utilizador)
 * - Alterar perfil/role
 * - Ativar/Desativar utilizador
 * - Reset password
 * - Validação com Zod
 * - Breadcrumbs de navegação
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Breadcrumbs,
  Link,
  Chip,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Grid,
  useMediaQuery,
  useTheme,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';

import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  LockReset as LockResetIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  NavigateNext as NavigateNextIcon,
  Person as PersonIcon,
  VpnKey as PermissionsIcon,
} from '@mui/icons-material';
import { getUserById, updateUserAdmin, deleteUser, resetUserPassword, toggleUserStatus } from '@/services/userService';
import { useIdentTypes } from '@/core/hooks/useMetaData';
import { notification } from '@/core/services/notification';
import { PageTransition, FadeIn } from '@/shared/components/animation';
import { FormSkeleton } from '@/shared/components/feedback';
import { useProfiles } from '@/core/contexts/MetadataContext';
import { UserPermissionsEditor } from '../components/UserPermissionsEditor';

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { data: identTypes, isLoading: identTypesLoading } = useIdentTypes();
  const { profiles, getProfileName } = useProfiles();

  // Responsividade
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Estados
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});

  // Diálogos
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  /**
   * Carregar dados do utilizador
   */
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const userData = await getUserById(userId);

      setUser(userData);
      const mappedData = {
        username: userData.username || '',
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        nipc: userData.nipc || '',
        ident_type: userData.ident_type || '',
        ident_value: userData.ident_value || '',
        address: userData.address || '',
        door: userData.door || '',
        floor: userData.floor || '',
        postal: userData.postal || '',
        nut4: userData.nut4 || '',
        descr: userData.descr || '',
        profil: userData.profil || '2',
        active: userData.active || false,
      };
      setFormData(mappedData);
      setOriginalData(mappedData);
    } catch (err) {
      notification.error(err.message || 'Erro ao carregar utilizador');
      navigate('/admin/users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId, navigate]);

  /**
   * Verificar se houve alterações
   */
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  /**
   * Atualizar campo
   */
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Limpar erro
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Iniciar edição
   */
  const handleEdit = () => {
    setIsEditing(true);
  };

  /**
   * Cancelar edição
   */
  const handleCancel = () => {
    setFormData(originalData);
    setErrors({});
    setIsEditing(false);
  };

  /**
   * Guardar alterações
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validação básica
      if (!formData.username || !formData.email) {
        setErrors({
          username: !formData.username ? 'Username é obrigatório' : '',
          email: !formData.email ? 'Email é obrigatório' : '',
        });
        return;
      }

      await updateUserAdmin(userId, formData);
      setOriginalData(formData);
      setIsEditing(false);
      notification.success('Utilizador atualizado com sucesso');
      // Recarregar user para atualizar header
      fetchUser();
    } catch (err) {
      notification.error(err.message || 'Erro ao guardar utilizador');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Callback ao salvar permissões
   */
  const handlePermissionsSaved = () => {
    fetchUser(); // Recarregar para garantir que temos o estado mais recente
  };

  /**
   * Reset password
   */
  const handleResetPassword = async () => {
    try {
      const result = await resetUserPassword(userId);
      setTempPassword(result.temp_password);
      notification.success('Password resetada com sucesso');
    } catch (err) {
      notification.error(err.message || 'Erro ao resetar password');
    }
  };

  /**
   * Toggle status
   */
  const handleToggleStatus = async () => {
    try {
      const newStatus = !user.active;
      await toggleUserStatus(userId, newStatus);
      setUser((prev) => ({ ...prev, active: newStatus }));
      setFormData((prev) => ({ ...prev, active: newStatus }));
      setOriginalData((prev) => ({ ...prev, active: newStatus }));
      notification.success(
        newStatus ? 'Utilizador ativado com sucesso' : 'Utilizador desativado com sucesso'
      );
    } catch (err) {
      notification.error(err.message || 'Erro ao alterar status');
    }
  };

  /**
   * Apagar utilizador
   */
  const handleDelete = async () => {
    try {
      await deleteUser(userId);
      notification.success('Utilizador apagado com sucesso');
      navigate('/admin/users');
    } catch (err) {
      notification.error(err.message || 'Erro ao apagar utilizador');
    }
  };

  /**
   * Obter iniciais
   */
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (isLoading) {
    return (
      <PageTransition variant="fade">
        <Container maxWidth="md" sx={{ py: 4 }}>
          <FormSkeleton fields={12} showAvatar showActions />
        </Container>
      </PageTransition>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <PageTransition variant="slideUp">
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3 } }}>
        {/* Breadcrumbs */}
        <FadeIn direction="down">
          <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: { xs: 2, sm: 3 } }}>
            <Link
              color="inherit"
              href="/admin/users"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin/users');
              }}
              sx={{ cursor: 'pointer' }}
            >
              Utilizadores
            </Link>
            <Typography color="text.primary">{user.username}</Typography>
          </Breadcrumbs>
        </FadeIn>

        {/* Header com Avatar */}
        <FadeIn delay={0.1}>
          <Paper sx={{ p: { xs: 2, sm: 3 }, mb: { xs: 2, sm: 3 }, textAlign: 'center', position: 'relative' }}>
            <Avatar
              sx={{
                width: { xs: 80, sm: 100, md: 120 },
                height: { xs: 80, sm: 100, md: 120 },
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                margin: '0 auto',
                mb: 2,
                bgcolor: 'primary.main',
              }}
            >
              {getInitials(user.name || user.username)}
            </Avatar>

            <Typography variant={isMobile ? 'h6' : 'h5'} gutterBottom>
              {user.name || user.username}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              justifyContent="center"
              flexWrap="wrap"
              sx={{ mb: 2, gap: 1 }}
            >
              <Chip
                label={getProfileName(parseInt(user.profil))}
                color={user.profil === '0' ? 'error' : user.profil === '1' ? 'primary' : 'default'}
                size={isMobile ? 'small' : 'medium'}
              />
              {user.active ? (
                <Chip
                  icon={isMobile ? undefined : <CheckCircleIcon />}
                  label={isMobile ? 'Ativo' : 'Validado'}
                  color="success"
                  size={isMobile ? 'small' : 'medium'}
                />
              ) : (
                <Chip
                  icon={isMobile ? undefined : <BlockIcon />}
                  label="Pendente"
                  color="warning"
                  size={isMobile ? 'small' : 'medium'}
                />
              )}
            </Stack>

            {/* Ações (apenas visíveis na tab de Detalhes) */}
            {activeTab === 0 && (
              <Stack
                direction={isMobile ? 'column' : 'row'}
                spacing={1}
                justifyContent="center"
                alignItems="stretch"
              >
                {!isEditing ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={!isMobile && <EditIcon />}
                      onClick={handleEdit}
                      fullWidth={isMobile}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={!isMobile && <LockResetIcon />}
                      onClick={() => setResetPasswordDialog(true)}
                      fullWidth={isMobile}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      {isMobile ? 'Reset Pass' : 'Reset Password'}
                    </Button>
                    <Button
                      variant="outlined"
                      color={user.active ? 'error' : 'success'}
                      startIcon={!isMobile && (user.active ? <BlockIcon /> : <CheckCircleIcon />)}
                      onClick={handleToggleStatus}
                      fullWidth={isMobile}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      {user.active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={!isMobile && <DeleteIcon />}
                      onClick={() => setDeleteDialog(true)}
                      fullWidth={isMobile}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      Apagar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      startIcon={!isMobile && <SaveIcon />}
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      fullWidth={isMobile}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      {isSaving ? 'A guardar...' : 'Guardar'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={!isMobile && <CancelIcon />}
                      onClick={handleCancel}
                      disabled={isSaving}
                      fullWidth={isMobile}
                      size={isMobile ? 'medium' : 'large'}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </Stack>
            )}
          </Paper>
        </FadeIn>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant={isMobile ? 'fullWidth' : 'standard'}>
            <Tab icon={<PersonIcon />} iconPosition="start" label="Detalhes Pessoais" />
            <Tab icon={<PermissionsIcon />} iconPosition="start" label="Permissões & Acessos" />
          </Tabs>
        </Box>

        {/* Tab Panel: Detalhes */}
        {activeTab === 0 && (
          <FadeIn delay={0.2}>
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} gutterBottom fontWeight="bold">
                Informações do Utilizador
              </Typography>
              <Divider sx={{ mb: { xs: 2, sm: 3 } }} />

              <Grid container spacing={{ xs: 2, sm: 3 }}>
                {/* Username */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Username"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    disabled={!isEditing}
                    required
                    error={!!errors.username}
                    helperText={errors.username}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Perfil/Role */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    select
                    label="Perfil"
                    value={formData.profil}
                    onChange={(e) => updateField('profil', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    {profiles.map((profile) => (
                      <MenuItem key={profile.pk} value={String(profile.pk)}>
                        {profile.name || `Perfil ${profile.pk}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Nome */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Nome Completo"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Email */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    type="email"
                    label="Email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    disabled={!isEditing}
                    required
                    error={!!errors.email}
                    helperText={errors.email}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Telefone */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Telefone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* NIPC */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="NIPC"
                    value={formData.nipc}
                    onChange={(e) => updateField('nipc', e.target.value)}
                    disabled={!isEditing}
                    inputProps={{ maxLength: 9 }}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Tipo Ident */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    select
                    label="Tipo Identificação"
                    value={formData.ident_type}
                    onChange={(e) => updateField('ident_type', e.target.value)}
                    disabled={!isEditing || identTypesLoading}
                    size={isMobile ? 'small' : 'medium'}
                  >
                    <MenuItem value=""><em>Nenhum</em></MenuItem>
                    {identTypes?.map((type) => (
                      <MenuItem key={type.pk} value={type.pk}>
                        {type.descr}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Nº Ident */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Nº Identificação"
                    value={formData.ident_value}
                    onChange={(e) => updateField('ident_value', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Morada */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Morada"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Código Postal */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Código Postal"
                    value={formData.postal}
                    onChange={(e) => updateField('postal', e.target.value)}
                    disabled={!isEditing}
                    placeholder="XXXX-XXX"
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Porta */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Porta"
                    value={formData.door}
                    onChange={(e) => updateField('door', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Andar */}
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Andar"
                    value={formData.floor}
                    onChange={(e) => updateField('floor', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Localidade */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Localidade"
                    value={formData.nut4}
                    onChange={(e) => updateField('nut4', e.target.value)}
                    disabled={!isEditing}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>

                {/* Descrição */}
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Descrição"
                    value={formData.descr}
                    onChange={(e) => updateField('descr', e.target.value)}
                    disabled={!isEditing}
                    multiline
                    rows={isMobile ? 2 : 3}
                    size={isMobile ? 'small' : 'medium'}
                  />
                </Grid>
              </Grid>
            </Paper>
          </FadeIn>
        )}

        {/* Tab Panel: Permissões */}
        {activeTab === 1 && (
          <FadeIn delay={0.2}>
            <UserPermissionsEditor 
              userId={userId} 
              currentPermissions={user.interfaces || []}
              onSave={handlePermissionsSaved}
            />
          </FadeIn>
        )}

        {/* Diálogo - Reset Password */}
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
                Tem certeza que deseja resetar a password do utilizador <strong>{user.username}</strong>?
              </DialogContentText>
            ) : (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Password resetada com sucesso!
                </Alert>
                <Typography variant="body2" gutterBottom>
                  Password temporária:
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '1.2rem' }}>
                  {tempPassword}
                </Paper>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {!tempPassword ? (
              <>
                <Button onClick={() => setResetPasswordDialog(false)}>Cancelar</Button>
                <Button onClick={handleResetPassword} color="primary" variant="contained">
                  Resetar
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

        {/* Diálogo - Apagar */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja apagar o utilizador <strong>{user.username}</strong>?
              Esta ação não pode ser desfeita.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button onClick={handleDelete} color="error" variant="contained">
              Apagar
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </PageTransition>
  );
};

export default UserDetailPage;
