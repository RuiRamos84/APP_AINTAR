import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Chip,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Grid,
  Stack,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  LockReset as LockResetIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  ArrowBack as ArrowBackIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Badge as BadgeIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout';
import { FormSkeleton } from '@/shared/components/feedback';
import { getUserById, updateUserAdmin, deleteUser, resetUserPassword, toggleUserStatus } from '@/services/userService';
import { useIdentTypes } from '@/core/hooks/useMetaData';
import { useProfiles } from '@/core/contexts/MetadataContext';
import { notification } from '@/core/services/notification';
import { UserPermissionsEditor } from '../components/UserPermissionsEditor';

// Cor por perfil (igual ao UserListPage)
const PROFILE_COLORS = {
  '0': '#d32f2f',
  '1': '#1565c0',
  '2': '#2e7d32',
  '3': '#e65100',
  '4': '#6a1b9a',
  '5': '#d32f2f',
};
const getAvatarColor = (profil) => PROFILE_COLORS[profil] || '#546e7a';

const getInitials = (name, username) => {
  const src = name || username || '?';
  return src.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
};

// ─── Secção de formulário com título e ícone ────────────────────────────────
const FormSection = ({ icon: Icon, title, children }) => (
  <Box sx={{ mb: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      {Icon && <Icon sx={{ fontSize: 18, color: 'text.secondary' }} />}
      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </Typography>
    </Box>
    <Grid container spacing={2}>
      {children}
    </Grid>
  </Box>
);

// ─── Página ─────────────────────────────────────────────────────────────────
const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { data: identTypes, isLoading: identTypesLoading } = useIdentTypes();
  const { profiles, getProfileName } = useProfiles();

  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [errors, setErrors] = useState({});

  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const data = await getUserById(userId);

      // Normalizar interface → interfaces (backend devolve singular)
      const normalized = {
        ...data,
        interfaces: data.interfaces ?? data.interface ?? [],
      };
      setUser(normalized);

      const mapped = {
        username: data.username || '',
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        ident_type: data.ident_type || '',
        ident_value: data.ident_value || '',
        address: data.address || '',
        door: data.door || '',
        floor: data.floor || '',
        postal: data.postal || '',
        nut4: data.nut4 || '',
        descr: data.descr || '',
        profil: data.profil || '2',
      };
      setFormData(mapped);
      setOriginalData(mapped);
    } catch (err) {
      notification.error(err.message || 'Erro ao carregar utilizador');
      navigate('/admin/users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, [userId]);

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  // ── Ações de formulário ────────────────────────────────────────────────
  const handleSave = async () => {
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Obrigatório';
    if (!formData.email) newErrors.email = 'Obrigatório';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    try {
      setIsSaving(true);
      await updateUserAdmin(userId, formData);
      setOriginalData(formData);
      setIsEditing(false);
      notification.success('Utilizador atualizado com sucesso');
      fetchUser();
    } catch (err) {
      notification.error(err.message || 'Erro ao guardar utilizador');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => { setFormData(originalData); setErrors({}); setIsEditing(false); };

  // ── Ações de estado ────────────────────────────────────────────────────
  const handleToggleStatus = async () => {
    try {
      const activate = user.status === 'disabled'; // activa se desativado, desativa nos outros casos
      await toggleUserStatus(userId, activate);
      const newActive = activate;
      let newUserStatus;
      if (!newActive) newUserStatus = 'disabled';
      else if (!user.email_validated) newUserStatus = 'pending';
      else newUserStatus = 'active';
      const patch = { active: newActive, status: newUserStatus };
      setUser(prev => ({ ...prev, ...patch }));
      setFormData(prev => ({ ...prev, ...patch }));
      setOriginalData(prev => ({ ...prev, ...patch }));
      notification.success(activate ? 'Utilizador ativado' : 'Utilizador desativado');
    } catch (err) {
      notification.error(err.message || 'Erro ao alterar estado');
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetUserPassword(userId);
      setTempPassword(result.temp_password);
    } catch (err) {
      notification.error(err.message || 'Erro ao repor password');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(userId);
      notification.success('Utilizador apagado');
      navigate('/admin/users');
    } catch (err) {
      notification.error(err.message || 'Erro ao apagar utilizador');
    }
  };

  const handlePermissionsSaved = () => fetchUser();

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <ModulePage title="Utilizador" icon={PersonIcon} color="#d32f2f" breadcrumbs={[{ label: 'Utilizadores', to: '/admin/users' }, { label: '...' }]}>
        <FormSkeleton fields={10} showAvatar showActions />
      </ModulePage>
    );
  }

  if (!user) return null;

  const avatarColor = getAvatarColor(user.profil);

  return (
    <ModulePage
      title={user.name || user.username}
      subtitle={`@${user.username} · ${getProfileName(parseInt(user.profil))}`}
      icon={PersonIcon}
      color={avatarColor}
      breadcrumbs={[{ label: 'Utilizadores', to: '/admin/users' }, { label: user.username }]}
      actions={
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/users')}
        >
          Voltar
        </Button>
      }
    >
      <Grid container spacing={3}>

        {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Paper sx={{ p: 3, textAlign: 'center', position: 'sticky', top: 80 }}>
            {/* Avatar */}
            <Avatar
              sx={{
                width: { xs: 72, md: 88 },
                height: { xs: 72, md: 88 },
                fontSize: { xs: '1.6rem', md: '2rem' },
                bgcolor: avatarColor,
                mx: 'auto',
                mb: 2,
                boxShadow: `0 0 0 4px ${alpha(avatarColor, 0.15)}`,
              }}
            >
              {getInitials(user.name, user.username)}
            </Avatar>

            <Typography variant="h6" fontWeight={700} gutterBottom noWrap>
              {user.name || user.username}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom noWrap>
              @{user.username}
            </Typography>
            {user.email && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }} noWrap>
                {user.email}
              </Typography>
            )}

            <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" sx={{ mb: 2.5, gap: 0.5 }}>
              <Chip
                label={getProfileName(parseInt(user.profil))}
                size="small"
                sx={{ bgcolor: alpha(avatarColor, 0.12), color: avatarColor, fontWeight: 700, fontSize: '0.7rem' }}
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
            </Stack>

            {user.interfaces?.length > 0 && (
              <Chip
                icon={<SecurityIcon sx={{ fontSize: '0.85rem !important' }} />}
                label={`${user.interfaces.length} permissões`}
                size="small"
                variant="outlined"
                sx={{ mb: 2.5, fontSize: '0.7rem' }}
              />
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Ações rápidas */}
            <Stack spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<LockResetIcon />}
                onClick={() => setResetPasswordDialog(true)}
              >
                Repor Password
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                color={user.status === 'disabled' ? 'success' : 'error'}
                startIcon={user.status === 'disabled' ? <CheckCircleIcon /> : <BlockIcon />}
                onClick={handleToggleStatus}
              >
                {user.status === 'disabled' ? 'Ativar conta' : 'Desativar conta'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialog(true)}
              >
                Apagar utilizador
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* ── CONTEÚDO PRINCIPAL ──────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant={isMobile ? 'fullWidth' : 'standard'}>
              <Tab icon={<PersonIcon />} iconPosition="start" label="Perfil" />
              <Tab icon={<SecurityIcon />} iconPosition="start" label="Permissões" />
            </Tabs>
          </Box>

          {/* ── TAB 0: PERFIL ──────────────────────────────────────────── */}
          {activeTab === 0 && (
            <Paper sx={{ p: { xs: 2, sm: 3 } }}>
              {/* Secção: Acesso */}
              <FormSection icon={BadgeIcon} title="Acesso">
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth size="small" label="Username" required
                    value={formData.username}
                    onChange={e => updateField('username', e.target.value)}
                    disabled={!isEditing}
                    error={!!errors.username} helperText={errors.username}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth size="small" select label="Perfil"
                    value={formData.profil}
                    onChange={e => updateField('profil', e.target.value)}
                    disabled={!isEditing}
                  >
                    {profiles.map(p => (
                      <MenuItem key={p.pk} value={String(p.pk)}>
                        {p.name || `Perfil ${p.pk}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
              </FormSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Secção: Dados Pessoais */}
              <FormSection icon={PersonIcon} title="Dados Pessoais">
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth size="small" label="Nome Completo"
                    value={formData.name}
                    onChange={e => updateField('name', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth size="small" type="email" label="Email" required
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    disabled={!isEditing}
                    error={!!errors.email} helperText={errors.email}
                    InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} /> }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth size="small" label="Telefone"
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    disabled={!isEditing}
                    InputProps={{ startAdornment: <PhoneIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} /> }}
                  />
                </Grid>
              </FormSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Secção: Morada */}
              <FormSection icon={HomeIcon} title="Morada">
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth size="small" label="Rua / Morada"
                    value={formData.address}
                    onChange={e => updateField('address', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth size="small" label="Código Postal"
                    value={formData.postal}
                    onChange={e => updateField('postal', e.target.value)}
                    disabled={!isEditing}
                    placeholder="XXXX-XXX"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3.5 }}>
                  <TextField
                    fullWidth size="small" label="Porta"
                    value={formData.door}
                    onChange={e => updateField('door', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3.5 }}>
                  <TextField
                    fullWidth size="small" label="Andar"
                    value={formData.floor}
                    onChange={e => updateField('floor', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth size="small" label="Localidade"
                    value={formData.nut4}
                    onChange={e => updateField('nut4', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
              </FormSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Secção: Identificação */}
              <FormSection icon={BadgeIcon} title="Identificação">
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth size="small" select label="Tipo Identificação"
                    value={formData.ident_type}
                    onChange={e => updateField('ident_type', e.target.value)}
                    disabled={!isEditing || identTypesLoading}
                  >
                    <MenuItem value=""><em>Nenhum</em></MenuItem>
                    {identTypes?.map(t => (
                      <MenuItem key={t.pk} value={t.pk}>{t.descr}</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 7 }}>
                  <TextField
                    fullWidth size="small" label="Nº Identificação"
                    value={formData.ident_value}
                    onChange={e => updateField('ident_value', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth size="small" label="Observações" multiline rows={2}
                    value={formData.descr}
                    onChange={e => updateField('descr', e.target.value)}
                    disabled={!isEditing}
                  />
                </Grid>
              </FormSection>

              {/* Barra de ações do formulário */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}`, mt: 1 }}>
                {isEditing ? (
                  <>
                    <Button variant="outlined" size="small" startIcon={<CancelIcon />} onClick={handleCancel} disabled={isSaving}>
                      Cancelar
                    </Button>
                    <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSave} disabled={!hasChanges || isSaving}>
                      {isSaving ? 'A guardar…' : 'Guardar alterações'}
                    </Button>
                  </>
                ) : (
                  <Button variant="contained" size="small" startIcon={<EditIcon />} onClick={() => setIsEditing(true)}>
                    Editar perfil
                  </Button>
                )}
              </Box>
            </Paper>
          )}

          {/* ── TAB 1: PERMISSÕES ──────────────────────────────────────── */}
          {activeTab === 1 && (
            <UserPermissionsEditor
              userId={userId}
              currentPermissions={user.interfaces}
              onSave={handlePermissionsSaved}
            />
          )}
        </Grid>
      </Grid>

      {/* ── Diálogo: Repor Password ──────────────────────────────────────── */}
      <Dialog
        open={resetPasswordDialog}
        onClose={() => { setResetPasswordDialog(false); setTempPassword(null); }}
        maxWidth="sm" fullWidth
      >
        <DialogTitle>Repor Password</DialogTitle>
        <DialogContent>
          {!tempPassword ? (
            <DialogContentText>
              Será gerada uma password temporária para <strong>{user.username}</strong>.
              O utilizador deverá alterá-la no primeiro acesso.
            </DialogContentText>
          ) : (
            <Box sx={{ pt: 1 }}>
              <Alert severity="success" sx={{ mb: 2 }}>Password reposta com sucesso.</Alert>
              <Typography variant="body2" gutterBottom>
                Password temporária para <strong>{user.username}</strong>:
              </Typography>
              <Box
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, mt: 1, p: 1.5,
                  borderRadius: 1,
                  bgcolor: alpha(avatarColor, 0.06),
                  border: `1px solid ${alpha(avatarColor, 0.2)}`,
                }}
              >
                <Typography sx={{ flex: 1, fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: 1 }}>
                  {tempPassword}
                </Typography>
                <Tooltip title="Copiar">
                  <IconButton size="small" onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    notification.success('Copiado para a área de transferência');
                  }}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Copie e partilhe com o utilizador. Não será mostrada novamente.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!tempPassword ? (
            <>
              <Button onClick={() => setResetPasswordDialog(false)}>Cancelar</Button>
              <Button onClick={handleResetPassword} variant="contained">Repor Password</Button>
            </>
          ) : (
            <Button onClick={() => { setResetPasswordDialog(false); setTempPassword(null); }} variant="contained">
              Fechar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Apagar ──────────────────────────────────────────────── */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar eliminação</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem a certeza que pretende apagar o utilizador <strong>{user.username}</strong>?
            Esta ação é irreversível.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Apagar</Button>
        </DialogActions>
      </Dialog>
    </ModulePage>
  );
};

export default UserDetailPage;
