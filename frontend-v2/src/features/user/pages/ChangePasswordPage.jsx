/**
 * ChangePasswordPage
 * Página moderna para alterar password com validação Zod
 *
 * Features:
 * - Validação de password forte com Zod schema
 * - Toggle de visibilidade de password
 * - Indicador de força da password
 * - Feedback visual em tempo real
 * - UX/UI moderna
 */

import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useChangePassword } from '../hooks';

const ChangePasswordPage = () => {
  const {
    formData,
    errors,
    isLoading,
    passwordRequirements,
    passwordStrength,
    isPasswordValid,
    passwordsMatch,
    updateField,
    handleSubmit,
    getFieldError,
    hasError,
    getStrengthColor,
    getStrengthText,
  } = useChangePassword();

  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  // Toggle visibilidade
  const toggleVisibility = (field) => () => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              display: 'inline-flex',
              p: 2,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              mb: 2,
            }}
          >
            <LockIcon sx={{ fontSize: 40 }} />
          </Box>

          <Typography variant="h4" gutterBottom>
            Alterar Password
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Escolha uma password forte e única
          </Typography>
        </Box>

        {/* Formulário */}
        <Box component="form" onSubmit={handleSubmit}>
          {/* Password Atual */}
          <TextField
            fullWidth
            label="Password Atual"
            type={showPasswords.old ? 'text' : 'password'}
            value={formData.oldPassword}
            onChange={(e) => updateField('oldPassword', e.target.value)}
            required
            error={hasError('oldPassword')}
            helperText={getFieldError('oldPassword')}
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleVisibility('old')} edge="end">
                    {showPasswords.old ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Nova Password */}
          <TextField
            fullWidth
            label="Nova Password"
            type={showPasswords.new ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => updateField('newPassword', e.target.value)}
            required
            error={hasError('newPassword')}
            helperText={getFieldError('newPassword')}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleVisibility('new')} edge="end">
                    {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Indicador de Força */}
          {formData.newPassword && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Força da password
                </Typography>
                <Typography variant="caption" color={`${getStrengthColor()}.main`}>
                  {getStrengthText()}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(passwordStrength / 4) * 100}
                color={getStrengthColor()}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
          )}

          {/* Confirmar Password */}
          <TextField
            fullWidth
            label="Confirmar Password"
            type={showPasswords.confirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
            required
            error={hasError('confirmPassword') || (formData.confirmPassword.length > 0 && !passwordsMatch)}
            helperText={
              getFieldError('confirmPassword') ||
              (formData.confirmPassword.length > 0 && !passwordsMatch
                ? 'As passwords não coincidem'
                : '')
            }
            sx={{ mb: 3 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={toggleVisibility('confirm')} edge="end">
                    {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Requisitos de Password */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              Requisitos da password:
            </Typography>

            <List dense>
              <ListItem disablePadding>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {passwordRequirements.minLength ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : (
                    <CloseIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Mínimo 8 caracteres"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>

              <ListItem disablePadding>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {passwordRequirements.hasLetter ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : (
                    <CloseIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Pelo menos uma letra"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>

              <ListItem disablePadding>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {passwordRequirements.hasNumber ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : (
                    <CloseIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Pelo menos um número"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>

              <ListItem disablePadding>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {passwordRequirements.hasSpecial ? (
                    <CheckIcon color="success" fontSize="small" />
                  ) : (
                    <CloseIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary="Pelo menos um caractere especial"
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </Paper>

          {/* Botão de Submit */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={!isPasswordValid || !passwordsMatch || isLoading}
            startIcon={isLoading && <CircularProgress size={20} />}
          >
            {isLoading ? 'A alterar...' : 'Alterar Password'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ChangePasswordPage;
