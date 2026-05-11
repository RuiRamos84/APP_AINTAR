import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Divider,
  Stack,
  alpha,
  useTheme,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Badge as BadgeIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { useAuth } from '@/core/contexts/AuthContext';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import AddressFields from '@/shared/components/form/AddressFields';
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';

/**
 * PortalPerfilPage
 * Página de gestão de perfil do cliente.
 */
const PortalPerfilPage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const {
    formData,
    errors,
    isLoading,
    isSaving,
    isEditing,
    hasChanges,
    updateField,
    updateFields,
    handleEdit,
    handleCancel,
    handleSave,
    hasError,
    getFieldError
  } = useUserProfile(user);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <PortalPageHeader
        title="O Meu Perfil"
        subtitle="Gerir os seus dados pessoais e contactos."
      />
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Cabeçalho de Perfil */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 3, flexDirection: { xs: 'column', sm: 'row' }, textAlign: { xs: 'center', sm: 'left' } }}>
          <Avatar 
            sx={{ 
              width: 100, 
              height: 100, 
              background: 'linear-gradient(135deg, #1B5E8E 0%, #29B5E8 100%)',
              fontSize: '2.5rem',
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(27, 94, 142, 0.25)'
            }}
          >
            {formData.name?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant="h4" 
              fontWeight={800} 
              className="text-gradient"
              sx={{ mb: 0.5 }}
            >
              {formData.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Cliente AINTAR • {formData.nipc}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Tooltip title="Dados Validados">
                <BadgeIcon color="success" fontSize="small" />
              </Tooltip>
              <Tooltip title="Conta Ativa">
                <SecurityIcon color="info" fontSize="small" />
              </Tooltip>
            </Stack>
          </Box>
          {!isEditing ? (
            <Button 
              variant="contained" 
              startIcon={<EditIcon />}
              onClick={handleEdit}
              sx={{ borderRadius: 3, px: 3 }}
            >
              Editar Perfil
            </Button>
          ) : (
            <Stack direction="row" spacing={2}>
              <Button 
                variant="outlined" 
                color="inherit" 
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                sx={{ borderRadius: 3 }}
              >
                Cancelar
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                sx={{ borderRadius: 3, px: 3 }}
              >
                Guardar
              </Button>
            </Stack>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Informação Geral */}
          <Grid size={12}>
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="primary" /> Informação Pessoal
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Nome Completo"
                      fullWidth
                      disabled={!isEditing}
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      error={hasError('name')}
                      helperText={getFieldError('name')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="NIF / NIPC"
                      fullWidth
                      disabled={true} // NIF normalmente não é editável pelo próprio utilizador por questões fiscais
                      value={formData.nipc}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Email"
                      fullWidth
                      disabled={!isEditing}
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      InputProps={{
                        startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.disabled' }} />
                      }}
                      error={hasError('email')}
                      helperText={getFieldError('email')}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Telemóvel"
                      fullWidth
                      disabled={!isEditing}
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      InputProps={{
                        startAdornment: <PhoneIcon sx={{ mr: 1, color: 'text.disabled' }} />
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Morada Principal */}
          <Grid size={12}>
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon color="primary" /> Morada de Faturação
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <AddressFields 
                  formData={formData}
                  updateFields={updateFields}
                  disabled={!isEditing}
                  errors={errors}
                  showNotifications={false}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};

export default PortalPerfilPage;
