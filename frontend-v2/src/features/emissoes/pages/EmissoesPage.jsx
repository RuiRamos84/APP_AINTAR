/**
 * EmissoesPage
 * Sistema unificado de emissões: Ofícios, Notificações, Declarações, Informações, Deliberações
 */

import { useState } from 'react';
import {
  Box, Container, Typography, Tabs, Tab, Paper, Fab, Fade,
  CircularProgress, Alert, IconButton, Tooltip, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Divider, Chip, Grid, TextField, InputAdornment, Card, CardContent,
  CardActions, Skeleton, Stack,
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
  Search as SearchIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useDocumentTypes, useEmissoes, useTemplates } from '../hooks/useEmissoes';
import { STATUS_CONFIG, formatEmissionNumber } from '../services/emissoesService';
import { toast } from 'sonner';

// ─── Ícones por código ────────────────────────────────────────────────────────

const ICON_MAP = {
  OFI: OficioIcon,
  NOT: NotificationIcon,
  DEC: DeclaracaoIcon,
  INF: InfoIcon,
  DEL: DeliberacaoIcon,
};

// ─── Sub-componente: Lista de Emissões ────────────────────────────────────────

const EmissoesList = ({ selectedType, selectedTypeData, onCreateNew }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [pdfDialog, setPdfDialog] = useState(null);

  const { items, isLoading, isError, remove, generatePDF, downloadPDF, viewPDF, isRemoving } = useEmissoes(
    selectedType ? { tb_document_type: selectedType, status: statusFilter || undefined } : { tb_document_type: -1 }
  );

  const filtered = items.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.emission_number?.toLowerCase().includes(s) ||
      e.recipient?.toLowerCase().includes(s) ||
      e.subject?.toLowerCase().includes(s)
    );
  });

  if (!selectedType) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Selecione um tipo de documento para ver as emissões.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Toolbar */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Pesquisar emissões..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}><CloseIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <TextField
          select
          size="small"
          label="Estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 140 }}
          SelectProps={{ native: false }}
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <MenuItem key={key} value={key}>{cfg.label}</MenuItem>
          ))}
        </TextField>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateNew} size="small">
          Nova Emissão
        </Button>
      </Paper>

      {/* Loading */}
      {isLoading && (
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={160} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Error */}
      {isError && <Alert severity="error">Erro ao carregar emissões.</Alert>}

      {/* Empty */}
      {!isLoading && !isError && filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <OficioIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">Nenhuma emissão encontrada</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {search ? 'Tente ajustar os filtros de pesquisa' : `Clique em "Nova Emissão" para criar a primeira`}
          </Typography>
        </Box>
      )}

      {/* Grid de Cards */}
      {!isLoading && !isError && filtered.length > 0 && (
        <Grid container spacing={2}>
          {filtered.map((emission) => {
            const statusCfg = STATUS_CONFIG[emission.status] || { label: emission.status, chipColor: 'default' };
            return (
              <Grid key={emission.pk} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {formatEmissionNumber(emission.emission_number)}
                      </Typography>
                      <Chip
                        label={statusCfg.label}
                        color={statusCfg.chipColor}
                        size="small"
                      />
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom noWrap>
                      {emission.subject || 'Sem assunto'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {emission.recipient || 'Sem destinatário'}
                    </Typography>
                    {emission.created_at && (
                      <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: 'block' }}>
                        {new Date(emission.created_at).toLocaleDateString('pt-PT')}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', gap: 0.5, px: 2, pb: 1 }}>
                    <Tooltip title="Ver PDF">
                      <IconButton size="small" onClick={() => viewPDF(emission.pk)}>
                        <PdfIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {emission.status === 'draft' && (
                      <>
                        <Tooltip title="Gerar PDF">
                          <IconButton size="small" color="primary" onClick={() => generatePDF(emission.pk)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cancelar">
                          <IconButton size="small" color="error" onClick={() => setDeleteConfirm(emission)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Confirmar cancelamento */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancelar Emissão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem a certeza que deseja cancelar a emissão{' '}
            <strong>{formatEmissionNumber(deleteConfirm?.emission_number)}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Não</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isRemoving}
            onClick={() => { remove(deleteConfirm.pk); setDeleteConfirm(null); }}
          >
            Cancelar Emissão
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Sub-componente: Formulário Nova Emissão ──────────────────────────────────

const NovaEmissaoForm = ({ selectedType, selectedTypeData, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    tb_document_type: selectedType,
    recipient: '',
    subject: '',
    body: '',
    tb_template: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { create } = useEmissoes();

  const handleChange = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      toast.warning('O assunto é obrigatório.');
      return;
    }
    setSubmitting(true);
    create(
      { ...formData, tb_document_type: selectedType },
      {
        onSuccess: () => { setSubmitting(false); onSuccess(); },
        onError: () => setSubmitting(false),
      }
    );
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Nova {selectedTypeData?.name || 'Emissão'}
        </Typography>
        <Chip label={selectedTypeData?.prefix} color="primary" size="small" />
      </Box>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField
            fullWidth
            label="Destinatário"
            value={formData.recipient}
            onChange={handleChange('recipient')}
            placeholder="Nome do destinatário..."
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            required
            label="Assunto"
            value={formData.subject}
            onChange={handleChange('subject')}
            placeholder="Assunto do documento..."
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Corpo do Documento"
            value={formData.body}
            onChange={handleChange('body')}
            placeholder="Conteúdo do documento..."
          />
        </Grid>
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'A guardar...' : 'Criar Emissão'}
        </Button>
      </Box>
    </Paper>
  );
};

// ─── Sub-componente: Gestão de Templates ─────────────────────────────────────

const GestaoTemplates = ({ selectedType, selectedTypeData }) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', body: '', active: 1 });

  const { templates, isLoading, create, isCreating, remove, isRemoving } = useTemplates(
    selectedType ? { tb_document_type: selectedType } : {}
  );

  const handleCreate = () => {
    if (!newTemplate.name.trim()) { toast.warning('O nome é obrigatório.'); return; }
    create(
      { ...newTemplate, tb_document_type: selectedType },
      {
        onSuccess: () => { setCreateOpen(false); setNewTemplate({ name: '', body: '', active: 1 }); },
      }
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Templates — {selectedTypeData?.name}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} size="small">
          Novo Template
        </Button>
      </Box>

      {/* Loading */}
      {isLoading && (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={72} />)}
        </Stack>
      )}

      {/* Empty */}
      {!isLoading && templates.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
          <Typography variant="body1">Nenhum template criado para {selectedTypeData?.name}.</Typography>
          <Button variant="outlined" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => setCreateOpen(true)}>
            Criar Primeiro Template
          </Button>
        </Box>
      )}

      {/* Lista */}
      {!isLoading && templates.length > 0 && (
        <Stack spacing={1}>
          {templates.map((t) => (
            <Paper key={t.pk} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>{t.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Versão {t.version} · {t.active ? 'Ativo' : 'Inativo'}
                </Typography>
              </Box>
              <Chip
                label={t.active ? 'Ativo' : 'Inativo'}
                color={t.active ? 'success' : 'default'}
                size="small"
              />
              <Tooltip title="Remover">
                <IconButton size="small" color="error" onClick={() => setDeleteConfirm(t)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Dialog criar template */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo Template — {selectedTypeData?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              required
              label="Nome do Template"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
            />
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Corpo do Template"
              value={newTemplate.body}
              onChange={(e) => setNewTemplate((p) => ({ ...p, body: e.target.value }))}
              placeholder="Use {{variavel}} para variáveis dinâmicas..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'A criar...' : 'Criar Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar remoção */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remover Template</DialogTitle>
        <DialogContent>
          <Typography>Tem a certeza que deseja remover o template <strong>{deleteConfirm?.name}</strong>?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isRemoving}
            onClick={() => { remove(deleteConfirm.pk); setDeleteConfirm(null); }}
          >
            Remover
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const EmissoesPage = () => {
  const [mainTab, setMainTab] = useState(0);
  const [subTab, setSubTab] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);

  const { data: types = [], isLoading, isError } = useDocumentTypes();

  const selectedTypeData = types[mainTab] ?? null;
  const selectedType = selectedTypeData?.pk ?? null;

  const handleMainTabChange = (_, v) => {
    setMainTab(v);
    setSubTab(0);
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">Erro ao carregar tipos de documentos. Tente novamente.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Gestão de Emissões
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ofícios · Notificações · Declarações · Informações · Deliberações
          </Typography>
        </Box>
        <Tooltip title="Configurações">
          <IconButton onClick={(e) => setSettingsAnchor(e.currentTarget)} color="primary">
            <TuneIcon />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={settingsAnchor} open={!!settingsAnchor} onClose={() => setSettingsAnchor(null)}>
          <MenuItem onClick={() => setSettingsAnchor(null)}>
            <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
            Configurações Globais
          </MenuItem>
        </Menu>
      </Box>

      {/* Main Tabs — Tipos de Documento */}
      <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
        <Tabs
          value={mainTab}
          onChange={handleMainTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {types.map((type) => {
            const Icon = ICON_MAP[type.code] || OficioIcon;
            return (
              <Tab
                key={type.pk}
                icon={<Icon />}
                iconPosition="start"
                label={
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight={600} component="div">{type.name}</Typography>
                    <Typography variant="caption" color="text.secondary" component="div">{type.prefix}</Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', minHeight: 64, px: 3 }}
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Sub-Tabs */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => { setSubTab(v); setShowForm(false); }}
          variant="fullWidth"
          sx={{ minHeight: 48 }}
        >
          <Tab icon={<ListIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Lista de Emissões" sx={{ minHeight: 48 }} />
          <Tab icon={<SettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Gestão de Templates" sx={{ minHeight: 48 }} />
        </Tabs>
      </Paper>

      {/* Conteúdo */}
      <Fade in key={`${mainTab}-${subTab}`} timeout={200}>
        <Box>
          {subTab === 0 && !showForm && (
            <EmissoesList
              selectedType={selectedType}
              selectedTypeData={selectedTypeData}
              onCreateNew={() => setShowForm(true)}
            />
          )}
          {subTab === 0 && showForm && (
            <NovaEmissaoForm
              selectedType={selectedType}
              selectedTypeData={selectedTypeData}
              onCancel={() => setShowForm(false)}
              onSuccess={() => setShowForm(false)}
            />
          )}
          {subTab === 1 && (
            <GestaoTemplates
              selectedType={selectedType}
              selectedTypeData={selectedTypeData}
            />
          )}
        </Box>
      </Fade>

      {/* FAB nova emissão */}
      {subTab === 0 && !showForm && (
        <Fab
          color="primary"
          onClick={() => setShowForm(true)}
          sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1000 }}
        >
          <AddIcon />
        </Fab>
      )}
    </Container>
  );
};

export default EmissoesPage;
