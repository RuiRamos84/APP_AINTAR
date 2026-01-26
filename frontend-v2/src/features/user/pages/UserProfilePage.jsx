/**
 * UserProfilePage
 * Página moderna para visualizar e editar perfil do utilizador com validação Zod
 *
 * Features:
 * - Ver informações do perfil
 * - Editar informações pessoais
 * - Validação com Zod schema
 * - Upload de avatar (futuro)
 * - Seções colapsáveis para organização
 * - Validação em tempo real
 * - UX/UI moderna e responsiva
 */

import { useState } from 'react';
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
  CircularProgress,
  MenuItem,
  InputAdornment,
  Tooltip,
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
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useAuth } from '@/core/contexts/AuthContext';
import { useIdentTypes } from '@/core/hooks/useMetaData';
import { usePostalCode } from '@/core/hooks/usePostalCode';
import { useUserProfile } from '../hooks';

const UserProfilePage = () => {
  const { user } = useAuth();
  const { data: identTypes, isLoading: identTypesLoading } = useIdentTypes();

  const {
    formData,
    isLoading,
    isSaving,
    isEditing,
    hasChanges,
    updateField,
    updateFields,
    handleEdit,
    handleCancel,
    handleSave,
    getFieldError,
    hasError,
  } = useUserProfile(user);

  // Seções expandidas
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    contact: true,
    address: false,
    description: false,
  });

  // Hook para código postal com auto-preenchimento
  const postalCodeHook = usePostalCode({
    onAddressFound: ({ streets, administrativeData }) => {
      // Auto-preencher campos administrativos usando updateFields do hook
      updateFields({
        nut1: administrativeData.nut1,
        nut2: administrativeData.nut2,
        nut3: administrativeData.nut3,
        nut4: administrativeData.nut4,
        // Se só existe 1 rua, selecionar automaticamente
        // Se existem mais de 1, limpar para utilizador selecionar
        address: streets.length === 1 ? streets[0] : '',
      });
    },
    showNotifications: true,
  });

  // Toggle seção
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handler especial para código postal com auto-preenchimento
  const handlePostalCodeChange = (event) => {
    const formatted = postalCodeHook.handlePostalCodeChange(event.target.value);

    // Se o código postal não está completo, limpar todos os campos relacionados
    if (formatted.length < 8) { // 8 caracteres = XXXX-XXX
      updateFields({
        postal: formatted,
        address: '',
        nut1: '',
        nut2: '',
        nut3: '',
        nut4: '',
      });
    } else {
      // Código postal completo, apenas atualizar o campo
      updateField('postal', formatted);
    }
  };

  // Handler para seleção de rua
  const handleAddressChange = (event) => {
    const selectedAddress = event.target.value;

    // Se selecionar "Outra", ativar modo manual
    if (selectedAddress === 'Outra') {
      postalCodeHook.enableManualMode();
      updateField('address', '');
    } else {
      updateField('address', selectedAddress);
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
                  onChange={(e) => updateField('nipc', e.target.value)}
                  disabled={!isEditing}
                  error={hasError('nipc')}
                  helperText={getFieldError('nipc')}
                  inputProps={{ maxLength: 9 }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 9 }}>
                <TextField
                  fullWidth
                  label="Nome Completo"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={!isEditing}
                  required
                  error={hasError('name')}
                  helperText={getFieldError('name')}
                  InputProps={{
                    startAdornment: <BadgeIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Tipo de Identificação"
                  value={formData.ident_type || ''}
                  onChange={(e) => updateField('ident_type', e.target.value)}
                  disabled={!isEditing || identTypesLoading}
                  error={hasError('ident_type')}
                  helperText={getFieldError('ident_type') || (identTypesLoading ? 'A carregar tipos...' : '')}
                >
                  <MenuItem value="">
                    <em>Nenhum</em>
                  </MenuItem>
                  {identTypes?.map((type) => (
                    <MenuItem key={type.pk} value={type.pk}>
                      {type.descr}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Número de Identificação"
                  value={formData.ident_value}
                  onChange={(e) => updateField('ident_value', e.target.value)}
                  disabled={!isEditing}
                  error={hasError('ident_value')}
                  helperText={getFieldError('ident_value')}
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
                  onChange={(e) => updateField('email', e.target.value)}
                  disabled={!isEditing}
                  required
                  error={hasError('email')}
                  helperText={getFieldError('email')}
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
                  onChange={(e) => updateField('phone', e.target.value)}
                  disabled={!isEditing}
                  error={hasError('phone')}
                  helperText={getFieldError('phone')}
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
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Código Postal"
                  value={formData.postal}
                  onChange={handlePostalCodeChange}
                  disabled={!isEditing}
                  placeholder="0000-000"
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: isEditing && postalCodeHook.loading ? (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    ) : isEditing && postalCodeHook.success ? (
                      <InputAdornment position="end">
                        <Tooltip title="Código postal encontrado!">
                          <CheckCircleIcon color="success" />
                        </Tooltip>
                      </InputAdornment>
                    ) : null,
                  }}
                  helperText={
                    isEditing
                      ? postalCodeHook.loading
                        ? 'A procurar endereço...'
                        : postalCodeHook.success
                        ? 'Endereço encontrado!'
                        : 'Formato: XXXX-XXX'
                      : ''
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                {postalCodeHook.streets.length > 0 && !postalCodeHook.manualMode ? (
                  <TextField
                    fullWidth
                    select
                    label="Morada"
                    value={formData.address}
                    onChange={handleAddressChange}
                    disabled={!isEditing}
                    required
                    helperText={
                      isEditing && !formData.address
                        ? `${postalCodeHook.streets.length} ${postalCodeHook.streets.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}`
                        : ''
                    }
                  >
                    {postalCodeHook.streets.map((street, index) => (
                      <MenuItem key={index} value={street}>
                        {street}
                      </MenuItem>
                    ))}
                    <MenuItem value="Outra">
                      <em>Outra (entrada manual)</em>
                    </MenuItem>
                  </TextField>
                ) : (
                  <TextField
                    fullWidth
                    label="Morada"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    disabled={!isEditing}
                    required
                    error={hasError('address')}
                    helperText={
                      getFieldError('address') ||
                      (isEditing
                        ? postalCodeHook.manualMode
                          ? 'Modo manual - insira a morada'
                          : 'Insira o código postal primeiro'
                        : '')
                    }
                  />
                )}
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Porta"
                  value={formData.door}
                  onChange={(e) => updateField('door', e.target.value)}
                  disabled={!isEditing}
                  error={hasError('door')}
                  helperText={getFieldError('door')}
                  placeholder="Ex: 1A"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 2 }}>
                <TextField
                  fullWidth
                  label="Andar"
                  value={formData.floor}
                  onChange={(e) => updateField('floor', e.target.value)}
                  disabled={!isEditing}
                  error={hasError('floor')}
                  helperText={getFieldError('floor')}
                  placeholder="Ex: 2º"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Localidade"
                  value={formData.nut4}
                  onChange={handleChange('nut4')}
                  disabled={!isEditing || postalCodeHook.success}
                  helperText={isEditing && postalCodeHook.success ? 'Auto-preenchido' : ''}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Freguesia"
                  value={formData.nut3}
                  onChange={handleChange('nut3')}
                  disabled={!isEditing || postalCodeHook.success}
                  helperText={isEditing && postalCodeHook.success ? 'Auto-preenchido' : ''}
                />
              </Grid>


              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Concelho"
                  value={formData.nut2}
                  onChange={handleChange('nut2')}
                  disabled={!isEditing || postalCodeHook.success}
                  helperText={isEditing && postalCodeHook.success ? 'Auto-preenchido' : ''}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  label="Distrito"
                  value={formData.nut1}
                  onChange={handleChange('nut1')}
                  disabled={!isEditing || postalCodeHook.success}
                  helperText={isEditing && postalCodeHook.success ? 'Auto-preenchido' : ''}
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
                  onChange={(e) => updateField('descr', e.target.value)}
                  disabled={!isEditing}
                  error={hasError('descr')}
                  helperText={getFieldError('descr')}
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
