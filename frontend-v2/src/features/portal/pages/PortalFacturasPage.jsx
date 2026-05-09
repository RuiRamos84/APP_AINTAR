import React, { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Chip, Button, Skeleton, alpha, useTheme, Stack,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Divider, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Receipt as InvoiceIcon,
  Download as DownloadIcon,
  Payment as PaymentIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  VerifiedUser as IsencaoIcon,
  EuroSymbol as EuroIcon,
  HourglassEmpty as HourglassIcon,
  Assignment as ContractIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import { useQueryClient } from '@tanstack/react-query';
import { useMinhasFaturas, useMeusContratos, paymentKeys } from '../hooks/useMinhasFaturas';
import { useSearch } from '@/shared/hooks';
import { SearchBar } from '@/shared/components/data';
import { portalService } from '@/services/portalService';
import notification from '@/core/services/notification';
import PaymentDialog from '@/features/payments/components/modals/PaymentDialog';
import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
import { PAYMENT_METHOD_LABELS } from '@/features/payments/services/paymentTypes';

const fmt = (val) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(val ?? 0);

const getPaymentInfo = (p) => {
  const isIsencao = p.payment_method === 'ISENCAO';
  const isPaid = p.payed || p.payment_status === 'SUCCESS';
  const isPendingValidation = p.payment_status === 'PENDING_VALIDATION' && !isPaid;

  if (isIsencao && isPaid) return { label: 'Isento', color: 'secondary', icon: <IsencaoIcon style={{ fontSize: 14 }} />, sx: { bgcolor: '#9c27b0', color: 'white' } };
  if (isPaid)              return { label: 'Liquidada', color: 'success', icon: <PaidIcon style={{ fontSize: 14 }} />, sx: {} };
  if (isPendingValidation) return { label: 'A validar', color: 'info', icon: <HourglassIcon style={{ fontSize: 14 }} />, sx: {} };
  return                          { label: 'Pendente', color: 'warning', icon: <PendingIcon style={{ fontSize: 14 }} />, sx: {} };
};

const fmtDate = (val) => val ? new Date(val).toLocaleDateString('pt-PT') : '—';

const ContractsSection = ({ contracts, isLoading }) => {
  const theme = useTheme();

  if (isLoading) return <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 3 }} />;
  if (!contracts.length) return null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <ContractIcon sx={{ fontSize: 20, color: 'primary.main' }} />
        Serviços Recorrentes
      </Typography>
      <Stack spacing={1}>
        {contracts.map((c) => {
          const pendingPayments = c.payments.filter(p => p.presented && !p.payed);
          const paidPayments = c.payments.filter(p => p.payed);
          const today = new Date();
          const hasOverdue = pendingPayments.some(p => {
            const deadline = new Date(p.presented);
            deadline.setDate(deadline.getDate() + 30);
            return today > deadline;
          });

          return (
            <Accordion
              key={c.pk}
              elevation={0}
              sx={{
                borderRadius: '12px !important',
                border: '1px solid',
                borderColor: hasOverdue ? alpha(theme.palette.error.main, 0.35) : 'divider',
                '&:before': { display: 'none' },
                '&.Mui-expanded': { my: 0 },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
                  <ContractIcon sx={{ color: hasOverdue ? 'error.main' : 'primary.main', flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      Contrato #{c.pk}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Desde {fmtDate(c.start_date)}
                      {c.stop_date ? ` · até ${fmtDate(c.stop_date)}` : ''}
                      {c.address ? ` · ${c.address}` : ''}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    {pendingPayments.length > 0 && (
                      <Chip
                        size="small"
                        icon={hasOverdue ? <OverdueIcon style={{ fontSize: 13 }} /> : <PendingIcon style={{ fontSize: 13 }} />}
                        label={`${pendingPayments.length} pendente${pendingPayments.length > 1 ? 's' : ''}`}
                        color={hasOverdue ? 'error' : 'warning'}
                        sx={{ fontWeight: 600 }}
                      />
                    )}
                    {paidPayments.length > 0 && (
                      <Chip size="small" label={`${paidPayments.length} pago${paidPayments.length > 1 ? 's' : ''}`} color="success" sx={{ fontWeight: 600 }} />
                    )}
                  </Stack>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 3, pt: 0, pb: 2 }}>
                <Divider sx={{ mb: 1.5 }} />
                {c.payments.length === 0 ? (
                  <Typography variant="caption" color="text.disabled">Sem períodos registados.</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {c.payments.map((p) => {
                      const isPaid = !!p.payed;
                      const deadline = p.presented ? (() => { const d = new Date(p.presented); d.setDate(d.getDate() + 30); return d; })() : null;
                      const isOverdue = !isPaid && deadline && today > deadline;
                      return (
                        <Box key={p.pk} sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          px: 2, py: 1, borderRadius: 2,
                          bgcolor: isPaid
                            ? alpha(theme.palette.success.main, 0.06)
                            : isOverdue
                              ? alpha(theme.palette.error.main, 0.06)
                              : alpha(theme.palette.warning.main, 0.06),
                        }}>
                          <Box>
                            <Typography variant="caption" fontWeight={600}>
                              {fmtDate(p.start_date)} — {fmtDate(p.stop_date)}
                            </Typography>
                            {p.presented && !isPaid && (
                              <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.disabled'} sx={{ display: 'block' }}>
                                Faturado a {fmtDate(p.presented)}{deadline ? ` · prazo ${fmtDate(deadline)}` : ''}
                              </Typography>
                            )}
                            {isPaid && (
                              <Typography variant="caption" color="success.main" sx={{ display: 'block' }}>
                                Pago a {fmtDate(p.payed)}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={700}
                              color={isPaid ? 'success.main' : isOverdue ? 'error.main' : 'text.primary'}>
                              {fmt(p.value)}
                            </Typography>
                            <Chip
                              size="small"
                              label={isPaid ? 'Pago' : isOverdue ? 'Em atraso' : p.presented ? 'Por pagar' : 'Agendado'}
                              color={isPaid ? 'success' : isOverdue ? 'error' : p.presented ? 'warning' : 'default'}
                              sx={{ fontWeight: 600 }}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
};

const PortalFacturasPage = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { data: payments = [], isLoading } = useMinhasFaturas();
  const { data: contracts = [], isLoading: isLoadingContracts } = useMeusContratos();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [paymentData, setPaymentData] = useState(null);

  // Filtros estruturais (estado + datas)
  const filtered = useMemo(() => {
    return payments.filter(p => {
      const isPaid = p.payed || p.payment_status === 'SUCCESS';
      const isIsencao = p.payment_method === 'ISENCAO';

      if (filterStatus === 'paid'    && !isPaid) return false;
      if (filterStatus === 'pending' && isPaid)  return false;
      if (filterStatus === 'isencao' && !isIsencao) return false;

      if (filterStart) {
        const sub = new Date(p.submission);
        if (sub < new Date(filterStart)) return false;
      }
      if (filterEnd) {
        const sub = new Date(p.submission);
        if (sub > new Date(filterEnd + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [payments, filterStatus, filterStart, filterEnd]);

  const results = useSearch(filtered, search);

  // Stats
  const stats = useMemo(() => {
    const pending     = payments.filter(p => !p.payed && p.payment_status !== 'SUCCESS');
    const totalDebt   = pending.reduce((s, p) => s + Number(p.invoice ?? 0), 0);
    const thisYear    = new Date().getFullYear();
    const paidYear    = payments.filter(p =>
      (p.payed || p.payment_status === 'SUCCESS') &&
      new Date(p.submission).getFullYear() === thisYear
    );
    const totalPaidYear = paidYear.reduce((s, p) => s + Number(p.invoice ?? 0), 0);
    const exemptions  = payments.filter(p => p.payment_method === 'ISENCAO' && (p.payed || p.payment_status === 'SUCCESS'));
    return { pendingCount: pending.length, totalDebt, totalPaidYear, exemptionsCount: exemptions.length };
  }, [payments]);

  const handleDownload = async (docId, regnumber) => {
    try {
      const blob = await portalService.downloadInvoice(docId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Fatura_${regnumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      notification.error('Erro ao descarregar fatura');
    }
  };

  const handlePaymentClose = (result) => {
    setPaymentData(null);
    if (result) queryClient.invalidateQueries({ queryKey: paymentKeys.lists() });
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterStart('');
    setFilterEnd('');
    setSearch('');
  };

  const hasFilters = filterStatus || filterStart || filterEnd || search;

  return (
    <>
      <PortalPageHeader
        title="Faturas e Pagamentos"
        subtitle="Consulte as suas faturas, estados de liquidação e referências para pagamento."
      />
      <Container maxWidth="lg" sx={{ py: 4 }}>

        {/* Stats */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <PendingIcon sx={{ fontSize: 28, color: 'warning.main', mb: 0.5 }} />
                <Typography variant="h5" fontWeight={800} color="warning.main">
                  {isLoading ? '—' : stats.pendingCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">Pendentes</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <EuroIcon sx={{ fontSize: 28, color: 'error.main', mb: 0.5 }} />
                <Typography variant="h5" fontWeight={800} color="error.main">
                  {isLoading ? '—' : fmt(stats.totalDebt)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Em dívida</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <PaidIcon sx={{ fontSize: 28, color: 'success.main', mb: 0.5 }} />
                <Typography variant="h5" fontWeight={800} color="success.main">
                  {isLoading ? '—' : fmt(stats.totalPaidYear)}
                </Typography>
                <Typography variant="caption" color="text.secondary">Pago {new Date().getFullYear()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <IsencaoIcon sx={{ fontSize: 28, color: '#9c27b0', mb: 0.5 }} />
                <Typography variant="h5" fontWeight={800} sx={{ color: '#9c27b0' }}>
                  {isLoading ? '—' : stats.exemptionsCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">Isenções</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filtros */}
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
          <CardContent sx={{ py: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 4 }}>
                <SearchBar searchTerm={search} onSearch={setSearch} placeholder="Pesquisar pedido ou tipo..." />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Estado</InputLabel>
                  <Select value={filterStatus} label="Estado" onChange={e => setFilterStatus(e.target.value)}>
                    <MenuItem value="">Todos</MenuItem>
                    <MenuItem value="pending">Pendentes</MenuItem>
                    <MenuItem value="paid">Liquidadas</MenuItem>
                    <MenuItem value="isencao">Isenções</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField type="date" label="De" value={filterStart}
                  onChange={e => setFilterStart(e.target.value)}
                  size="small" fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField type="date" label="Até" value={filterEnd}
                  onChange={e => setFilterEnd(e.target.value)}
                  size="small" fullWidth InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <Button fullWidth variant="outlined" size="small" onClick={clearFilters} disabled={!hasFilters}>
                  Limpar
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Contagem de resultados */}
        {!isLoading && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            {results.length} {results.length === 1 ? 'fatura' : 'faturas'}
            {hasFilters ? ' (filtradas)' : ''}
          </Typography>
        )}

        {/* Lista */}
        <Stack spacing={1.5}>
          {isLoading ? (
            [1, 2, 3].map(i => (
              <Skeleton key={i} variant="rectangular" height={96} sx={{ borderRadius: 3 }} />
            ))
          ) : results.length > 0 ? (
            results.map((p) => {
              const isPaid = p.payed || p.payment_status === 'SUCCESS';
              const isIsencao = p.payment_method === 'ISENCAO';
              const info = getPaymentInfo(p);
              const methodLabel = p.payment_method ? PAYMENT_METHOD_LABELS[p.payment_method] : null;

              return (
                <Card
                  key={p.tb_document}
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: isPaid
                      ? alpha(isIsencao ? '#9c27b0' : theme.palette.success.main, 0.25)
                      : alpha(theme.palette.warning.main, 0.25),
                    transition: 'all 0.15s ease',
                    '&:hover': { boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.08)}` },
                  }}
                >
                  <CardContent sx={{ py: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 3 } }}>
                    <Grid container alignItems="center" spacing={2}>

                      {/* Ícone + Info */}
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{
                            width: 44, height: 44, borderRadius: 2, flexShrink: 0,
                            bgcolor: alpha(isPaid
                              ? (isIsencao ? '#9c27b0' : theme.palette.success.main)
                              : theme.palette.warning.main, 0.1),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isIsencao
                              ? <IsencaoIcon sx={{ color: '#9c27b0' }} />
                              : isPaid
                                ? <PaidIcon sx={{ color: 'success.main' }} />
                                : <InvoiceIcon sx={{ color: 'warning.main' }} />
                            }
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="caption" color="text.disabled"
                              sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                              {p.regnumber}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {p.type_name}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {new Date(p.submission).toLocaleDateString('pt-PT')}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>

                      {/* Valor */}
                      <Grid size={{ xs: 6, sm: 2 }}>
                        <Typography variant="h6" fontWeight={800}
                          color={isPaid ? (isIsencao ? '#9c27b0' : 'success.main') : 'text.primary'}>
                          {isIsencao ? '0,00 €' : fmt(p.invoice)}
                        </Typography>
                      </Grid>

                      {/* Estado + Método */}
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Stack spacing={0.5} alignItems="flex-start">
                          <Chip
                            icon={info.icon}
                            label={info.label}
                            size="small"
                            color={info.color}
                            sx={{ fontWeight: 600, ...info.sx }}
                          />
                          {isPaid && methodLabel && !isIsencao && (
                            <Typography variant="caption" color="text.disabled">
                              via {methodLabel}
                            </Typography>
                          )}
                        </Stack>
                      </Grid>

                      {/* Ações */}
                      <Grid size={{ xs: 12, sm: 3 }} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                        {!isPaid ? (
                          <Button
                            variant="contained" size="small" startIcon={<PaymentIcon />}
                            onClick={() => setPaymentData({ documentId: p.tb_document, amount: p.invoice, regnumber: p.regnumber })}
                            sx={{ borderRadius: 2 }}
                          >
                            Pagar Agora
                          </Button>
                        ) : (
                          <Button
                            variant="outlined" size="small" startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(p.tb_document, p.regnumber)}
                            sx={{ borderRadius: 2 }}
                          >
                            PDF
                          </Button>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <InvoiceIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2, opacity: 0.25 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {hasFilters ? 'Nenhuma fatura corresponde aos filtros.' : 'Sem faturas disponíveis.'}
              </Typography>
              {hasFilters && (
                <Button size="small" onClick={clearFilters} sx={{ mt: 1 }}>Limpar filtros</Button>
              )}
            </Box>
          )}
        </Stack>

        {/* Contratos / Serviços Recorrentes */}
        {(isLoadingContracts || contracts.length > 0) && (
          <Box sx={{ mt: 4 }}>
            <ContractsSection contracts={contracts} isLoading={isLoadingContracts} />
          </Box>
        )}

        {/* Modal de Pagamento */}
        {paymentData && (
          <PaymentDialog
            open={!!paymentData}
            onClose={handlePaymentClose}
            documentId={paymentData.documentId}
            amount={paymentData.amount}
            regnumber={paymentData.regnumber}
          />
        )}
      </Container>
    </>
  );
};

export default PortalFacturasPage;
