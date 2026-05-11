import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Paper,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Download as DownloadIcon,
  Description as FileIcon,
  PictureAsPdf as PdfIcon,
  Timeline as TimelineIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  RadioButtonUnchecked as EmptyCircleIcon,
  Assignment as ParamsIcon,
  Payments as PaymentIcon,
  LocationOn as LocationIcon,
  CreditCard as PayNowIcon,
  VerifiedUser as IsencaoIcon,
} from '@mui/icons-material';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/services/paymentTypes';
import useMetaData from '@/core/hooks/useMetaData';
import { useParams, useNavigate } from 'react-router-dom';

import { useQueryClient } from '@tanstack/react-query';
import {
  usePedidoDetails,
  usePedidoTimeline,
  usePedidoAnnexes,
  usePedidoParameters,
  usePedidoPayments,
  useDownloadFile,
  portalKeys,
} from '../hooks/useMeusPedidos';
import { formatDate } from '@/features/documents/utils/documentUtils';
import EstadoPedidoChip from '../components/EstadoPedidoChip';
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
import PaymentDialog from '@/features/payments/components/modals/PaymentDialog';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PortalPedidoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: metaData } = useMetaData();
  const [activeTab, setActiveTab] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const handlePaymentClose = (result) => {
    setPaymentOpen(false);
    if (result) {
      queryClient.invalidateQueries({ queryKey: [...portalKeys.detail(id), 'payments'] });
      queryClient.invalidateQueries({ queryKey: [...portalKeys.detail(id), 'parameters'] });
    }
  };

  const formatParamValue = (p) => {
    // Tipo 4: boolean — null/vazio mostra '—', não 'Não'
    if (p.type === 4 || p.type === '4') {
      const val = p.value;
      if (val === null || val === undefined || val === '') return <Chip label="—" size="small" variant="outlined" />;
      if (val === '1' || val === 1 || val === true) return <Chip label="Sim" color="success" size="small" />;
      if (val === '0' || val === 0 || val === false) return <Chip label="Não" size="small" />;
      return <Chip label="—" size="small" variant="outlined" />;
    }
    // Tipo 3: select/lookup — resolver pelo metaData
    if (p.type === 3 || p.type === '3') {
      if (p.name === 'Local de descarga/ETAR' || p.name === 'ETAR') {
        const resolved = metaData?.etar?.find(x => String(x.pk) === String(p.value))?.nome;
        return resolved || p.value || '—';
      }
      if (p.name === 'EE') {
        const resolved = metaData?.ee?.find(x => String(x.pk) === String(p.value))?.nome;
        return resolved || p.value || '—';
      }
      return p.value || '—';
    }
    return p.value ?? '—';
  };

  const { data: pedido, isLoading: loadingDetail } = usePedidoDetails(id);
  const { data: timeline, isLoading: loadingTimeline } = usePedidoTimeline(id);
  const { data: annexes, isLoading: loadingAnnexes } = usePedidoAnnexes(id);
  const { data: rawParams, isLoading: loadingParams } = usePedidoParameters(id);
  const { data: paymentData, isLoading: loadingPayments } = usePedidoPayments(id);

  // Excluir parâmetros de gestão interna do portal
  const HIDDEN_PARAMS = ['Método de pagamento', 'Método de Pagamento'];
  const params = rawParams?.filter(p => !HIDDEN_PARAMS.includes(p.name)) ?? [];
  const { mutate: download } = useDownloadFile();

  const isLoading = loadingDetail || loadingTimeline || loadingAnnexes || loadingParams || loadingPayments;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!pedido) {
    return (
      <Container sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h5">Pedido não encontrado.</Typography>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/pedidos')} sx={{ mt: 2 }}>
          Voltar para a lista
        </Button>
      </Container>
    );
  }

  const payment = paymentData?.invoice_data || paymentData;
  const isPaid = payment?.payment_status === 'SUCCESS';
  // Índices dinâmicos dos tabs
  const hasParams = params.length > 0;
  const tabIndexParams = 3;
  const tabIndexPayment = hasParams ? 4 : 3;
  const isIsencao = payment?.payment_method === 'ISENCAO';

  const paymentStatusLabel = (() => {
    if (!payment?.payment_status) return 'Pendente';
    if (isPaid && isIsencao) return 'Isento';
    if (isPaid) return 'Pago';
    const labels = {
      PENDING_VALIDATION: 'Pendente de validação',
      PENDING: 'Pendente',
      DECLINED: 'Recusado',
      REJECTED: 'Rejeitado',
      EXPIRED: 'Expirado',
      REFUNDED: 'Devolvido',
    };
    return labels[payment.payment_status] || payment.payment_status;
  })();

  const methodLabel = payment?.payment_method
    ? (PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method)
    : null;

  /* ── Sidebar card style ── */
  const sidebarSx = {
    p: 3,
    borderRadius: 3,
    border: '1px solid',
    borderColor: 'divider',
    boxShadow: 'none',
    position: 'sticky',
    top: 90,
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: 4,
      background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || '#2ABB9B'})`,
    },
  };

  return (
    <>
      <PortalPageHeader
        title={pedido?.regnumber ? `Pedido ${pedido.regnumber}` : 'Detalhe do Pedido'}
        subtitle={pedido?.tt_type || ''}
        actions={
          <Button
            variant="outlined"
            startIcon={<BackIcon />}
            onClick={() => navigate('/pedidos')}
            sx={{ borderRadius: 2 }}
          >
            Voltar
          </Button>
        }
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>

          {/* ── SIDEBAR ── */}
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Paper elevation={0} sx={sidebarSx}>

              {/* Status */}
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', mb: 1 }}>
                  Estado
                </Typography>
                <EstadoPedidoChip statusId={pedido.what} size="medium" />
              </Box>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                    Nº de Registo
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {pedido.regnumber}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                    Data de Submissão
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatDate(pedido.submission)}
                  </Typography>
                </Box>

                {pedido.address && (
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                      Localização
                    </Typography>
                    <Typography variant="body2" fontWeight={500} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                      <LocationIcon sx={{ fontSize: 15, mt: 0.25, color: 'primary.main', flexShrink: 0 }} />
                      <span>
                        {pedido.address}
                        {pedido.nut4 && <>, {pedido.nut4}</>}
                      </span>
                    </Typography>
                  </Box>
                )}

                {(pedido.ts_entity_name || pedido.ts_entity) && (
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5, fontWeight: 600 }}>
                      Entidade
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {pedido.ts_entity_name || pedido.ts_entity}
                    </Typography>
                  </Box>
                )}

                {/* Resumo de pagamento na sidebar */}
                {payment && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    {isPaid ? (
                      <Box sx={{
                        p: 2, borderRadius: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.08),
                        border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.25),
                        display: 'flex', alignItems: 'center', gap: 1,
                      }}>
                        {isIsencao
                          ? <IsencaoIcon sx={{ color: '#9c27b0', fontSize: 22, flexShrink: 0 }} />
                          : <SuccessIcon sx={{ color: 'success.main', fontSize: 22, flexShrink: 0 }} />
                        }
                        <Box>
                          <Typography variant="caption" color="success.dark" fontWeight={700} display="block">
                            {isIsencao ? 'Isento' : 'Pago'}
                          </Typography>
                          {!isIsencao && (
                            <Typography variant="caption" color="text.secondary">
                              {methodLabel}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{
                        p: 2, borderRadius: 2,
                        bgcolor: alpha(theme.palette.warning.main, 0.08),
                        border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.2),
                      }}>
                        <Typography variant="caption" color="warning.dark" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                          Pagamento pendente
                        </Typography>
                        <Typography variant="h6" fontWeight={800} color="warning.dark">
                          {payment.amount ?? payment.invoice ?? '—'} €
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* ── CONTEÚDO PRINCIPAL ── */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ '& .MuiTab-root': { fontWeight: 600, fontSize: '0.85rem', minHeight: 52 } }}
                >
                  <Tab label="Detalhes" icon={<InfoIcon sx={{ fontSize: 17 }} />} iconPosition="start" />
                  <Tab label="Histórico" icon={<TimelineIcon sx={{ fontSize: 17 }} />} iconPosition="start" />
                  <Tab label="Documentos" icon={<FileIcon sx={{ fontSize: 17 }} />} iconPosition="start" />
                  {params.length > 0 && (
                    <Tab label="Parâmetros" icon={<ParamsIcon sx={{ fontSize: 17 }} />} iconPosition="start" />
                  )}
                  {payment && (
                    <Tab label="Pagamento" icon={<PaymentIcon sx={{ fontSize: 17 }} />} iconPosition="start" />
                  )}
                </Tabs>
              </Box>

              <Box sx={{ px: 3 }}>

                {/* ── TAB 0: DETALHES ── */}
                <TabPanel value={activeTab} index={0}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                      Descrição do Pedido
                    </Typography>
                    <Box sx={{
                      p: 2.5, borderRadius: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.03),
                      border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.08),
                    }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'text.secondary' }}>
                        {pedido.memo || 'Sem descrição detalhada.'}
                      </Typography>
                    </Box>
                  </Box>
                </TabPanel>

                {/* ── TAB 1: HISTÓRICO ── */}
                <TabPanel value={activeTab} index={1}>
                  {timeline && timeline.length > 0 ? (
                    <Stack spacing={0}>
                      {timeline.map((step, index) => {
                        const isFirst = index === 0;
                        const stepName = step.what_name || step.step_label || step.what || '—';
                        const stepDate = step.when_start || step.updt_time || step.submission;
                        const stepMemo = step.memo || step.description;

                        return (
                          <Box key={index} sx={{ display: 'flex', gap: 2 }}>
                            {/* Linha vertical + ícone */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 32 }}>
                              <Box sx={{
                                width: 28, height: 28, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                bgcolor: isFirst ? 'success.main' : alpha(theme.palette.action.disabled, 0.15),
                                flexShrink: 0, zIndex: 1,
                              }}>
                                {isFirst
                                  ? <SuccessIcon sx={{ fontSize: 18, color: 'white' }} />
                                  : <EmptyCircleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                                }
                              </Box>
                              {index < timeline.length - 1 && (
                                <Box sx={{
                                  width: 2, flex: 1, minHeight: 24,
                                  bgcolor: alpha(theme.palette.divider, 0.8),
                                  my: 0.5,
                                }} />
                              )}
                            </Box>

                            {/* Conteúdo */}
                            <Box sx={{ pb: index < timeline.length - 1 ? 2.5 : 0, pt: 0.3, flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body2"
                                fontWeight={isFirst ? 700 : 500}
                                color={isFirst ? 'text.primary' : 'text.secondary'}
                                sx={{ lineHeight: 1.4 }}
                              >
                                {stepName}
                              </Typography>
                              {stepDate && (
                                <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.3 }}>
                                  {formatDate(stepDate)}
                                </Typography>
                              )}
                              {stepMemo && (
                                <Box sx={{
                                  mt: 1, p: 1.5, borderRadius: 1.5,
                                  bgcolor: alpha(theme.palette.action.hover, 0.5),
                                  borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                }}>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                                    {stepMemo}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Box sx={{ py: 6, textAlign: 'center' }}>
                      <TimelineIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.disabled">
                        Sem registos de histórico.
                      </Typography>
                    </Box>
                  )}
                </TabPanel>

                {/* ── TAB 2: DOCUMENTOS ── */}
                <TabPanel value={activeTab} index={2}>
                  {annexes && annexes.length > 0 ? (
                    <Grid container spacing={2}>
                      {annexes.map((file, i) => {
                        const isPdf = file.filename?.toLowerCase().endsWith('.pdf');
                        return (
                          <Grid size={{ xs: 12, sm: 6 }} key={i}>
                            <Box sx={{
                              p: 2, borderRadius: 2,
                              border: '1px solid', borderColor: 'divider',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: 1.5, bgcolor: 'background.paper',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                                boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.2)}`,
                                bgcolor: alpha(theme.palette.primary.main, 0.02),
                              },
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                                <Box sx={{
                                  width: 36, height: 36, borderRadius: 1.5,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  bgcolor: isPdf
                                    ? alpha('#E53935', 0.1)
                                    : alpha(theme.palette.primary.main, 0.08),
                                  flexShrink: 0,
                                }}>
                                  {isPdf
                                    ? <PdfIcon sx={{ fontSize: 20, color: '#E53935' }} />
                                    : <FileIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                                  }
                                </Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600} noWrap>
                                    {file.filename}
                                  </Typography>
                                  <Typography variant="caption" color="text.disabled">
                                    {file.tipo || 'Anexo'}
                                  </Typography>
                                </Box>
                              </Box>
                              <Tooltip title="Descarregar">
                                <IconButton
                                  size="small"
                                  onClick={() => download({ regnumber: pedido.regnumber, filename: file.filename })}
                                  sx={{ flexShrink: 0, color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  ) : (
                    <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                      <FileIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.disabled">Sem documentos anexados.</Typography>
                    </Box>
                  )}
                </TabPanel>

                {/* ── TAB 3: PARÂMETROS (condicional) ── */}
                {hasParams && (
                  <TabPanel value={activeTab} index={tabIndexParams}>
                    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(theme.palette.action.hover, 0.4) }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', width: '45%' }}>
                              Parâmetro
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary' }}>
                              Valor
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {params.map((p, i) => {
                            const val = formatParamValue(p);
                            return (
                              <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                <TableCell sx={{ color: 'text.secondary', py: 1.5 }}>{p.name}</TableCell>
                                <TableCell sx={{ fontWeight: 600, py: 1.5 }}>
                                  {typeof val === 'string' || typeof val === 'number'
                                    ? <>{val}{p.units ? ` ${p.units}` : ''}</>
                                    : val}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </TabPanel>
                )}

                {/* ── TAB PAGAMENTO ── */}
                {payment && (
                  <TabPanel value={activeTab} index={tabIndexPayment}>
                    <Stack spacing={3}>
                      {!isPaid && (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                          O pagamento deste pedido está pendente de validação pela AINTAR. As condições indicadas estão sujeitas a confirmação pela nossa equipa antes de ser emitida a cobrança final.
                        </Alert>
                      )}

                      {/* Cabeçalho de estado */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>Dados para Pagamento</Typography>
                          <Typography variant="caption" color="text.disabled">{pedido.regnumber}</Typography>
                        </Box>
                        <Chip
                          label={paymentStatusLabel}
                          color={isPaid ? (isIsencao ? 'secondary' : 'success') : 'warning'}
                          icon={isPaid && isIsencao ? <IsencaoIcon sx={{ fontSize: '16px !important' }} /> : undefined}
                          sx={{
                            fontWeight: 700,
                            ...(isPaid && isIsencao && { bgcolor: '#9c27b0', color: 'white', '& .MuiChip-icon': { color: 'white' } }),
                          }}
                        />
                      </Box>

                      {/* Valor + método */}
                      <Box sx={{
                        p: 3, borderRadius: 2,
                        border: '1px solid',
                        borderColor: isPaid
                          ? alpha(isIsencao ? '#9c27b0' : theme.palette.success.main, 0.3)
                          : alpha(theme.palette.warning.main, 0.3),
                        bgcolor: isPaid
                          ? alpha(isIsencao ? '#9c27b0' : theme.palette.success.main, 0.04)
                          : alpha(theme.palette.warning.main, 0.04),
                      }}>
                        <Grid container spacing={3} alignItems="center">
                          <Grid size={{ xs: 12, sm: 'auto' }}>
                            <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                              {isPaid ? 'VALOR LIQUIDADO' : 'VALOR A PAGAR'}
                            </Typography>
                            <Typography variant="h4" fontWeight={900}
                              color={isPaid ? (isIsencao ? '#9c27b0' : 'success.main') : 'primary.main'}>
                              {isIsencao ? '0' : (payment.amount ?? payment.invoice ?? '—')} €
                            </Typography>
                          </Grid>
                          {methodLabel && (
                            <Grid size={{ xs: 12, sm: 'auto' }}>
                              <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                                MÉTODO
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                {isIsencao && <IsencaoIcon sx={{ fontSize: 18, color: '#9c27b0' }} />}
                                <Typography variant="body1" fontWeight={600}
                                  color={isIsencao ? '#9c27b0' : 'text.primary'}>
                                  {methodLabel}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {isPaid && (
                            <Grid size={{ xs: 12, sm: 'auto' }} sx={{ ml: { sm: 'auto' } }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: isIsencao ? '#9c27b0' : 'success.main' }}>
                                <SuccessIcon sx={{ fontSize: 28 }} />
                                <Typography variant="body2" fontWeight={700}>
                                  {isIsencao ? 'Isenção confirmada' : 'Pagamento confirmado'}
                                </Typography>
                              </Box>
                            </Grid>
                          )}
                          {!isPaid && !isIsencao && !!(payment.amount ?? payment.invoice) && Number(payment.amount ?? payment.invoice) > 0 && (
                            <Grid size={{ xs: 12, sm: 'auto' }} sx={{ ml: { sm: 'auto' } }}>
                              <Button
                                variant="contained"
                                size="large"
                                startIcon={<PayNowIcon />}
                                onClick={() => setPaymentOpen(true)}
                                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
                              >
                                Pagar Agora
                              </Button>
                            </Grid>
                          )}
                        </Grid>
                      </Box>

                      {/* Referência Multibanco */}
                      {payment.payment_reference && (() => {
                        let ref = payment.payment_reference;
                        if (typeof ref === 'string' && ref.startsWith('{')) {
                          try { ref = JSON.parse(ref); } catch (_) {}
                        }
                        const entity = ref?.entity || ref?.paymentEntity;
                        const reference = ref?.reference || ref?.paymentReference;
                        if (!entity && !reference) return null;
                        return (
                          <Box sx={{
                            p: 2.5, borderRadius: 2,
                            border: '1px solid', borderColor: 'divider',
                            bgcolor: 'background.paper',
                          }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PaymentIcon fontSize="small" color="primary" />
                              Referência Multibanco
                            </Typography>
                            <Grid container spacing={3}>
                              <Grid size={{ xs: 6, sm: 4 }}>
                                <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                                  ENTIDADE
                                </Typography>
                                <Typography variant="body1" fontWeight={700} sx={{ letterSpacing: 1 }}>
                                  {entity || '—'}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 6, sm: 8 }}>
                                <Typography variant="caption" color="text.disabled" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
                                  REFERÊNCIA
                                </Typography>
                                <Typography variant="body1" fontWeight={700} sx={{ letterSpacing: 2 }}>
                                  {reference || '—'}
                                </Typography>
                              </Grid>
                            </Grid>
                          </Box>
                        );
                      })()}
                    </Stack>
                  </TabPanel>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Dialog de pagamento */}
      {payment && (
        <PaymentDialog
          open={paymentOpen}
          onClose={handlePaymentClose}
          documentId={id}
          amount={payment.amount ?? payment.invoice}
          regnumber={pedido.regnumber}
        />
      )}
    </>
  );
};

export default PortalPedidoDetailPage;
