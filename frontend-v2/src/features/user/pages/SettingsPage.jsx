/**
 * SettingsPage
 * Configurações do utilizador: perfil, tema, notificações, acessibilidade
 */

import { useState } from 'react';
import {
  Box, Grid, Paper, Typography, Switch, FormControlLabel, Divider,
  Button, TextField, Stack, Chip, Card, CardContent, CardHeader,
  useTheme, alpha, Avatar, IconButton, Tooltip,
} from '@mui/material';
import {
  Settings as SettingsIcon, Palette as ThemeIcon,
  Notifications as NotifIcon, Security as SecurityIcon,
  Person as PersonIcon, Save as SaveIcon,
  Language as LangIcon, Accessibility as AccessIcon,
  KeyboardArrowRight as ArrowIcon, Lock as LockIcon,
} from '@mui/icons-material';
import notification from '@/core/services/notification';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useAuth } from '@/core/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Secção genérica ──────────────────────────────────────────────────────────

const Section = ({ title, icon: Icon, color, children }) => {
  const theme = useTheme();
  return (
    <Paper sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
      <Box sx={{
        px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 2,
        bgcolor: alpha(color || theme.palette.primary.main, 0.06),
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}>
        {Icon && <Icon sx={{ color: color || 'primary.main', fontSize: 22 }} />}
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Paper>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const SettingsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  // Estados de preferências
  const [prefs, setPrefs] = useState({
    emailNotifications: true,
    systemNotifications: true,
    soundAlerts: false,
    compactMode: false,
    highContrast: false,
    language: 'pt-PT',
  });

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    // As preferências são guardadas localmente (localStorage) por ora
    localStorage.setItem('aintar_prefs', JSON.stringify(prefs));
    notification.success('Preferências guardadas com sucesso!');
  };

  return (
    <ModulePage
      title="Configurações"
      subtitle="Preferências pessoais e configurações da conta"
      icon={SettingsIcon}
      color="#607d8b"
      breadcrumbs={[
        { label: 'Configurações', path: '/settings' },
      ]}
      actions={
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} size="small">
          Guardar
        </Button>
      }
    >
      <Grid container spacing={3}>
        {/* Coluna esquerda */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Perfil Resumo */}
          <Section title="A Minha Conta" icon={PersonIcon} color={theme.palette.primary.main}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  width: 72, height: 72, mx: 'auto', mb: 1.5,
                  bgcolor: theme.palette.primary.main, fontSize: '1.8rem', fontWeight: 700,
                }}
              >
                {user?.user_name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <Typography variant="h6" fontWeight={700}>{user?.user_name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              {user?.user_type_name && (
                <Chip label={user.user_type_name} size="small" color="primary" sx={{ mt: 1 }} />
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1}>
              <Button
                fullWidth variant="outlined" size="small"
                startIcon={<PersonIcon />} endIcon={<ArrowIcon />}
                onClick={() => navigate('/profile')}
                sx={{ justifyContent: 'space-between' }}
              >
                Editar Perfil
              </Button>
              <Button
                fullWidth variant="outlined" size="small" color="warning"
                startIcon={<LockIcon />} endIcon={<ArrowIcon />}
                onClick={() => navigate('/change-password')}
                sx={{ justifyContent: 'space-between' }}
              >
                Alterar Password
              </Button>
            </Stack>
          </Section>
        </Grid>

        {/* Coluna direita */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Notificações */}
          <Section title="Notificações" icon={NotifIcon} color={theme.palette.info.main}>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={prefs.emailNotifications} onChange={() => toggle('emailNotifications')} color="info" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Notificações por Email</Typography>
                    <Typography variant="caption" color="text.secondary">Receber alertas e resumos por email</Typography>
                  </Box>
                }
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0 }}
              />
              <Divider />
              <FormControlLabel
                control={<Switch checked={prefs.systemNotifications} onChange={() => toggle('systemNotifications')} color="info" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Notificações do Sistema</Typography>
                    <Typography variant="caption" color="text.secondary">Alertas em tempo real na aplicação</Typography>
                  </Box>
                }
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0 }}
              />
              <Divider />
              <FormControlLabel
                control={<Switch checked={prefs.soundAlerts} onChange={() => toggle('soundAlerts')} color="info" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Alertas Sonoros</Typography>
                    <Typography variant="caption" color="text.secondary">Som nas notificações importantes</Typography>
                  </Box>
                }
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0 }}
              />
            </Stack>
          </Section>

          {/* Aparência */}
          <Section title="Aparência e Interface" icon={ThemeIcon} color={theme.palette.secondary.main}>
            <Stack spacing={2}>
              <FormControlLabel
                control={<Switch checked={prefs.compactMode} onChange={() => toggle('compactMode')} color="secondary" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Modo Compacto</Typography>
                    <Typography variant="caption" color="text.secondary">Reduzir espaçamento nas tabelas e listas</Typography>
                  </Box>
                }
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0 }}
              />
              <Divider />
              <FormControlLabel
                control={<Switch checked={prefs.highContrast} onChange={() => toggle('highContrast')} color="secondary" />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Alto Contraste</Typography>
                    <Typography variant="caption" color="text.secondary">Melhorar visibilidade dos elementos</Typography>
                  </Box>
                }
                labelPlacement="start"
                sx={{ justifyContent: 'space-between', ml: 0 }}
              />
            </Stack>
          </Section>

          {/* Acessibilidade */}
          <Section title="Região e Idioma" icon={LangIcon} color={theme.palette.success.main}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Idioma"
                  value="Português (Portugal)" disabled
                  helperText="Apenas PT disponível"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth size="small" label="Fuso Horário"
                  value="Europa/Lisboa (UTC+0/+1)" disabled
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth size="small" label="Formato de Data"
                  value="DD/MM/AAAA" disabled
                />
              </Grid>
            </Grid>
          </Section>
        </Grid>
      </Grid>

      {/* Guardar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={handleSave}>
          Guardar Preferências
        </Button>
      </Box>
    </ModulePage>
  );
};

export default SettingsPage;
