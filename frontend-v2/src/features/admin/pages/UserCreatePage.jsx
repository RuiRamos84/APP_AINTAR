/**
 * UserCreatePage (Admin)
 * Página de criação de novo utilizador (Admin)
 *
 * Features:
 * - Criar novo utilizador
 * - Definir perfil (admin/user)
 * - Geração de username automático
 * - Password temporária
 * - Validação de campos obrigatórios
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Breadcrumbs,
  Link,
  MenuItem,
  Alert,
  Grid,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { createUserAdmin } from '@/services/userService';
import { notification } from '@/core/services/notification';
import { PageTransition, FadeIn } from '@/shared/components/animation';
import { useProfiles } from '@/core/contexts/MetadataContext';

const UserCreatePage = () => {
  const navigate = useNavigate();
  const { profiles } = useProfiles();

  // Responsividade
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    phone: '',
    profil: '2', // Default: User
    send_activation_email: false, // Enviar email de ativação?
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Atualizar campo
   */
  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  /**
   * Validar formulário
   */
  const validate = () => {
    const newErrors = {};

    if (!formData.username) newErrors.username = 'Username é obrigatório';
    if (!formData.email) newErrors.email = 'Email é obrigatório';
    if (!formData.password) newErrors.password = 'Password é obrigatória';
    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password deve ter pelo menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Guardar utilizador
   */
  const handleSave = async () => {
    if (!validate()) return;

    try {
      setIsSaving(true);
      await createUserAdmin(formData);
      notification.success('Utilizador criado com sucesso');
      navigate('/admin/users');
    } catch (err) {
      notification.error(err.message || 'Erro ao criar utilizador');
    } finally {
      setIsSaving(false);
    }
  };

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
            <Typography color="text.primary">Novo Utilizador</Typography>
          </Breadcrumbs>
        </FadeIn>

        {/* Header */}
        <FadeIn delay={0.1}>
          <Box
            sx={{
              mb: { xs: 2, sm: 3 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
            }}
          >
            <Button
              startIcon={!isMobile && <ArrowBackIcon />}
              onClick={() => navigate('/admin/users')}
              size={isMobile ? 'medium' : 'large'}
            >
              Voltar
            </Button>
            <Typography
              variant={isMobile ? 'h6' : 'h5'}
              component="h1"
              fontWeight="bold"
              sx={{ flexGrow: 1, textAlign: { xs: 'center', sm: 'left' } }}
            >
              Criar Novo Utilizador
            </Typography>
            <Button
              variant="contained"
              startIcon={!isMobile && <SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
              fullWidth={isMobile}
              size={isMobile ? 'medium' : 'large'}
            >
              {isSaving ? 'A criar...' : isMobile ? 'Criar' : 'Criar Utilizador'}
            </Button>
          </Box>
        </FadeIn>

        {/* Info */}
        <FadeIn delay={0.15}>
          <Alert severity="info" sx={{ mb: { xs: 2, sm: 3 } }}>
            O utilizador receberá um email com as credenciais de acesso.
          </Alert>
        </FadeIn>

        {/* Formulário */}
        <FadeIn delay={0.2}>
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {/* Username */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Username"
                  value={formData.username}
                  onChange={(e) => updateField('username', e.target.value)}
                  required
                  error={!!errors.username}
                  helperText={errors.username}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>

              {/* Perfil */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Perfil"
                  value={formData.profil}
                  onChange={(e) => updateField('profil', e.target.value)}
                  disabled={profiles.length === 0}
                  helperText={profiles.length === 0 ? 'A carregar perfis...' : ''}
                  size={isMobile ? 'small' : 'medium'}
                >
                  {profiles.length === 0 ? (
                    <MenuItem disabled>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      A carregar...
                    </MenuItem>
                  ) : (
                    profiles.map((profile) => (
                      <MenuItem key={profile.pk} value={String(profile.pk)}>
                        {profile.name || `Perfil ${profile.pk}`}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              </Grid>

              {/* Nome */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Nome Completo"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
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
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>

              {/* Password Inicial */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  type="password"
                  label="Password Inicial"
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                  error={!!errors.password}
                  helperText={errors.password || 'Mínimo 6 caracteres'}
                  size={isMobile ? 'small' : 'medium'}
                />
              </Grid>

              {/* Email de Ativação */}
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.send_activation_email}
                      onChange={(e) => updateField('send_activation_email', e.target.checked)}
                    />
                  }
                  label={isMobile ? 'Enviar email de ativação' : 'Enviar email de ativação (utilizador terá que validar email)'}
                />
                <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: isMobile ? 0 : 4, mt: 0.5 }}>
                  {formData.send_activation_email
                    ? 'O utilizador receberá um código de ativação por email e precisará validá-lo antes de fazer login'
                    : 'O utilizador será criado já validado e poderá fazer login imediatamente'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </FadeIn>
      </Container>
    </PageTransition>
  );
};

export default UserCreatePage;
