import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import {
    Typography, Paper, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
    Grid, Card, CardContent, Tabs, Tab, TextField,
    Select, MenuItem, FormControl, InputLabel, Pagination, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import {
    CheckCircle, Visibility, Refresh, Assignment, Schedule,
    Euro, History, Close as CloseIcon, Cancel, VerifiedUser, Undo, Sync
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notification from '@/core/services/notification';
import { useAuth } from '@/core/contexts/AuthContext';
import useMetaData from '@/core/hooks/useMetaData';
import paymentService from '../services/paymentService';
import { PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS } from '../services/paymentTypes';

const DocumentDetailsModal = lazy(() => import('@/features/documents/components/details/DocumentDetailsModal'));

const PaymentAdminPage = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const { data: metaData } = useMetaData();
    const queryClient = useQueryClient();

    const [tab, setTab] = useState(0);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [refundOpen, setRefundOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [checkingStatusPk, setCheckingStatusPk] = useState(null);
    const [selectedDoc, setSelectedDoc]   = useState(null);
    const [filters, setFilters] = useState({
        startDate: '', endDate: '', method: '', status: ''
    });
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const getUserNameByPk = useCallback((userPk) => {
        if (!userPk || !metaData?.who) return `Utilizador ${userPk}`;
        const found = metaData.who.find(u => u.pk === userPk);
        return found?.name || `Utilizador ${userPk}`;
    }, [metaData]);

    // Query pagamentos pendentes
    const { data: rawPayments = [], isLoading: isLoadingPending, refetch: fetchPending } = useQuery({
        queryKey: ['pendingPayments'],
        queryFn: async () => {
            const result = await paymentService.getPendingPayments();
            if (result?.payments && Array.isArray(result.payments)) return result.payments;
            if (Array.isArray(result)) return result;
            return [];
        },
        enabled: tab === 0,
    });

    const payments = useMemo(() => Array.isArray(rawPayments) ? rawPayments : [], [rawPayments]);

    const [exemptionPage, setExemptionPage] = useState(1);
    const exemptionPageSize = 20;
    const [exemptionFilters, setExemptionFilters] = useState({ startDate: '', endDate: '' });

    // Query histórico de isenções (todas, não só pendentes)
    const { data: exemptionData, isLoading: isLoadingExemptions, refetch: fetchExemptions } = useQuery({
        queryKey: ['exemptionHistory', exemptionPage, exemptionFilters],
        queryFn: async () => {
            const result = await paymentService.getExemptionHistory({
                page: exemptionPage,
                page_size: exemptionPageSize,
                start_date: exemptionFilters.startDate || null,
                end_date: exemptionFilters.endDate || null,
            });
            return result || { exemptions: [], total: 0, stats: {} };
        },
        enabled: tab === 2,
        keepPreviousData: true,
    });

    const exemptions = useMemo(() => exemptionData?.exemptions ?? [], [exemptionData]);
    const exemptionStats = useMemo(() => exemptionData?.stats ?? {}, [exemptionData]);
    const exemptionTotalPages = Math.ceil((exemptionData?.total || 0) / exemptionPageSize);

    // Mutation aprovar pagamento
    const { mutate: approvePayment, isLoading: isApproving } = useMutation({
        mutationFn: (paymentPk) => paymentService.approvePayment(paymentPk),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
            queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
            setConfirmOpen(false);
            setSelectedPayment(null);
        },
        onError: (err) => notification.apiError(err, 'Erro na aprovação do pagamento.'),
    });

    // Mutation aprovar isenção
    const { mutate: approveExemption, isLoading: isApprovingExemption } = useMutation({
        mutationFn: (paymentPk) => paymentService.approveExemption(paymentPk),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingExemptions'] });
            setConfirmOpen(false);
            setSelectedPayment(null);
        },
        onError: (err) => notification.apiError(err, 'Erro na aprovação da isenção.'),
    });

    // Mutation devolução
    const { mutate: refundPayment, isLoading: isRefunding } = useMutation({
        mutationFn: ({ pk, reason }) => paymentService.refundPayment(pk, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
            setRefundOpen(false);
            setRefundReason('');
            setSelectedPayment(null);
        },
        onError: (err) => notification.apiError(err, 'Erro na devolução.'),
    });

    // Verificação manual de estado SIBS (apenas para estados não-finais)
    const handleCheckSibsStatus = async (payment) => {
        setCheckingStatusPk(payment.pk);
        try {
            const result = await paymentService.checkStatus(payment.transaction_id);
            if (result?.updated) {
                notification.success(`Estado actualizado: ${getStatusLabel(result.payment_status)}`);
                queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
                queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
            } else {
                notification.info(`Estado actual junto da SIBS: ${getStatusLabel(result?.payment_status || payment.payment_status)}`);
            }
        } catch (err) {
            notification.apiError(err, 'Erro ao verificar estado junto da SIBS.');
        } finally {
            setCheckingStatusPk(null);
        }
    };

    // Sincronização forçada com SIBS — inclui devoluções externas
    const [syncingPk, setSyncingPk] = useState(null);
    const handleForceSyncSibs = async (payment) => {
        if (!['MBWAY', 'MULTIBANCO'].includes(payment.payment_method)) return;
        setSyncingPk(payment.pk);
        try {
            const result = await paymentService.forceSyncStatus(payment.transaction_id);
            if (result?.updated) {
                notification.success(result.message || `Estado actualizado: ${getStatusLabel(result.payment_status)}`);
                queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
                queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
                queryClient.invalidateQueries({ queryKey: ['invoiceAmount', result.document_id] });
                queryClient.invalidateQueries({ queryKey: ['documents', 'detail'] });
            } else {
                notification.info(result?.message || 'Estado já sincronizado com SIBS.');
            }
        } catch (err) {
            notification.apiError(err, 'Erro ao sincronizar com SIBS.');
        } finally {
            setSyncingPk(null);
        }
    };

    // Mutation rejeitar isenção
    const { mutate: rejectExemption, isLoading: isRejecting } = useMutation({
        mutationFn: (paymentPk) => paymentService.rejectExemption(paymentPk),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingExemptions'] });
            setRejectOpen(false);
            setSelectedPayment(null);
        },
        onError: (err) => notification.apiError(err, 'Erro na rejeição da isenção.'),
    });

    // Query histórico
    const { data: historyData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['paymentHistory', page, filters],
        queryFn: async () => {
            const result = await paymentService.getPaymentHistory({
                page, page_size: pageSize,
                start_date: filters.startDate || null,
                end_date: filters.endDate || null,
                method: filters.method || null,
                status: filters.status || null,
            });
            if (result && Array.isArray(result.payments)) return result;
            return { payments: [], total: 0 };
        },
        enabled: tab === 1,
        keepPreviousData: true,
    });

    const totalPages = Math.ceil((historyData?.total || 0) / pageSize);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', method: '', status: '' });
        setPage(1);
    };

    const handleDetailsClick = async (payment) => {
        setSelectedPayment(null);
        setDetailsOpen(true);
        try {
            const result = await paymentService.getPaymentDetails(payment.pk);
            const data = result?.payment || result || payment;

            if (data.payment_reference) {
                try {
                    const ref = typeof data.payment_reference === 'string'
                        ? JSON.parse(data.payment_reference)
                        : data.payment_reference;
                    if (ref.submitted_by) data.submitter_name = getUserNameByPk(ref.submitted_by);
                } catch {}
            }
            setSelectedPayment(data);
        } catch {
            setSelectedPayment(payment);
        }
    };

    const currentData = tab === 0 ? payments : tab === 1 ? (historyData?.payments ?? []) : exemptions;
    const isLoading = (tab === 0 && isLoadingPending) || (tab === 1 && isLoadingHistory) || (tab === 2 && isLoadingExemptions);

    const handleExemptionFilterChange = (field, value) => {
        setExemptionFilters(prev => ({ ...prev, [field]: value }));
        setExemptionPage(1);
    };

    const getMethodLabel = (method) => PAYMENT_METHOD_LABELS[method] || method;

    const getStatusLabel = (status) => {
        const labels = {
            PENDING_VALIDATION: 'Pendente', SUCCESS: 'Aprovado',
            DECLINED: 'Rejeitado', REJECTED: 'Rejeitado',
            PENDING: 'Pendente', EXPIRED: 'Expirado', REFUNDED: 'Devolvido'
        };
        return labels[status] || status;
    };

    const refreshAction = (
        <Button
            variant="outlined" size="small" startIcon={<Refresh />}
            onClick={tab === 0 ? fetchPending : tab === 2 ? fetchExemptions : () => queryClient.invalidateQueries({ queryKey: ['paymentHistory'] })}
            disabled={isLoading}
        >
            Actualizar
        </Button>
    );

    const getExemptionStatusLabel = (status) => {
        const labels = { SUCCESS: 'Aprovado', PENDING_VALIDATION: 'Pendente', REJECTED: 'Rejeitado', DECLINED: 'Recusado' };
        return labels[status] || status;
    };
    const getExemptionStatusColor = (status) => {
        const colors = { SUCCESS: 'success', PENDING_VALIDATION: 'warning', REJECTED: 'error', DECLINED: 'error' };
        return colors[status] || 'default';
    };

    return (
        <ModulePage
            title="Gestão de Pagamentos"
            subtitle="Validação, histórico e isenções de pagamentos SIBS"
            icon={Assignment}
            color="#1976d2"
            breadcrumbs={[{ label: 'Pagamentos', path: '/payments' }]}
            actions={refreshAction}
        >
            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} variant={isMobile ? 'fullWidth' : 'standard'}>
                    <Tab icon={<Schedule />} label={`Pendentes (${payments.length})`} iconPosition="start" />
                    <Tab icon={<History />} label="Histórico" iconPosition="start" />
                    <Tab icon={<VerifiedUser />} label="Isenções" iconPosition="start" />
                </Tabs>
            </Paper>

            {/* Filtros (histórico) */}
            {tab === 1 && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField type="date" label="Data início" value={filters.startDate}
                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                size="small" fullWidth InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <TextField type="date" label="Data fim" value={filters.endDate}
                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                size="small" fullWidth InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Método</InputLabel>
                                <Select value={filters.method} label="Método"
                                    onChange={(e) => handleFilterChange('method', e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="CASH">Numerário</MenuItem>
                                    <MenuItem value="BANK_TRANSFER">Transferência</MenuItem>
                                    <MenuItem value="MUNICIPALITY">Municípios</MenuItem>
                                    <MenuItem value="MBWAY">MB WAY</MenuItem>
                                    <MenuItem value="MULTIBANCO">Multibanco</MenuItem>
                                    <MenuItem value="ISENCAO">Isenção</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Estado</InputLabel>
                                <Select value={filters.status} label="Estado"
                                    onChange={(e) => handleFilterChange('status', e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    <MenuItem value="SUCCESS">Aprovado</MenuItem>
                                    <MenuItem value="DECLINED">Recusado</MenuItem>
                                    <MenuItem value="REJECTED">Rejeitado</MenuItem>
                                    <MenuItem value="PENDING_VALIDATION">Pendente</MenuItem>
                                    <MenuItem value="REFUNDED">Devolvido</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button variant="outlined" onClick={clearFilters} fullWidth>Limpar</Button>
                                <Button variant="contained" onClick={() => queryClient.invalidateQueries({ queryKey: ['paymentHistory'] })} fullWidth>
                                    Filtrar
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Stats pendentes */}
            {tab === 0 && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Schedule sx={{ fontSize: 36, color: 'warning.main', mb: 0.5 }} />
                                <Typography variant="h4">{payments.length}</Typography>
                                <Typography variant="body2" color="text.secondary">Pendentes</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Euro sx={{ fontSize: 36, color: 'success.main', mb: 0.5 }} />
                                <Typography variant="h4">
                                    {`€${payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">Total Pendente</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Schedule sx={{ fontSize: 36, color: 'info.main', mb: 0.5 }} />
                                <Typography variant="h4">{new Set(payments.map(p => p.tb_document)).size}</Typography>
                                <Typography variant="body2" color="text.secondary">Pedidos distintos</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Stats + filtros isenções */}
            {tab === 2 && (
                <>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                    <VerifiedUser sx={{ fontSize: 28, color: '#9c27b0', mb: 0.5 }} />
                                    <Typography variant="h5" fontWeight={700}>{exemptionStats.total_all ?? '—'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Total isenções</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                    <CheckCircle sx={{ fontSize: 28, color: 'success.main', mb: 0.5 }} />
                                    <Typography variant="h5" fontWeight={700}>{exemptionStats.total_approved ?? '—'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Aprovadas</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                    <Schedule sx={{ fontSize: 28, color: 'info.main', mb: 0.5 }} />
                                    <Typography variant="h5" fontWeight={700}>{exemptionStats.this_month ?? '—'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Este mês</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 6, sm: 3 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                                    <Euro sx={{ fontSize: 28, color: 'warning.main', mb: 0.5 }} />
                                    <Typography variant="h5" fontWeight={700}>{exemptionStats.this_year ?? '—'}</Typography>
                                    <Typography variant="caption" color="text.secondary">Este ano</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <TextField type="date" label="Data início" value={exemptionFilters.startDate}
                                    onChange={(e) => handleExemptionFilterChange('startDate', e.target.value)}
                                    size="small" fullWidth InputLabelProps={{ shrink: true }} />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 3 }}>
                                <TextField type="date" label="Data fim" value={exemptionFilters.endDate}
                                    onChange={(e) => handleExemptionFilterChange('endDate', e.target.value)}
                                    size="small" fullWidth InputLabelProps={{ shrink: true }} />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 3 }}>
                                <Button variant="outlined" fullWidth size="small"
                                    onClick={() => { setExemptionFilters({ startDate: '', endDate: '' }); setExemptionPage(1); }}>
                                    Limpar filtros
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                </>
            )}

            {/* Tabela */}
            <Paper elevation={2}>
                <TableContainer>
                    <Table size={isMobile ? 'small' : 'medium'}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Documento</TableCell>
                                {!isMobile && <TableCell>Método</TableCell>}
                                {tab === 1 && !isMobile && <TableCell>Estado</TableCell>}
                                <TableCell align="right">Valor</TableCell>
                                {!isMobile && <TableCell>Data</TableCell>}
                                <TableCell align="center">Acções</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : currentData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {tab === 0 ? 'Nenhum pagamento pendente'
                                                : tab === 1 ? 'Nenhum registo encontrado'
                                                    : 'Nenhuma isenção registada'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : currentData.map((payment) => (
                                <TableRow key={payment.pk} hover>
                                    <TableCell>
                                        <Tooltip title="Clique para consultar o pedido">
                                            <Chip
                                                label={payment.regnumber || payment.order_id}
                                                size="small" variant="outlined" color="primary"
                                                onClick={() => setSelectedDoc({ pk: payment.tb_document, regnumber: payment.regnumber || payment.order_id, who: payment.who })}
                                                sx={{ cursor: 'pointer', fontWeight: 600, mb: payment.document_descr ? 0.5 : 0 }}
                                            />
                                        </Tooltip>
                                        {payment.document_descr && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {payment.document_descr}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            <Chip label={getMethodLabel(payment.payment_method)} size="small"
                                                sx={{ bgcolor: PAYMENT_STATUS_COLORS[payment.payment_method] || 'grey.500', color: 'white' }} />
                                        </TableCell>
                                    )}
                                    {tab === 1 && !isMobile && (
                                        <TableCell>
                                            <Chip label={getStatusLabel(payment.payment_status)} size="small"
                                                sx={{ bgcolor: PAYMENT_STATUS_COLORS[payment.payment_status] || 'grey.500', color: 'white' }} />
                                        </TableCell>
                                    )}
                                    <TableCell align="right">
                                        {tab === 2 ? (
                                            <Chip
                                                label={getExemptionStatusLabel(payment.payment_status)}
                                                size="small"
                                                color={getExemptionStatusColor(payment.payment_status)}
                                            />
                                        ) : (
                                            <Typography variant="body2" fontWeight={600}>
                                                {`€${Number(payment.amount || 0).toFixed(2)}`}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    {!isMobile && (
                                        <TableCell>
                                            {new Date(payment.created_at).toLocaleDateString('pt-PT')}
                                        </TableCell>
                                    )}
                                    <TableCell align="center">
                                        <IconButton size="small" onClick={() => handleDetailsClick(payment)} color="primary">
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                        {tab === 0 && ['MBWAY', 'MULTIBANCO'].includes(payment.payment_method) && (
                                            <Tooltip title="Verificar estado junto da SIBS">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        disabled={checkingStatusPk === payment.pk}
                                                        onClick={() => handleCheckSibsStatus(payment)}
                                                    >
                                                        {checkingStatusPk === payment.pk
                                                            ? <CircularProgress size={16} />
                                                            : <Sync fontSize="small" />
                                                        }
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        )}
                                        {tab === 0 && (
                                            <IconButton size="small" color="success" onClick={() => {
                                                setSelectedPayment(payment);
                                                setConfirmOpen(true);
                                            }}>
                                                <CheckCircle fontSize="small" />
                                            </IconButton>
                                        )}
                                        {tab === 1 && ['MBWAY', 'MULTIBANCO'].includes(payment.payment_method) && (
                                            <Tooltip title="Sincronizar estado com SIBS (inclui devoluções externas)">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="info"
                                                        disabled={syncingPk === payment.pk}
                                                        onClick={() => handleForceSyncSibs(payment)}
                                                    >
                                                        {syncingPk === payment.pk
                                                            ? <CircularProgress size={16} />
                                                            : <Sync fontSize="small" />
                                                        }
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        )}
                                        {tab === 1 && payment.payment_status === 'SUCCESS' && (
                                            <IconButton size="small" color="secondary" title="Devolver pagamento"
                                                onClick={() => {
                                                    setSelectedPayment(payment);
                                                    setRefundReason('');
                                                    setRefundOpen(true);
                                                }}>
                                                <Undo fontSize="small" />
                                            </IconButton>
                                        )}
                                        {tab === 2 && payment.payment_status === 'PENDING_VALIDATION' && (
                                            <>
                                                <IconButton size="small" color="success" title="Aprovar isenção" onClick={() => {
                                                    setSelectedPayment(payment);
                                                    setConfirmOpen(true);
                                                }}>
                                                    <CheckCircle fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" title="Rejeitar isenção" onClick={() => {
                                                    setSelectedPayment(payment);
                                                    setRejectOpen(true);
                                                }}>
                                                    <Cancel fontSize="small" />
                                                </IconButton>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {tab === 1 && totalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <Pagination count={totalPages} page={page}
                            onChange={(_, p) => setPage(p)} color="primary" size={isMobile ? 'small' : 'medium'} />
                    </Box>
                )}
                {tab === 2 && exemptionTotalPages > 1 && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                        <Pagination count={exemptionTotalPages} page={exemptionPage}
                            onChange={(_, p) => setExemptionPage(p)} color="secondary" size={isMobile ? 'small' : 'medium'} />
                    </Box>
                )}
            </Paper>

            {/* Modal Detalhes */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment /> Detalhes do Pagamento
                    </Box>
                    <IconButton onClick={() => setDetailsOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {!selectedPayment ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>
                    ) : (
                        <Box>
                            <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'white', borderRadius: 2 }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2">
                                            <strong>Valor:</strong> {selectedPayment.payment_method === 'ISENCAO'
                                                ? 'Gratuito'
                                                : `€${Number(selectedPayment.amount || 0).toFixed(2)}`}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <Typography variant="body2"><strong>Método:</strong></Typography>
                                            <Chip label={getMethodLabel(selectedPayment.payment_method)} size="small" />
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                            <Typography variant="body2"><strong>Estado:</strong></Typography>
                                            <Chip label={getStatusLabel(selectedPayment.payment_status)} size="small" />
                                        </Box>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2"><strong>ID Transação:</strong> {selectedPayment.transaction_id}</Typography>
                                        <Typography variant="body2"><strong>Order ID:</strong> {selectedPayment.order_id}</Typography>
                                        <Typography variant="body2"><strong>Data:</strong> {new Date(selectedPayment.created_at).toLocaleString('pt-PT')}</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>

                            {(selectedPayment.validated_by || selectedPayment.validated_at) && (
                                <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light', color: 'white', borderRadius: 2 }}>
                                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <CheckCircle fontSize="small" /> Validação
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Validado por:</strong> {selectedPayment.validator_name || `Utilizador ${selectedPayment.validated_by}`}
                                    </Typography>
                                    {selectedPayment.validated_at && (
                                        <Typography variant="body2">
                                            <strong>Data:</strong> {new Date(selectedPayment.validated_at).toLocaleString('pt-PT')}
                                        </Typography>
                                    )}
                                </Paper>
                            )}

                            {selectedPayment.payment_reference && (() => {
                                try {
                                    const ref = typeof selectedPayment.payment_reference === 'string'
                                        ? JSON.parse(selectedPayment.payment_reference) : selectedPayment.payment_reference;
                                    return (
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="subtitle2" gutterBottom>Detalhes Específicos</Typography>
                                            {ref.payment_details && <Typography variant="body2"><strong>Referência:</strong> {ref.payment_details}</Typography>}
                                            {ref.submitted_by && <Typography variant="body2"><strong>Submetido por:</strong> {selectedPayment.submitter_name || `Utilizador ${ref.submitted_by}`}</Typography>}
                                            {ref.submitted_at && <Typography variant="body2"><strong>Data Submissão:</strong> {new Date(ref.submitted_at).toLocaleString('pt-PT')}</Typography>}
                                            {ref.payment_type && <Typography variant="body2"><strong>Tipo:</strong> {ref.payment_type}</Typography>}
                                        </Paper>
                                    );
                                } catch {
                                    return (
                                        <Paper variant="outlined" sx={{ p: 2 }}>
                                            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {selectedPayment.payment_reference}
                                            </Typography>
                                        </Paper>
                                    );
                                }
                            })()}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
                    {tab === 1 && selectedPayment?.payment_status === 'SUCCESS' && (
                        <Button variant="outlined" color="secondary" startIcon={<Undo />}
                            onClick={() => { setDetailsOpen(false); setRefundReason(''); setRefundOpen(true); }}>
                            Devolver
                        </Button>
                    )}
                    {selectedPayment && ['MBWAY', 'MULTIBANCO'].includes(selectedPayment.payment_method) && (
                        <Button
                            variant="outlined" color="info"
                            startIcon={syncingPk === selectedPayment.pk ? <CircularProgress size={16} /> : <Sync />}
                            disabled={syncingPk === selectedPayment.pk}
                            onClick={() => handleForceSyncSibs(selectedPayment)}
                        >
                            Sincronizar SIBS
                        </Button>
                    )}
                    {tab === 0 && selectedPayment && (
                        <Button variant="contained" color="success" startIcon={<CheckCircle />}
                            onClick={() => { setDetailsOpen(false); setConfirmOpen(true); }}>
                            Aprovar
                        </Button>
                    )}
                    {tab === 2 && selectedPayment?.payment_status === 'PENDING_VALIDATION' && (
                        <>
                            <Button variant="contained" color="success" startIcon={<CheckCircle />}
                                onClick={() => { setDetailsOpen(false); setConfirmOpen(true); }}>
                                Aprovar
                            </Button>
                            <Button variant="outlined" color="error" startIcon={<Cancel />}
                                onClick={() => { setDetailsOpen(false); setRejectOpen(true); }}>
                                Rejeitar
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>

            {/* Modal Confirmação Aprovação */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>
                    {tab === 2 ? 'Confirmar Aprovação de Isenção' : 'Confirmar Aprovação'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        {tab === 2
                            ? <>Aprovar a isenção para o pedido <strong>{selectedPayment?.regnumber}</strong>?</>
                            : <>Aprovar pagamento de <strong>€{Number(selectedPayment?.amount || 0).toFixed(2)}</strong>?</>
                        }
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                    <Button variant="contained" color="success"
                        disabled={isApproving || isApprovingExemption}
                        onClick={() => {
                            if (tab === 2) approveExemption(selectedPayment.pk);
                            else approvePayment(selectedPayment.pk);
                        }}>
                        {(isApproving || isApprovingExemption) ? 'A aprovar...' : 'Aprovar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Confirmação Devolução */}
            <Dialog open={refundOpen} onClose={() => { setRefundOpen(false); setRefundReason(''); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Undo color="secondary" /> Confirmar Devolução
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Esta acção é irreversível. O pagamento será marcado como devolvido
                        {selectedPayment?.payment_method === 'MBWAY' || selectedPayment?.payment_method === 'MULTIBANCO'
                            ? ' e a devolução será processada junto da SIBS.'
                            : '.'}
                    </Alert>
                    <Typography sx={{ mb: 2 }}>
                        Devolver pagamento de <strong>€{Number(selectedPayment?.amount || 0).toFixed(2)}</strong>{' '}
                        referente ao pedido <strong>{selectedPayment?.regnumber || selectedPayment?.order_id}</strong>?
                    </Typography>
                    <TextField
                        label="Motivo da devolução"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        fullWidth multiline rows={2} size="small"
                        placeholder="Opcional — descreva o motivo da devolução"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setRefundOpen(false); setRefundReason(''); }}>Cancelar</Button>
                    <Button variant="contained" color="secondary" startIcon={<Undo />}
                        disabled={isRefunding}
                        onClick={() => refundPayment({ pk: selectedPayment.pk, reason: refundReason })}>
                        {isRefunding ? 'A processar...' : 'Confirmar Devolução'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Confirmação Rejeição (isenções) */}
            <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)}>
                <DialogTitle>Confirmar Rejeição de Isenção</DialogTitle>
                <DialogContent>
                    <Typography>
                        Rejeitar a isenção do pedido <strong>{selectedPayment?.regnumber}</strong>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        O pedido voltará a estar pendente de pagamento e o utilizador será notificado.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectOpen(false)}>Cancelar</Button>
                    <Button variant="contained" color="error" startIcon={<Cancel />}
                        disabled={isRejecting}
                        onClick={() => rejectExemption(selectedPayment.pk)}>
                        {isRejecting ? 'A rejeitar...' : 'Rejeitar'}
                    </Button>
                </DialogActions>
            </Dialog>
            {selectedDoc && (
                <Suspense fallback={null}>
                    <DocumentDetailsModal
                        open={!!selectedDoc}
                        onClose={() => setSelectedDoc(null)}
                        documentData={selectedDoc}
                        isOwner={selectedDoc?.who && user ? Number(selectedDoc.who) === Number(user.user_id) : undefined}
                    />
                </Suspense>
            )}
        </ModulePage>
    );
};

export default PaymentAdminPage;
