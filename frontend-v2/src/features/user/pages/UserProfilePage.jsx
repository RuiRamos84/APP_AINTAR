/**
 * UserProfilePage
 * Página moderna para visualizar e editar perfil do utilizador
 *
 * Features:
 * - Ver informações do perfil
 * - Editar informações pessoais
 * - Upload de avatar (futuro)
 * - Seções colapsáveis para organização
 * - Validação em tempo real
 * - UX/UI moderna e responsiva
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  IconButton,
  Collapse,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useAuth } from '@/core/contexts/AuthContext';
import { getUserInfo, updateUserInfo } from '@/services/userService';

const UserProfilePage = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Seções expandidas
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contact: true,
    address: false,
    description: false,
  });

  // Dados do formulário
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    nipc: '',
    ident_type: '',
    ident_value: '',
    address: '',
    postal: '',
    city: '',
    country: 'Portugal',
    descr: '',
  });

  // Dados originais (para cancelar edição)
  const [originalData, setOriginalData] = useState({});

  // Carregar dados do utilizador
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const response = await getUserInfo();

        // A resposta já vem como objeto direto (apiClient faz unwrap)
        // Pode vir como {user_info: {...}} ou diretamente como {...}
        const userData = response?.user_info || response;

        const mappedData = {
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          nipc: userData.nipc || '',
          ident_type: userData.ident_type || '',
          ident_value: userData.ident_value || '',
          address: userData.address || '',
          postal: userData.postal || '',
          city: userData.city || '',
          country: userData.country || 'Portugal',
          descr: userData.descr || '',
        };

        setFormData(mappedData);
        setOriginalData(mappedData);
      } catch (err) {
        console.error('[UserProfilePage] Error loading user data:', err);
        setError(err.response?.data?.message || err.message || 'Erro ao carregar dados do utilizador');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Toggle seção
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Atualizar campo
  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setError(null);
  };

  // Iniciar edição
  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(false);
  };

  // Cancelar edição
  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setError(null);
  };

  // Guardar alterações
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Validação básica
      if (!formData.name?.trim()) {
        throw new Error('Nome é obrigatório');
      }
      if (!formData.email?.trim()) {
        throw new Error('Email é obrigatório');
      }
      if (!formData.address?.trim()) {
        throw new Error('Morada é obrigatória');
      }
      if (!formData.postal?.trim()) {
        throw new Error('Código Postal é obrigatório');
      }
      if (!formData.phone?.trim()) {
        throw new Error('Telefone é obrigatório');
      }

      // Chamar API para atualizar perfil
      await updateUserInfo(formData);

      setOriginalData(formData);
      setIsEditing(false);
      setSuccess(true);

      // Limpar mensagem de sucesso após 3s
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Erro ao guardar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  // Obter iniciais
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Verificar se houve alterações
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header com Avatar */}
      <Paper sx={{ p: 3, mb: 3, textAlign: 'center', position: 'relative' }}>
        <Avatar
          sx={{
            width: 120,
            height: 120,
            fontSize: '3rem',
            bgcolor: 'primary.main',
            margin: '0 auto',
            mb: 2,
          }}
        >
          {getInitials(formData.name)}
        </Avatar>

        <Typography variant="h4" gutterBottom>
          {formData.name || 'Utilizador'}
        </Typography>

        <Typography variant="body2" color="text.secondary" gutterBottom>
          ID: {user?.user_id} • Perfil: {user?.profil === '0' ? 'Super Admin' : 'Utilizador'}
        </Typography>

        {/* Botão de Editar */}
        {!isEditing && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            sx={{ mt: 2 }}
          >
            Editar Perfil
          </Button>
        )}

        {/* Botões de Guardar/Cancelar */}
        {isEditing && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? 'A guardar...' : 'Guardar'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Mensagens de Feedback */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          Perfil atualizado com sucesso!
        </Alert>
      )}

      {/* Seção: Informações Pessoais */}
      <Paper sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => toggleSection('personal')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            <Typography variant="h6">Informações Pessoais</Typography>
          </Box>
          <IconButton
            size="small"
            sx={{
              transform: expandedSections.personal ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expandedSections.personal}>
          <Divider />
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Número Fiscal (NIPC)"
                  value={formData.nipc}
                  onChange={handleChange('nipc')}
                  disabled={!isEditing}
                  required
                  inputProps={{ maxLength: 9 }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 9 }}>
                <TextField
                  fullWidth
                  label="Nome Completo"
                  value={formData.name}
                  onChange={handleChange('name')}
                  disabled={!isEditing}
                  required
                  InputProps={{
                    startAdornment: <BadgeIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Tipo de Identificação"
                  value={formData.ident_type}
                  onChange={handleChange('ident_type')}
                  disabled={!isEditing}
                  placeholder="Ex: BI, CC, Passaporte"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Número de Identificação"
                  value={formData.ident_value}
                  onChange={handleChange('ident_value')}
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Seção: Contactos */}
      <Paper sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => toggleSection('contact')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon color="primary" />
            <Typography variant="h6">Contactos</Typography>
          </Box>
          <IconButton
            size="small"
            sx={{
              transform: expandedSections.contact ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expandedSections.contact}>
          <Divider />
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange('email')}
                  disabled={!isEditing}
                  required
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  disabled={!isEditing}
                  InputProps={{
                    startAdornment: <PhoneIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Seção: Morada */}
      <Paper sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => toggleSection('address')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            <Typography variant="h6">Morada</Typography>
          </Box>
          <IconButton
            size="small"
            sx={{
              transform: expandedSections.address ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expandedSections.address}>
          <Divider />
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Morada"
                  value={formData.address}
                  onChange={handleChange('address')}
                  disabled={!isEditing}
                  multiline
                  rows={2}
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={formData.postal}
                  onChange={handleChange('postal')}
                  disabled={!isEditing}
                  placeholder="0000-000"
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="Cidade"
                  value={formData.city}
                  onChange={handleChange('city')}
                  disabled={!isEditing}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  label="País"
                  value={formData.country}
                  onChange={handleChange('country')}
                  disabled={!isEditing}
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Seção: Outros */}
      <Paper sx={{ mb: 2 }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setExpandedSections((prev) => ({ ...prev, description: !prev.description }))}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            <Typography variant="h6">Outros</Typography>
          </Box>
          <IconButton
            size="small"
            sx={{
              transform: expandedSections.description ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        <Collapse in={expandedSections.description}>
          <Divider />
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Descrição"
                  value={formData.descr}
                  onChange={handleChange('descr')}
                  disabled={!isEditing}
                  multiline
                  rows={4}
                  placeholder="Informações adicionais..."
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Paper>

      {/* Loading Indicator */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
    </Container>
  );
};

export default UserProfilePage;
