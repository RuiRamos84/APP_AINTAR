import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  FormControlLabel,
  Switch,
  Divider,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert
} from '@mui/material';
import {
  Save as SaveIcon,
  Backup as BackupIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { restartServer } from "../../services/authService";
import { notifySuccess, notifyError } from "../../components/common/Toaster/ThemedToaster";
import api from "../../services/api";

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    appName: "AINTAR App",
    emailSender: "noreply@aintar.pt",
    defaultTimeout: "30",
    maxFileSize: "10",
    enableNotifications: true,
    debugMode: false,
    maintenanceMode: false,
    backupFrequency: "daily",
  });

  const [backups, setBackups] = useState([
    { id: 1, name: "backup-20241025.zip", date: "25/10/2024 09:32", size: "156 MB" },
    { id: 2, name: "backup-20241024.zip", date: "24/10/2024 09:30", size: "154 MB" },
    { id: 3, name: "backup-20241023.zip", date: "23/10/2024 09:31", size: "153 MB" },
  ]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setSettings({ ...settings, [name]: checked });
  };

  const handleSaveSettings = () => {
    // Simulação de salvamento de configurações
    notifySuccess("Configurações salvas com sucesso");
  };

  const handleBackup = () => {
    // Simulação de backup
    const newBackup = {
      id: backups.length + 1,
      name: `backup-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.zip`,
      date: new Date().toLocaleString('pt-PT').replace(',', ''),
      size: "155 MB"
    };
    setBackups([newBackup, ...backups]);
    notifySuccess("Backup criado com sucesso");
  };

  const handleRestore = (backupId) => {
    // Simulação de restauro de backup
    notifySuccess(`Backup #${backupId} restaurado com sucesso`);
  };

  const handleDeleteBackup = (backupId) => {
    // Simulação de exclusão de backup
    setBackups(backups.filter(backup => backup.id !== backupId));
    notifySuccess(`Backup #${backupId} removido com sucesso`);
  };

  const handleRestart = async () => {
    try {
      const response = await restartServer();
      notifySuccess(response.message);
    } catch (error) {
      notifyError("Erro ao reiniciar o servidor");
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Configurações do Sistema</Typography>
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Configurações Gerais
            </Typography>
            <Box component="form" noValidate autoComplete="off">
              <TextField
                fullWidth
                margin="normal"
                label="Nome da Aplicação"
                name="appName"
                value={settings.appName}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Email de Envio"
                name="emailSender"
                value={settings.emailSender}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Timeout de Sessão (minutos)"
                name="defaultTimeout"
                type="number"
                value={settings.defaultTimeout}
                onChange={handleInputChange}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Tamanho Máximo de Arquivo (MB)"
                name="maxFileSize"
                type="number"
                value={settings.maxFileSize}
                onChange={handleInputChange}
              />
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enableNotifications}
                      onChange={handleSwitchChange}
                      name="enableNotifications"
                    />
                  }
                  label="Ativar Notificações"
                />
              </Box>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.debugMode}
                      onChange={handleSwitchChange}
                      name="debugMode"
                    />
                  }
                  label="Modo de Depuração"
                />
              </Box>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={handleSwitchChange}
                      name="maintenanceMode"
                    />
                  }
                  label="Modo de Manutenção"
                />
              </Box>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                sx={{ mt: 2 }}
              >
                Salvar Configurações
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ações do Sistema
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={handleRestart}
                >
                  Reiniciar Servidor
                </Button>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="warning"
                  onClick={async () => {
                    try {
                      await api.post('/clear-metadata-cache');
                      notifySuccess("Cache de metadados limpo");
                    } catch (error) {
                      notifyError("Erro ao limpar cache");
                    }
                  }}
                >
                  Limpar Cache MetaDados
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12 }} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Backup e Restauro
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <TextField
                select
                label="Frequência de Backup Automático"
                name="backupFrequency"
                value={settings.backupFrequency}
                onChange={handleInputChange}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="hourly">A cada hora</option>
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="never">Nunca</option>
              </TextField>
            </FormControl>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<BackupIcon />}
              onClick={handleBackup}
              sx={{ mt: 2, mb: 3 }}
            >
              Criar Backup Agora
            </Button>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Backups Disponíveis
            </Typography>
            
            {backups.length === 0 ? (
              <Alert severity="info">Nenhum backup disponível</Alert>
            ) : (
              <List>
                {backups.map((backup) => (
                  <ListItem
                    key={backup.id}
                    secondaryAction={
                      <>
                        <Button 
                          size="small" 
                          onClick={() => handleRestore(backup.id)}
                          sx={{ mr: 1 }}
                        >
                          Restaurar
                        </Button>
                        <IconButton 
                          edge="end" 
                          onClick={() => handleDeleteBackup(backup.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    }
                  >
                    <ListItemText
                      primary={backup.name}
                      secondary={`${backup.date} • ${backup.size}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemSettings;