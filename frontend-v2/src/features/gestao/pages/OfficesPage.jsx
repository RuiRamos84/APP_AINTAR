/**
 * OfficesPage
 * Gestão de ofícios/cartas — assinatura individual e em lote, abertura, fecho e replicação
 * Fonte de dados: vbl_letter (backend /offices)
 * Assinatura: /signature/cmd/init-batch + /signature/cmd/complete-batch
 */

import { useState, useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip, Stack,
  IconButton, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Skeleton, Divider, Tooltip,
  Stepper, Step, StepLabel, CircularProgress, List, ListItem,
  ListItemText, ListItemIcon, useTheme, useMediaQuery,
  TextField, InputAdornment,
} from '@mui/material';
import {
  Description as OfficeIcon,
  LockOpen as OpenIcon,
  Lock as CloseIcon2,
  ContentCopy as ReplicateIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  VerifiedUser as SignIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Send as SendIcon,
  PhoneAndroid as PhoneIcon,
} from '@mui/icons-material';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import notification from '@/core/services/notification';
import { useQuery } from '@tanstack/react-query';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data/SearchBar/SearchBar';
import apiClient from '@/services/api/client';

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useOffices = () =>
  useQuery({
    queryKey: ['offices'],
    queryFn: () => apiClient.get('/offices'),
    staleTime: 2 * 60 * 1000,
    select: (res) => res?.offices ?? res?.data ?? [],
    retry: 1,
  });

// ─── Status ───────────────────────────────────────────────────────────────────

const STATUS = {
  'Rascunho':  { label: 'Rascunho',  color: 'warning' },
  'Emitido':   { label: 'Emitido',   color: 'primary' },
  'Assinado':  { label: 'Assinado',  color: 'success' },
  'Cancelado': { label: 'Cancelado', color: 'default' },
};

const getStatus = (v) => STATUS[v] ?? { label: v ?? '—', color: 'default' };

const canSign = (o) => o.filename && o.ts_letterstatus !== 'Assinado';

// ─── Sign Dialog ───────────────────────────────────────────────────────────────

const SIGN_STEPS = ['Credenciais', 'Confirmação', 'Resultado'];

const SignDialog = ({ open, offices, onClose, onComplete }) => {
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState({ phone: '', nif: '', reason: 'Assinatura de Documento Oficial AINTAR' });
  const [processId, setProcessId] = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  const isBatch = offices.length > 1;
  const signable = offices.filter(canSign);

  const handleClose = () => {
    setStep(0);
    setForm({ phone: '', nif: '', reason: 'Assinatura de Documento Oficial AINTAR' });
    setProcessId(null);
    setResult(null);
    onClose();
  };

  // Step 0 → 1: pedir OTP
  const handleRequestOTP = async () => {
    if (signable.length === 0) {
      notification.error('Nenhum documento elegível para assinar.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        document_type: 'letter',
        document_ids: signable.map((o) => o.pk),
        phone: form.phone,
        nif: form.nif,
        reason: form.reason,
      };
      const res = await apiClient.post('/signature/cmd/init-batch', payload);
      setProcessId(res.process_id ?? res.request_id);
      setStep(1);
    } catch (e) {
      notification.error(`Erro ao solicitar OTP: ${e?.message ?? 'desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 1 → 2: confirmar
  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await apiClient.post('/signature/cmd/complete-batch', {
        document_type: 'letter',
        document_ids: signable.map((o) => o.pk),
        process_id: processId,
      });
      setResult(res);
      setStep(2);
      onComplete?.();
    } catch (e) {
      notification.error(`Erro ao confirmar assinatura: ${e?.message ?? 'desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const phoneHint = form.phone.length >= 8
    ? `**** ${form.phone.slice(-4)}`
    : '****';

  return (
    <Dialog open={open} onClose={step === 2 ? handleClose : undefined} maxWidth="sm" fullWidth disableEscapeKeyDown={step < 2}>
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>
            {isBatch ? `Assinar ${signable.length} Ofício${signable.length !== 1 ? 's' : ''}` : 'Assinar Ofício'}
          </Typography>
          <IconButton size="small" onClick={handleClose} disabled={loading && step < 2}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Stepper activeStep={step} sx={{ mt: 2, mb: 1 }}>
          {SIGN_STEPS.map((l) => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
        </Stepper>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* ── Step 0: Credenciais ── */}
        {step === 0 && (
          <Box>
            {/* Lista de documentos */}
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block' }}>
              DOCUMENTOS A ASSINAR
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {signable.map((o) => (
                <Chip
                  key={o.pk}
                  size="small"
                  label={o.emission_number ?? o.regnumber ?? `#${o.pk}`}
                  color="primary"
                  variant="outlined"
                />
              ))}
              {offices.filter((o) => !canSign(o)).map((o) => (
                <Chip
                  key={o.pk}
                  size="small"
                  label={`${o.emission_number ?? `#${o.pk}`} (ignorado)`}
                  color="default"
                  variant="outlined"
                />
              ))}
            </Box>

            {signable.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Nenhum documento selecionado tem PDF gerado ou está em estado elegível.
              </Alert>
            )}

            <Stack spacing={2}>
              <TextField
                label="Telemóvel (Chave Móvel Digital)"
                placeholder="+351 9XX XXX XXX"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                fullWidth size="small"
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" /></InputAdornment> }}
              />
              <TextField
                label="NIF"
                placeholder="123456789"
                value={form.nif}
                onChange={(e) => setForm((f) => ({ ...f, nif: e.target.value }))}
                fullWidth size="small"
              />
              <TextField
                label="Motivo da assinatura"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                fullWidth size="small" multiline rows={2}
              />
            </Stack>
          </Box>
        )}

        {/* ── Step 1: Aguardar confirmação ── */}
        {step === 1 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <PhoneIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Confirme na aplicação CMD
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Foi enviada uma notificação para o telemóvel <strong>{phoneHint}</strong>.
              {isBatch && (
                <> Ao confirmar, serão assinados <strong>{signable.length} documentos</strong> de uma só vez.</>
              )}
            </Typography>
            <Alert severity="info" sx={{ textAlign: 'left', mb: 2 }}>
              Abra a aplicação <strong>Autenticação.gov</strong> e confirme a assinatura. Depois clique em <em>Confirmar Assinatura</em>.
            </Alert>
            {loading && <CircularProgress sx={{ mt: 1 }} />}
          </Box>
        )}

        {/* ── Step 2: Resultado ── */}
        {step === 2 && result && (
          <Box>
            {result.signed?.length > 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <strong>{result.signed.length} documento(s)</strong> assinado(s) com sucesso.
              </Alert>
            )}
            {result.failed?.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <strong>{result.failed.length} documento(s)</strong> com erro:
                <List dense disablePadding sx={{ mt: 0.5 }}>
                  {result.failed.map((f) => (
                    <ListItem key={f.id} disableGutters disablePadding>
                      <ListItemIcon sx={{ minWidth: 28 }}><ErrorIcon fontSize="small" color="error" /></ListItemIcon>
                      <ListItemText primary={`#${f.id}: ${f.error}`} primaryTypographyProps={{ variant: 'caption' }} />
                    </ListItem>
                  ))}
                </List>
              </Alert>
            )}
            {result.skipped?.length > 0 && (
              <Alert severity="warning">
                <strong>{result.skipped.length} documento(s)</strong> ignorado(s) (sem PDF ou já assinados).
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1 }}>
        {step === 0 && (
          <>
            <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={handleRequestOTP}
              disabled={loading || !form.phone || !form.nif || signable.length === 0}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            >
              Solicitar OTP
            </Button>
          </>
        )}
        {step === 1 && (
          <>
            <Button onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleConfirm}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
            >
              Confirmar Assinatura
            </Button>
          </>
        )}
        {step === 2 && (
          <Button variant="contained" onClick={handleClose} fullWidth>
            Fechar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ─── Action Dialog ────────────────────────────────────────────────────────────

const ActionDialog = ({ open, action, office, onClose, onConfirm }) => {
  const titles = {
    open:      'Reabrir Ofício',
    close:     'Fechar Ofício',
    replicate: 'Replicar Ofício',
  };
  const descriptions = {
    open:      'O ofício voltará ao estado Rascunho e ficará disponível para edição.',
    close:     'O ofício será marcado como Cancelado. Esta ação pode ser revertida.',
    replicate: 'Será criada uma cópia deste ofício em estado Rascunho.',
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>{titles[action] ?? 'Ação'}</Typography>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {office && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {descriptions[action]}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                {office.emission_number ?? office.regnumber ?? `Ofício #${office.pk}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {office.subject ?? '—'}
              </Typography>
            </Paper>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          color={action === 'close' ? 'error' : 'primary'}
          onClick={() => onConfirm(action, office)}
        >
          Confirmar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Componente Principal ─────────────────────────────────────────────────────

const OfficesPage = () => {
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const apiRef = useGridApiRef();

  const [search, setSearch]           = useState('');
  const [selectionCount, setSelectionCount] = useState(0);
  const [dialog, setDialog]           = useState({ open: false, action: null, office: null });
  const [signDialog, setSignDialog]   = useState({ open: false, offices: [] });

  const { data: offices = [], isLoading, isError, refetch } = useOffices();

  const filtered = useMemo(() => {
    if (!search) return offices;
    const s = search.toLowerCase();
    return offices.filter((o) =>
      String(o.pk).includes(s) ||
      o.regnumber?.toLowerCase().includes(s) ||
      o.emission_number?.toLowerCase().includes(s) ||
      o.subject?.toLowerCase().includes(s) ||
      o.ts_lettertype?.toLowerCase().includes(s)
    );
  }, [offices, search]);

  // Ações individuais
  const openDialog  = (action, office) => setDialog({ open: true, action, office });
  const closeDialog = () => setDialog({ open: false, action: null, office: null });

  const handleAction = async (action, office) => {
    closeDialog();
    try {
      await apiClient.post(`/offices/${office.pk}/${action}`);
      notification.success('Operação realizada com sucesso!');
      refetch();
    } catch (e) {
      notification.error(`Erro: ${e.message}`);
    }
  };

  // Ver PDF
  const handleViewPDF = async (office) => {
    try {
      const response = await apiClient.get(`/offices/${office.pk}/view`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response], { type: 'application/pdf' }));
      window.open(url, '_blank');
    } catch {
      notification.error('Erro ao abrir o documento PDF');
    }
  };

  // Assinar — lê os rows selecionados via apiRef (não via estado React)
  const openSignDialog = (clicked) => {
    const selectedMap = apiRef.current?.getSelectedRows?.() ?? new Map();
    const fromSelection = Array.from(selectedMap.values()).filter(canSign);
    const targets = fromSelection.length > 0 ? fromSelection : [clicked];
    setSignDialog({ open: true, offices: targets });
  };
  const closeSignDialog = () => {
    setSignDialog({ open: false, offices: [] });
    setSelectionCount(0);
  };
  const handleSignComplete = () => {
    refetch();
    notification.success('Processo de assinatura concluído!');
  };

  // Stats
  const counts = useMemo(() => ({
    total:     offices.length,
    rascunho:  offices.filter((o) => o.ts_letterstatus === 'Rascunho').length,
    emitido:   offices.filter((o) => o.ts_letterstatus === 'Emitido').length,
    assinado:  offices.filter((o) => o.ts_letterstatus === 'Assinado').length,
  }), [offices]);

  // Colunas DataGrid
  const columns = [
    { field: 'emission_number', headerName: 'Nº Ofício', width: 155 },
    { field: 'regnumber',       headerName: 'Pedido',    width: 115 },
    { field: 'subject',         headerName: 'Assunto',   flex: 1, minWidth: 180 },
    { field: 'ts_lettertype',   headerName: 'Tipo',      width: 100 },
    {
      field: 'hist_time', headerName: 'Data', width: 100,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('pt-PT') : '—',
    },
    {
      field: 'ts_letterstatus', headerName: 'Estado', width: 120,
      renderCell: ({ value }) => {
        const s = getStatus(value);
        return <Chip label={s.label} size="small" color={s.color} />;
      },
    },
    {
      field: 'actions', headerName: '', width: 215, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} sx={{ width: '100%', overflow: 'visible' }}>
          {row.filename && (
            <Tooltip title="Ver PDF">
              <IconButton size="small" color="secondary" onClick={() => handleViewPDF(row)}>
                <PdfIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canSign(row) && (
            <Tooltip title="Assinar">
              <IconButton size="small" color="success" onClick={() => openSignDialog([row])}>
                <SignIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Reabrir">
            <IconButton size="small" onClick={() => openDialog('open', row)}>
              <OpenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fechar">
            <IconButton size="small" color="error" onClick={() => openDialog('close', row)}>
              <CloseIcon2 fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Replicar">
            <IconButton size="small" color="info" onClick={() => openDialog('replicate', row)}>
              <ReplicateIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // Card mobile
  const renderMobileCard = (office) => {
    const s = getStatus(office.ts_letterstatus);
    return (
      <Card key={office.pk} variant="outlined">
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {office.emission_number ?? `#${office.pk}`} · {office.regnumber}
            </Typography>
            <Chip label={s.label} size="small" color={s.color} />
          </Box>
          <Typography variant="body2" fontWeight={500}>{office.subject || '—'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {office.ts_lettertype} ·{' '}
            {office.hist_time ? new Date(office.hist_time).toLocaleDateString('pt-PT') : '—'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            {office.filename && (
              <Button size="small" startIcon={<PdfIcon />} color="secondary" onClick={() => handleViewPDF(office)}>PDF</Button>
            )}
            {canSign(office) && (
              <Button size="small" startIcon={<SignIcon />} color="success" onClick={() => openSignDialog([office])}>Assinar</Button>
            )}
            <Button size="small" startIcon={<OpenIcon />} onClick={() => openDialog('open', office)}>Reabrir</Button>
            <Button size="small" startIcon={<CloseIcon2 />} color="error" onClick={() => openDialog('close', office)}>Fechar</Button>
            <Button size="small" startIcon={<ReplicateIcon />} color="info" onClick={() => openDialog('replicate', office)}>Replicar</Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <ModulePage
      title="Ofícios"
      subtitle="Gestão de ofícios e cartas — assinatura digital, reabertura, fecho e replicação"
      icon={OfficeIcon}
      color="#5c6bc0"
      breadcrumbs={[{ label: 'Ofícios', path: '/offices-admin' }]}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          <Tooltip title="Atualizar">
            <IconButton onClick={refetch}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total',    value: counts.total,    color: 'info' },
          { label: 'Rascunho', value: counts.rascunho, color: 'warning' },
          { label: 'Emitido',  value: counts.emitido,  color: 'primary' },
          { label: 'Assinado', value: counts.assinado, color: 'success' },
        ].map(({ label, value, color }) => (
          <Grid key={label} size={{ xs: 6, sm: 3 }}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="h4" fontWeight={800} color={`${color}.main`}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabela */}
      <Paper sx={{ borderRadius: 2 }}>
        {selectionCount > 0 && (
          <Box sx={{ px: 2, pt: 1.5 }}>
            <Chip
              icon={<SignIcon />}
              label={`${selectionCount} selecionado${selectionCount !== 1 ? 's' : ''} — clique Assinar numa linha`}
              color="success"
              variant="outlined"
              size="small"
            />
          </Box>
        )}

        {isLoading ? (
          <Box sx={{ p: 2 }}><Skeleton variant="rounded" height={300} /></Box>
        ) : isError ? (
          <Alert severity="error" sx={{ m: 2 }}>Erro ao carregar ofícios. Verifique a ligação ao servidor.</Alert>
        ) : offices.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.disabled' }}>
            <OfficeIcon sx={{ fontSize: 72, opacity: 0.2, mb: 2 }} />
            <Typography variant="h6">Sem ofícios registados</Typography>
          </Box>
        ) : isMobile ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {filtered.map(renderMobileCard)}
          </Stack>
        ) : (
          <DataGrid
            apiRef={apiRef}
            rows={filtered} columns={columns}
            getRowId={(r) => r.pk}
            autoHeight
            disableRowSelectionOnClick={false}
            checkboxSelection
            onRowSelectionModelChange={(model) => {
              const count = typeof model?.size === 'number' ? model.size
                : Array.isArray(model) ? model.length : 0;
              setSelectionCount(count);
            }}
            pageSizeOptions={[25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            sx={{
              border: 0,
              '& .MuiDataGrid-cell': { overflow: 'visible' },
              '& .MuiDataGrid-columnHeader--last .MuiDataGrid-columnHeaderTitleContainer': { justifyContent: 'flex-end' },
            }}
          />
        )}
      </Paper>

      {/* Dialogs */}
      <ActionDialog
        open={dialog.open}
        action={dialog.action}
        office={dialog.office}
        onClose={closeDialog}
        onConfirm={handleAction}
      />

      <SignDialog
        open={signDialog.open}
        offices={signDialog.offices}
        onClose={closeSignDialog}
        onComplete={handleSignComplete}
      />
    </ModulePage>
  );
};

export default OfficesPage;
