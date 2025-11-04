// pages/Emissions/EmissionHub.jsx
// Hub central do Sistema Unificado de Emissões
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Button,
  Fab,
  Fade,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Description as OficioIcon,
  Notifications as NotificationIcon,
  Assignment as DeclaracaoIcon,
  Info as InfoIcon,
  Gavel as DeliberacaoIcon,
  List as ListIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import EmissionList from './EmissionList';
import EmissionForm from './EmissionForm';
import TemplateManager from './TemplateManager';
import { getDocumentTypes } from '../../services/emission_service';

/**
 * EmissionHub - Dashboard principal do sistema de emissões
 * UX moderna com navegação por tabs integrados (tipo + sub-navegação)
 */
const EmissionHub = () => {
  const [mainTab, setMainTab] = useState(0); // Tab do tipo de documento
  const [subTab, setSubTab] = useState(0); // Sub-tab (Lista/Templates/Configurações)
  const [showNewForm, setShowNewForm] = useState(false);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Menu de configurações globais
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);

  // Mapeamento de ícones por código
  const iconMap = {
    OFI: OficioIcon,
    NOT: NotificationIcon,
    DEC: DeclaracaoIcon,
    INF: InfoIcon,
    DEL: DeliberacaoIcon
  };

  // Carregar tipos de documentos
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const response = await getDocumentTypes();
        if (response.success) {
          setTypes(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadTypes();
  }, []);

  // Handler mudança de tipo (main tab)
  const handleMainTabChange = (event, newValue) => {
    setMainTab(newValue);
    setSubTab(0); // Reset para primeira sub-tab
    setShowNewForm(false);
  };

  // Handler mudança de sub-tab
  const handleSubTabChange = (event, newValue) => {
    setSubTab(newValue);
    setShowNewForm(false);
  };

  // Handler criar nova emissão
  const handleCreateNew = () => {
    setSubTab(0); // Ir para sub-tab Lista
    setShowNewForm(true);
  };

  // Handler após criar emissão
  const handleEmissionCreated = () => {
    setShowNewForm(false);
    setSubTab(0); // Voltar à lista
  };

  // Obter tipo selecionado com base no mainTab
  const selectedTypeData = types[mainTab] || null;
  const selectedType = selectedTypeData?.pk || null;

  // Loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            📄 Gestão de Emissões
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sistema centralizado para Ofícios, Notificações, Declarações, Informações e Deliberações
          </Typography>
        </Box>

        {/* Botão de Configurações Globais */}
        <Tooltip title="Configurações Globais">
          <IconButton
            onClick={(e) => setSettingsMenuAnchor(e.currentTarget)}
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            }}
          >
            <TuneIcon />
          </IconButton>
        </Tooltip>

        {/* Menu de Configurações */}
        <Menu
          anchorEl={settingsMenuAnchor}
          open={Boolean(settingsMenuAnchor)}
          onClose={() => setSettingsMenuAnchor(null)}
        >
          <MenuItem onClick={() => { setGlobalSettingsOpen(true); setSettingsMenuAnchor(null); }}>
            <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
            Configurações Globais
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => setSettingsMenuAnchor(null)}>
            <InfoIcon sx={{ mr: 1, fontSize: 20 }} />
            Sobre o Sistema
          </MenuItem>
        </Menu>
      </Box>

      {/* Main Tabs - Tipos de Documento */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Tabs
          value={mainTab}
          onChange={handleMainTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              py: 2,
              px: 3,
              fontSize: '0.95rem',
              fontWeight: 600,
              minHeight: 64
            }
          }}
        >
          {types.map((type, index) => {
            const Icon = iconMap[type.code] || OficioIcon;
            return (
              <Tab
                key={type.pk}
                icon={<Icon />}
                iconPosition="start"
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {type.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {type.prefix}
                    </Typography>
                  </Box>
                }
                sx={{
                  alignItems: 'flex-start',
                  textAlign: 'left'
                }}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Sub-Tabs - Lista/Templates/Configurações */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={handleSubTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              py: 1.5,
              fontSize: '0.875rem',
              fontWeight: 500,
              minHeight: 48
            }
          }}
        >
          <Tab
            icon={<ListIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Lista de Emissões"
          />
          <Tab
            icon={<SettingsIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Gestão de Templates"
          />
          <Tab
            icon={<TuneIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Configurações"
          />
        </Tabs>
      </Paper>

      {/* Content Area */}
      <Box>
        {/* Sub-Tab 0: Lista de Emissões */}
        {subTab === 0 && (
          <Fade in={true} timeout={300}>
            <Box>
              {showNewForm ? (
                <EmissionForm
                  selectedType={selectedType}
                  selectedTypeData={selectedTypeData}
                  onCancel={() => setShowNewForm(false)}
                  onSuccess={handleEmissionCreated}
                />
              ) : (
                <EmissionList
                  selectedType={selectedType}
                  selectedTypeData={selectedTypeData}
                  onCreateNew={() => setShowNewForm(true)}
                />
              )}
            </Box>
          </Fade>
        )}

        {/* Sub-Tab 1: Gestão de Templates */}
        {subTab === 1 && (
          <Fade in={true} timeout={300}>
            <Box>
              <TemplateManager
                selectedType={selectedType}
                selectedTypeData={selectedTypeData}
              />
            </Box>
          </Fade>
        )}

        {/* Sub-Tab 2: Configurações Específicas do Tipo */}
        {subTab === 2 && selectedTypeData && (
          <Fade in={true} timeout={300}>
            <Box>
              <Paper elevation={1} sx={{ p: 4, borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  Configurações - {selectedTypeData.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure opções específicas para documentos do tipo {selectedTypeData.prefix}
                </Typography>

                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  {/* Numeração Automática */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Numeração Automática
                      </Typography>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Ativar numeração automática"
                      />
                      <TextField
                        fullWidth
                        label="Prefixo Atual"
                        value={selectedTypeData.prefix}
                        disabled
                        size="small"
                        sx={{ mt: 2 }}
                      />
                      <TextField
                        fullWidth
                        label="Próximo Número"
                        placeholder="Ex: 000001"
                        size="small"
                        sx={{ mt: 2 }}
                        helperText="Gerado automaticamente pela base de dados"
                        disabled
                      />
                    </Paper>
                  </Grid>

                  {/* Templates Padrão */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Template Padrão
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Defina qual template será selecionado por padrão
                      </Typography>
                      <Button variant="outlined" size="small" fullWidth>
                        Selecionar Template Padrão
                      </Button>
                    </Paper>
                  </Grid>

                  {/* Campos Obrigatórios */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Campos Obrigatórios
                      </Typography>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Destinatário obrigatório"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Assunto obrigatório"
                      />
                      <FormControlLabel
                        control={<Switch />}
                        label="NIF obrigatório"
                      />
                    </Paper>
                  </Grid>

                  {/* Assinantes Autorizados */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Assinantes Autorizados
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Gerir utilizadores autorizados a assinar
                      </Typography>
                      <Button variant="outlined" size="small" fullWidth>
                        Gerir Assinantes
                      </Button>
                    </Paper>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <Button variant="outlined">
                    Restaurar Padrões
                  </Button>
                  <Button variant="contained">
                    Guardar Alterações
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Fade>
        )}
      </Box>

      {/* FAB - Criar Nova Emissão */}
      {!showNewForm && subTab === 0 && (
        <Fab
          color="primary"
          aria-label="criar emissão"
          onClick={handleCreateNew}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1000
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Modal de Configurações Globais */}
      <Dialog
        open={globalSettingsOpen}
        onClose={() => setGlobalSettingsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TuneIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Configurações Globais do Sistema
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Preferências de PDF */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Preferências de PDF
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Margem Superior (mm)"
                      type="number"
                      defaultValue={15}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Margem Inferior (mm)"
                      type="number"
                      defaultValue={15}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Margem Esquerda (mm)"
                      type="number"
                      defaultValue={20}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Margem Direita (mm)"
                      type="number"
                      defaultValue={20}
                      size="small"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Incluir numeração de páginas automaticamente"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Logos e Identidade */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Logos e Identidade Visual
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Configure os logos utilizados nos cabeçalhos dos documentos
                </Typography>
                <Button variant="outlined" size="small">
                  Gerir Logos
                </Button>
              </Paper>
            </Grid>

            {/* Assinaturas Digitais */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Assinaturas Digitais
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <FormControlLabel
                  control={<Switch />}
                  label="Ativar assinaturas digitais"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Requer integração com fornecedor de certificados digitais
                </Typography>
              </Paper>
            </Grid>

            {/* Auditoria */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Auditoria e Logs
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Registar todas as ações (criação, edição, emissão)"
                />
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Registar downloads de PDFs"
                />
                <Button variant="text" size="small" sx={{ mt: 1 }}>
                  Ver Logs de Auditoria
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setGlobalSettingsOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={() => setGlobalSettingsOpen(false)}>
            Guardar Configurações
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmissionHub;
