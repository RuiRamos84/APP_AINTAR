import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Container, Typography, Paper, Box, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
    Grid, Card, CardContent, Avatar, Tabs, Tab, TextField,
    Select, MenuItem, FormControl, InputLabel, FormHelperText, Pagination, Tooltip, InputAdornment,
    Badge, alpha, useTheme, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import {
    CheckCircle, Visibility, Refresh, Assignment, Schedule,
    Euro, FilterList, History, Description, Edit, Warning, NotificationsActive
} from '@mui/icons-material';
import paymentService from '../services/paymentService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PAYMENT_STATUS_COLORS } from '../services/paymentTypes';
import { useMetaData } from '../../../contexts/MetaDataContext';

const emptyContract = { ts_entity: '', start_date: '', stop_date: '', family: '', tt_contractfrequency: '', address: '', postal: '', door: '', floor: '', nut1: '', nut2: '', nut3: '', nut4: '' };

const PaymentAdminPage = ({ userInfo }) => {
    const { metaData } = useMetaData();
    const queryClient = useQueryClient();
    const theme = useTheme();
    const [tab, setTab] = useState(0);
    const [error, setError] = useState('');
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const [selectedContract, setSelectedContract] = useState(null);
    const [newContractOpen, setNewContractOpen] = useState(false);
    const [validatePaymentOpen, setValidatePaymentOpen] = useState(false);
    const [paymentToValidate, setPaymentToValidate] = useState(null);
    const [payedDate, setPayedDate] = useState('');
    const [invoicePaymentOpen, setInvoicePaymentOpen] = useState(false);
    const [paymentToInvoice, setPaymentToInvoice] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [contractSearch, setContractSearch] = useState('');
    const [nifDialogOpen, setNifDialogOpen] = useState(false);
    const [newContractForm, setNewContractForm] = useState(emptyContract);
    const [nifInput, setNifInput] = useState('');
    const [nifEntity, setNifEntity] = useState(null);
    const [nifLoading, setNifLoading] = useState(false);
    const [nifError, setNifError] = useState('');
    const [contractSubmitted, setContractSubmitted] = useState(false);

    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        method: '',
        status: '',
        user: ''
    });
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const hasAccess = true;

    const getUserNameByPk = useCallback((userPk) => {
        if (!userPk || !metaData?.who) {
            return `Utilizador ${userPk}`;
        }
        const user = metaData.who.find(user => user.pk === userPk);
        return user?.name || `Utilizador ${userPk}`;
    }, [metaData]);

    // Query pagamentos pendentes
    const { data: rawPayments, isLoading: isLoadingPending, refetch: fetchPendingPayments } = useQuery({
        queryKey: ['pendingPayments'],
        queryFn: async () => {
            try {
                const result = await paymentService.getPendingPayments();
                console.log('API Response:', result);

                if (result?.payments && Array.isArray(result.payments)) {
                    return result.payments;
                }
                if (Array.isArray(result)) {
                    return result;
                }

                console.warn('Unexpected API response structure:', result);
                return [];
            } catch (error) {
                console.error('Error fetching payments:', error);
                return [];
            }
        },
        enabled: hasAccess && tab === 0,
    });

    // Garantir que payments é sempre array
    const payments = useMemo(() => {
        return Array.isArray(rawPayments) ? rawPayments : [];
    }, [rawPayments]);

    // Mutation aprovar pagamentos
    const { mutate: approvePayment, isLoading: isApproving } = useMutation({
        mutationFn: (paymentPk) => paymentService.approvePayment(paymentPk),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
            queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
            setConfirmOpen(false);
            setSelectedPayment(null);
        },
        onError: (err) => {
            setError(err.message || 'Erro na aprovação');
        }
    });

    // Mutation faturar pagamento de contrato
    const { mutate: invoiceContractPayment, isLoading: isInvoicing } = useMutation({
        mutationFn: ({ contractPk, paymentPk, invoiceDate }) => paymentService.invoiceContractPayment(contractPk, paymentPk, invoiceDate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contractPayments', selectedContract?.pk] });
            setInvoicePaymentOpen(false);
            setPaymentToInvoice(null);
            setInvoiceDate('');
        },
        onError: (err) => setError(err.message || 'Erro ao registar faturação'),
    });

    // Mutation validar pagamento de contrato
    const { mutate: validateContractPayment, isLoading: isValidating } = useMutation({
        mutationFn: ({ contractPk, paymentPk, payedDate }) => paymentService.validateContractPayment(contractPk, paymentPk, payedDate),
        onSuccess: (_, { paymentPk }) => {
            queryClient.invalidateQueries({ queryKey: ['contractPayments', selectedContract?.pk] });
            // Remoção imediata do alerta sem esperar pelo servidor
            queryClient.setQueryData(['contractAlerts'], (old) => {
                if (!old) return old;
                const alerts = old?.alerts ?? old ?? [];
                const filtered = alerts.filter(a => a.pk !== paymentPk);
                return Array.isArray(old) ? filtered : { ...old, alerts: filtered };
            });
            setValidatePaymentOpen(false);
            setPaymentToValidate(null);
            setPayedDate('');
        },
        onError: (err) => {
            setError(err.message || 'Erro ao validar pagamento');
        }
    });

    const handleOpenValidate = (cp) => {
        setPaymentToValidate(cp);
        setPayedDate('');
        setValidatePaymentOpen(true);
    };

    // Mutation criar contrato
    const { mutate: createContract, isLoading: isCreatingContract } = useMutation({
        mutationFn: (data) => paymentService.createContract(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] });
            setNewContractOpen(false);
            setNewContractForm(emptyContract);
        },
        onError: (err) => {
            setError(err.message || 'Erro ao criar contrato');
        }
    });

    // Query contratos
    const { data: contractsData, isLoading: isLoadingContracts } = useQuery({
        queryKey: ['contracts'],
        queryFn: async () => {
            const result = await paymentService.getContracts();
            return Array.isArray(result?.contracts) ? result.contracts : [];
        },
        enabled: hasAccess && tab === 2,
    });
    const contracts = contractsData ?? [];

    const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);
    const [alertsFilter, setAlertsFilter] = useState('all'); // 'all' | 'overdue' | 'pending'

    // Query alertas de contratos
    const { data: contractAlerts = [], isLoading: isLoadingAlerts, refetch: refetchAlerts } = useQuery({
        queryKey: ['contractAlerts'],
        queryFn: async () => {
            const result = await paymentService.getContractAlerts();
            return Array.isArray(result?.alerts) ? result.alerts : [];
        },
        enabled: hasAccess && tab === 2,
        staleTime: 0,
    });

    const overdueCount = contractAlerts.filter(a => a.overdue).length;

    const handleOpenAlerts = () => {
        setAlertsDialogOpen(true);
        refetchAlerts();
    };

    // Query pagamentos do contrato selecionado
    const { data: contractPaymentsData, isLoading: isLoadingContractPayments } = useQuery({
        queryKey: ['contractPayments', selectedContract?.pk],
        queryFn: async () => {
            const result = await paymentService.getContractPayments(selectedContract.pk);
            return Array.isArray(result?.payments) ? result.payments : [];
        },
        enabled: !!selectedContract,
    });
    const contractPayments = contractPaymentsData ?? [];

    // Query histórico pagamentos
    const { data: historyData, isLoading: isLoadingHistory } = useQuery({
        queryKey: ['paymentHistory', page, filters],
        queryFn: async () => {
            const result = await paymentService.getPaymentHistory({
                page,
                page_size: pageSize,
                ...filters,
                start_date: filters.startDate || null,
                end_date: filters.endDate || null,
                exclude_pending: true
            });

            if (result && Array.isArray(result.payments) && typeof result.total === 'number') {
                return result;
            }
            return { payments: [], total: 0 };
        },
        enabled: hasAccess && tab === 1,
        keepPreviousData: true,
    });

    const totalPages = Math.ceil((historyData?.total || 0) / pageSize);

    const handleTabChange = (_, newTab) => {
        setTab(newTab);
        setPage(1);
        if (newTab !== 2) setSelectedContract(null);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({ startDate: null, endDate: null, method: '', status: '', user: '' });
        setPage(1);
    };

    const resetNifDialog = () => {
        setNifInput('');
        setNifEntity(null);
        setNifError('');
    };

    const handleNifSearch = async () => {
        const clean = nifInput.replace(/\D/g, '');
        if (!clean) return;
        setNifError('');
        setNifLoading(true);
        try {
            const { entity } = await paymentService.getEntityByNipc(clean);
            if (!entity || !entity.pk) {
                setNifError('NIF não encontrado');
                return;
            }
            setNifEntity(entity);
            setNewContractForm({
                ...emptyContract,
                ts_entity: entity.pk,
                address: entity.address || '',
                postal: entity.postal || '',
                door: entity.door || '',
                floor: entity.floor || '',
                nut1: entity.nut1 || '',
                nut2: entity.nut2 || '',
                nut3: entity.nut3 || '',
                nut4: entity.nut4 || '',
            });
            setNifDialogOpen(false);
            setNewContractOpen(true);
        } catch (_) {
            setNifError('NIF não encontrado');
        } finally {
            setNifLoading(false);
        }
    };

    const handleDetailsClick = async (payment) => {
        if (!payment?.pk) return;

        setSelectedPayment(null);
        setDetailsOpen(true);

        try {
            const result = await paymentService.getPaymentDetails(payment.pk);
            const paymentData = result.success ? result.payment : payment;

            if (paymentData.payment_reference) {
                try {
                    const ref = typeof paymentData.payment_reference === 'string'
                        ? JSON.parse(paymentData.payment_reference)
                        : paymentData.payment_reference;

                    if (ref.submitted_by) {
                        paymentData.submitter_name = getUserNameByPk(ref.submitted_by);
                    }
                } catch (e) {
                    console.error('Erro ao processar payment_reference:', e);
                }
            }

            setSelectedPayment(paymentData);
        } catch (err) {
            console.error('Erro geral:', err);
            setSelectedPayment(payment);
        }
    };

    if (!hasAccess) {
        return (
            <Container>
                <Alert severity="warning" sx={{ mt: 3 }}>
                    Acesso negado. Apenas utilizadores autorizados podem gerir pagamentos.
                </Alert>
            </Container>
        );
    }

    const currentData = tab === 0 ? payments : historyData?.payments ?? [];
    const formatDate = (val) => val ? new Date(val).toLocaleDateString('pt-PT') : '—';

    return (
        <Container maxWidth="lg">
            <Box py={3}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Avatar sx={{
                        width: 80,
                        height: 80,
                        mx: 'auto',
                        mb: 2,
                        bgcolor: 'primary.main'
                    }}>
                        <Assignment sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h4" gutterBottom>
                        Gestão de Pagamentos
                    </Typography>
                </Box>

                {/* Tabs */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs value={tab} onChange={handleTabChange}>
                        <Tab
                            icon={<Schedule />}
                            label={`Pendentes (${payments.length})`}
                            iconPosition="start"
                        />
                        <Tab
                            icon={<History />}
                            label="Histórico"
                            iconPosition="start"
                        />
                        <Tab
                            icon={<Description />}
                            label="Contratos"
                            iconPosition="start"
                        />
                    </Tabs>
                </Paper>

                {/* Aba Contratos */}
                {tab === 2 && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <TextField
                                size="small"
                                placeholder="Pesquisar por entidade, NIPC, morada, localização..."
                                value={contractSearch}
                                onChange={(e) => setContractSearch(e.target.value)}
                                sx={{ width: 380 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <FilterList fontSize="small" />
                                        </InputAdornment>
                                    ),
                                    endAdornment: contractSearch ? (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setContractSearch('')}>✕</IconButton>
                                        </InputAdornment>
                                    ) : null,
                                }}
                            />
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Alertas de pagamento">
                                    <Badge badgeContent={overdueCount} color="error">
                                        <Button
                                            variant="outlined"
                                            color={overdueCount > 0 ? 'error' : 'warning'}
                                            startIcon={<NotificationsActive />}
                                            onClick={handleOpenAlerts}
                                        >
                                            Alertas
                                        </Button>
                                    </Badge>
                                </Tooltip>
                                <Button
                                    variant="contained"
                                    onClick={() => { resetNifDialog(); setNifDialogOpen(true); }}
                                >
                                    Novo Contrato
                                </Button>
                            </Box>
                        </Box>
                        <Paper elevation={2}>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Entidade</TableCell>
                                            <TableCell>NIPC</TableCell>
                                            <TableCell>Início</TableCell>
                                            <TableCell>Fim</TableCell>
                                            <TableCell>Família</TableCell>
                                            <TableCell>Frequência</TableCell>
                                            <TableCell>Morada</TableCell>
                                            <TableCell>Postal</TableCell>
                                            <TableCell>Porta</TableCell>
                                            <TableCell>Andar</TableCell>
                                            <TableCell>Distrito</TableCell>
                                            <TableCell>Município</TableCell>
                                            <TableCell>Freguesia</TableCell>
                                            <TableCell>Localidade</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {isLoadingContracts ? (
                                            <TableRow>
                                                <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                                                    <CircularProgress />
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (() => {
                                                const s = contractSearch.toLowerCase();
                                                const filtered = s ? contracts.filter(c =>
                                                    c.ts_entity?.toLowerCase().includes(s) ||
                                                    String(c.nipc || '').includes(s) ||
                                                    c.address?.toLowerCase().includes(s) ||
                                                    c.postal?.toLowerCase().includes(s) ||
                                                    c.nut1?.toLowerCase().includes(s) ||
                                                    c.nut2?.toLowerCase().includes(s) ||
                                                    c.nut3?.toLowerCase().includes(s) ||
                                                    c.nut4?.toLowerCase().includes(s)
                                                ) : contracts;
                                                if (filtered.length === 0) return (
                                                    <TableRow>
                                                        <TableCell colSpan={15} align="center" sx={{ py: 4 }}>
                                                            <Typography color="text.secondary">Nenhum contrato encontrado</Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                                return filtered.map((contract) => (
                                                    <TableRow
                                                        key={contract.pk}
                                                        hover
                                                        selected={selectedContract?.pk === contract.pk}
                                                        onClick={() => setSelectedContract(contract)}
                                                        sx={{ cursor: 'pointer' }}
                                                    >
                                                        <TableCell>{contract.ts_entity}</TableCell>
                                                        <TableCell>{contract.nipc}</TableCell>
                                                        <TableCell>{formatDate(contract.start_date)}</TableCell>
                                                        <TableCell>{formatDate(contract.stop_date)}</TableCell>
                                                        <TableCell>{contract.family}</TableCell>
                                                        <TableCell>{contract.tt_contractfrequency}</TableCell>
                                                        <TableCell>{contract.address}</TableCell>
                                                        <TableCell>{contract.postal}</TableCell>
                                                        <TableCell>{contract.door}</TableCell>
                                                        <TableCell>{contract.floor}</TableCell>
                                                        <TableCell>{contract.nut1}</TableCell>
                                                        <TableCell>{contract.nut2}</TableCell>
                                                        <TableCell>{contract.nut3}</TableCell>
                                                        <TableCell>{contract.nut4}</TableCell>
                                                    </TableRow>
                                                ));
                                            })()
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                    </Box>
                )}

                {/* Filtros (só no histórico) */}
                {tab === 1 && (
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <TextField
                                    type="date"
                                    label="Data início"
                                    value={filters.startDate || ''}
                                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                    size="small"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <TextField
                                    type="date"
                                    label="Data fim"
                                    value={filters.endDate || ''}
                                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                    size="small"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Método</InputLabel>
                                    <Select
                                        value={filters.method}
                                        onChange={(e) => handleFilterChange('method', e.target.value)}
                                    >
                                        <MenuItem value="">Todos</MenuItem>
                                        <MenuItem value="CASH">Numerário</MenuItem>
                                        <MenuItem value="BANK_TRANSFER">Transferência</MenuItem>
                                        <MenuItem value="MUNICIPALITY">Municípios</MenuItem>
                                        <MenuItem value="MBWAY">MB WAY</MenuItem>
                                        <MenuItem value="MULTIBANCO">Multibanco</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Estado</InputLabel>
                                    <Select
                                        value={filters.status}
                                        onChange={(e) => handleFilterChange('status', e.target.value)}
                                    >
                                        <MenuItem value="">Todos</MenuItem>
                                        <MenuItem value="SUCCESS">Aprovado</MenuItem>
                                        <MenuItem value="DECLINED">Rejeitado</MenuItem>
                                        <MenuItem value="PENDING_VALIDATION">Pendente</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={clearFilters}
                                    fullWidth
                                >
                                    Limpar
                                </Button>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 2 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => queryClient.invalidateQueries({ queryKey: ['paymentHistory'] })}
                                    fullWidth
                                >
                                    Filtrar
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                )}

                {/* Stats (só pendentes) */}
                {tab === 0 && (
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Schedule sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                                    <Typography variant="h4">{payments.length}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Pendentes
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Euro sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                                    <Typography variant="h4">
                                        €{payments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <Card>
                                <CardContent sx={{ textAlign: 'center' }}>
                                    <Button
                                        variant="contained"
                                        startIcon={isLoadingPending ? null : <Refresh />}
                                        onClick={fetchPendingPayments}
                                        disabled={isLoadingPending}
                                        fullWidth
                                    >
                                        {isLoadingPending ? 'A carregar...' : 'Actualizar'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}

                {tab !== 2 && (error || (tab === 1 && historyData?.error)) && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {/* Tabela pagamentos (tabs 0 e 1) */}
                {tab !== 2 && <Paper elevation={2}>
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Documento</TableCell>
                                    <TableCell>Método</TableCell>
                                    {tab === 1 && <TableCell>Estado</TableCell>}
                                    <TableCell align="right">Valor</TableCell>
                                    <TableCell>Data</TableCell>
                                    <TableCell align="center">Acções</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {(isLoadingPending && tab === 0) || (isLoadingHistory && tab === 1) ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <CircularProgress />
                                        </TableCell>
                                    </TableRow>
                                ) : currentData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={tab === 1 ? 6 : 5} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">
                                                {tab === 0 ? 'Nenhum pagamento pendente' : 'Nenhum registo encontrado'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    currentData.map((payment) => (
                                        <TableRow key={payment.pk} hover>
                                            <TableCell>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={600}>
                                                        {payment.regnumber || payment.order_id}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {payment.document_descr || 'Sem descrição'}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={payment.payment_method}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: `${PAYMENT_STATUS_COLORS[payment.payment_method] || 'grey.300'}`,
                                                        color: 'white'
                                                    }}
                                                />
                                            </TableCell>
                                            {tab === 1 && (
                                                <TableCell>
                                                    <Chip
                                                        label={payment.payment_status}
                                                        size="small"
                                                        sx={{
                                                            bgcolor: `${PAYMENT_STATUS_COLORS[payment.payment_status] || 'grey.300'}`,
                                                            color: 'white'
                                                        }}
                                                    />
                                                </TableCell>
                                            )}
                                            <TableCell align="right">
                                                <Typography variant="body2" fontWeight={600}>
                                                    €{Number(payment.amount || 0).toFixed(2)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">
                                                    {new Date(payment.created_at).toLocaleDateString('pt-PT')}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    onClick={() => handleDetailsClick(payment)}
                                                    color="primary"
                                                >
                                                    <Visibility />
                                                </IconButton>
                                                {tab === 0 && (
                                                    <IconButton
                                                        onClick={() => {
                                                            setSelectedPayment(payment);
                                                            setConfirmOpen(true);
                                                        }}
                                                        color="success"
                                                    >
                                                        <CheckCircle />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Paginação (só no histórico) */}
                    {tab === 1 && totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, newPage) => setPage(newPage)}
                                color="primary"
                            />
                        </Box>
                    )}
                </Paper>}
            </Box>

            {/* Diálogo Alertas */}
            <Dialog open={alertsDialogOpen} onClose={() => setAlertsDialogOpen(false)} maxWidth="lg" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                        <NotificationsActive color="warning" />
                        <Typography variant="h6">Alertas de Pagamento</Typography>
                        {!isLoadingAlerts && (
                            <Chip
                                label={`${overdueCount} em atraso · ${contractAlerts.length - overdueCount} pendentes`}
                                size="small"
                                color={overdueCount > 0 ? 'error' : 'warning'}
                            />
                        )}
                        <ToggleButtonGroup
                            value={alertsFilter}
                            exclusive
                            onChange={(_, v) => v && setAlertsFilter(v)}
                            size="small"
                            sx={{ ml: 'auto' }}
                        >
                            <ToggleButton value="all">Todos ({contractAlerts.length})</ToggleButton>
                            <ToggleButton value="overdue" sx={{ color: 'error.main' }}>Em atraso ({overdueCount})</ToggleButton>
                            <ToggleButton value="pending" sx={{ color: 'warning.main' }}>Dentro do prazo ({contractAlerts.length - overdueCount})</ToggleButton>
                        </ToggleButtonGroup>
                        <Tooltip title="Atualizar">
                            <IconButton size="small" onClick={refetchAlerts} disabled={isLoadingAlerts}>
                                <Refresh fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {isLoadingAlerts ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>
                    ) : contractAlerts.length === 0 ? (
                        <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                            <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                            <Typography variant="h6">Sem pagamentos em atraso</Typography>
                            <Typography variant="body2" sx={{ mt: 0.5 }}>Todos os pagamentos faturados estão dentro do prazo.</Typography>
                        </Box>
                    ) : (
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Cliente</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Período</TableCell>
                                        <TableCell>Faturado em</TableCell>
                                        <TableCell>Prazo (30 dias)</TableCell>
                                        <TableCell align="right">Valor</TableCell>
                                        <TableCell>Estado</TableCell>
                                        <TableCell />
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {contractAlerts.filter(a => alertsFilter === 'all' || (alertsFilter === 'overdue' ? a.overdue : !a.overdue)).map((a) => (
                                        <TableRow key={a.pk} hover sx={{ bgcolor: a.overdue ? alpha(theme.palette.error.main, 0.05) : 'inherit' }}>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={500}>{a.ts_entity}</Typography>
                                                <Typography variant="caption" color="text.secondary">{a.nipc}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{a.email || '—'}</Typography>
                                            </TableCell>
                                            <TableCell>{formatDate(a.start_date)} → {formatDate(a.stop_date)}</TableCell>
                                            <TableCell>{formatDate(a.presented)}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    {a.overdue
                                                        ? <Warning fontSize="small" color="error" />
                                                        : <Schedule fontSize="small" color="warning" />}
                                                    <Typography variant="body2" color={a.overdue ? 'error.main' : 'warning.main'} fontWeight={500}>
                                                        {formatDate(a.deadline)}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight={600}>€{Number(a.value || 0).toFixed(2)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={a.overdue ? 'Em atraso' : 'Dentro do prazo'}
                                                    size="small"
                                                    color={a.overdue ? 'error' : 'warning'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title="Registar pagamento">
                                                    <IconButton size="small" color="success"
                                                        onClick={() => { setPaymentToValidate(a); setPayedDate(''); setValidatePaymentOpen(true); }}
                                                    >
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAlertsDialogOpen(false)}>Fechar</Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo 1 — Pesquisa por NIF */}
            <Dialog open={nifDialogOpen} onClose={() => { setNifDialogOpen(false); resetNifDialog(); }} maxWidth="xs" fullWidth>
                <DialogTitle>Novo Contrato</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Digite o NIF da entidade para pesquisar.
                    </Typography>
                    <TextField
                        label="NIF"
                        value={nifInput}
                        onChange={(e) => { setNifInput(e.target.value.replace(/\D/g, '')); setNifError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleNifSearch()}
                        fullWidth
                        inputProps={{ maxLength: 9 }}
                        error={!!nifError}
                        helperText={nifError || ''}
                        autoFocus
                        InputProps={{
                            endAdornment: nifLoading ? <CircularProgress size={16} /> : null
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setNifDialogOpen(false); resetNifDialog(); }}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleNifSearch}
                        disabled={nifLoading || nifInput.length < 9}
                    >
                        {nifLoading ? 'A pesquisar...' : 'Pesquisar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Diálogo 2 — Formulário do Contrato */}
            <Dialog open={newContractOpen} onClose={() => { setNewContractOpen(false); setNewContractForm(emptyContract); setNifEntity(null); setContractSubmitted(false); }} maxWidth="md" fullWidth>
                <DialogTitle>Novo Contrato</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Entidade"
                                value={nifEntity?.name || ''}
                                fullWidth size="small"
                                InputProps={{ readOnly: true }}
                                sx={{ '& .MuiInputBase-input': { color: 'text.primary', WebkitTextFillColor: 'unset' } }}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField label="Família" type="number"
                                value={newContractForm.family}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || (Number(val) >= 1 && Number(val) <= 10))
                                        setNewContractForm(f => ({ ...f, family: val }));
                                }}
                                inputProps={{ min: 1, max: 10 }}
                                error={contractSubmitted && !newContractForm.family}
                                helperText={contractSubmitted && !newContractForm.family ? 'Campo obrigatório' : ''}
                                fullWidth size="small"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth size="small" error={contractSubmitted && !newContractForm.tt_contractfrequency}>
                                <InputLabel>Frequência *</InputLabel>
                                <Select
                                    value={newContractForm.tt_contractfrequency}
                                    onChange={(e) => setNewContractForm(f => ({ ...f, tt_contractfrequency: e.target.value }))}
                                    label="Frequência *"
                                >
                                    {(metaData?.contractfrequency || []).map(cf => (
                                        <MenuItem key={cf.pk} value={cf.pk}>{cf.value}</MenuItem>
                                    ))}
                                </Select>
                                {contractSubmitted && !newContractForm.tt_contractfrequency && <FormHelperText>Campo obrigatório</FormHelperText>}
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField type="date" label="Data início *"
                                value={newContractForm.start_date}
                                onChange={(e) => setNewContractForm(f => ({ ...f, start_date: e.target.value }))}
                                fullWidth size="small" InputLabelProps={{ shrink: true }}
                                error={contractSubmitted && !newContractForm.start_date}
                                helperText={contractSubmitted && !newContractForm.start_date ? 'Campo obrigatório' : ''}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            {(() => {
                                const dateError = contractSubmitted && (
                                    !newContractForm.stop_date ? 'Campo obrigatório' :
                                    newContractForm.start_date && newContractForm.stop_date <= newContractForm.start_date ? 'Deve ser posterior à data de início' : ''
                                );
                                return (
                                    <TextField type="date" label="Data fim *"
                                        value={newContractForm.stop_date}
                                        onChange={(e) => setNewContractForm(f => ({ ...f, stop_date: e.target.value }))}
                                        fullWidth size="small" InputLabelProps={{ shrink: true }}
                                        error={!!dateError}
                                        helperText={dateError || ''}
                                        inputProps={{ min: newContractForm.start_date || undefined }}
                                    />
                                );
                            })()}
                        </Grid>
                        {[
                            { field: 'address', label: 'Morada', size: { xs: 12, sm: 8 } },
                            { field: 'postal', label: 'Código Postal', size: { xs: 12, sm: 4 } },
                            { field: 'door', label: 'Porta', size: { xs: 6, sm: 3 } },
                            { field: 'floor', label: 'Andar', size: { xs: 6, sm: 3 } },
                            { field: 'nut1', label: 'Distrito', size: { xs: 6, sm: 3 } },
                            { field: 'nut2', label: 'Município', size: { xs: 6, sm: 3 } },
                            { field: 'nut3', label: 'Freguesia', size: { xs: 6, sm: 3 } },
                            { field: 'nut4', label: 'Localidade', size: { xs: 6, sm: 3 } },
                        ].map(({ field, label, size }) => (
                            <Grid key={field} size={size}>
                                <TextField
                                    label={label}
                                    value={newContractForm[field]}
                                    onChange={(e) => setNewContractForm(f => ({ ...f, [field]: e.target.value }))}
                                    fullWidth size="small"
                                />
                            </Grid>
                        ))}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setNewContractOpen(false); setNewContractForm(emptyContract); setNifEntity(null); setContractSubmitted(false); }}>
                        Cancelar
                    </Button>
                    <Button variant="contained" disabled={isCreatingContract}
                        onClick={() => {
                            setContractSubmitted(true);
                            const { ts_entity, start_date, stop_date, family, tt_contractfrequency } = newContractForm;
                            if (!ts_entity || !start_date || !stop_date || !family || !tt_contractfrequency) return;
                            if (stop_date <= start_date) return;
                            createContract(newContractForm);
                        }}
                    >
                        {isCreatingContract ? 'A guardar...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Pagamentos do Contrato */}
            <Dialog open={!!selectedContract} onClose={() => setSelectedContract(null)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Typography variant="h6">{selectedContract?.ts_entity}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        {selectedContract?.nipc}{selectedContract?.email ? ` · ${selectedContract.email}` : ''}
                    </Typography>
                </DialogTitle>
                <DialogContent>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Início</TableCell>
                                    <TableCell>Fim</TableCell>
                                    <TableCell align="right">Valor</TableCell>
                                    <TableCell>Faturado</TableCell>
                                    <TableCell>Pago</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoadingContractPayments ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <CircularProgress size={24} />
                                        </TableCell>
                                    </TableRow>
                                ) : contractPayments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            <Typography color="text.secondary">Sem pagamentos para este contrato</Typography>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    contractPayments.map((cp) => (
                                        <TableRow key={cp.pk} hover>
                                            <TableCell>{formatDate(cp.start_date)}</TableCell>
                                            <TableCell>{formatDate(cp.stop_date)}</TableCell>
                                            <TableCell align="right">
                                                <Typography fontWeight={600}>
                                                    €{Number(cp.value || 0).toFixed(2)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip
                                                        label={cp.presented ? formatDate(cp.presented) : 'Não'}
                                                        size="small"
                                                        color={cp.presented ? 'success' : 'default'}
                                                    />
                                                    {!cp.presented && (
                                                        <Tooltip title="Registar data de faturação">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => {
                                                                    setPaymentToInvoice(cp);
                                                                    setInvoiceDate('');
                                                                    setInvoicePaymentOpen(true);
                                                                }}
                                                            >
                                                                <Edit fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip
                                                        label={cp.payed ? `Pago ${formatDate(cp.payed)}` : 'Não'}
                                                        size="small"
                                                        color={cp.payed ? 'success' : 'error'}
                                                    />
                                                    {!cp.payed && (
                                                        <Tooltip title="Validar pagamento">
                                                            <IconButton
                                                                size="small"
                                                                color="success"
                                                                onClick={() => handleOpenValidate(cp)}
                                                            >
                                                                <CheckCircle fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedContract(null)}>Fechar</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Validar Pagamento de Contrato */}
            <Dialog open={validatePaymentOpen} onClose={() => setValidatePaymentOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Validar Pagamento</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Introduza a data do pagamento:
                    </Typography>
                    <TextField
                        type="date"
                        label="Data do pagamento"
                        value={payedDate}
                        onChange={(e) => setPayedDate(e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setValidatePaymentOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        disabled={!payedDate || isValidating}
                        onClick={() => validateContractPayment({ contractPk: paymentToValidate.tb_contract ?? selectedContract?.pk, paymentPk: paymentToValidate.pk, payedDate })}
                    >
                        {isValidating ? 'A guardar...' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Faturar Pagamento de Contrato */}
            <Dialog open={invoicePaymentOpen} onClose={() => setInvoicePaymentOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Registar Faturação</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Introduza a data de faturação:
                    </Typography>
                    <TextField
                        type="date"
                        label="Data de faturação"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInvoicePaymentOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        disabled={!invoiceDate || isInvoicing}
                        onClick={() => invoiceContractPayment({ contractPk: selectedContract.pk, paymentPk: paymentToInvoice.pk, invoiceDate })}
                    >
                        {isInvoicing ? 'A guardar...' : 'Confirmar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal Detalhes */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Assignment />
                        Detalhes do Pagamento {selectedPayment?.regnumber && `- ${selectedPayment.regnumber}`}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedPayment && (
                        <Box>
                            <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.light', color: 'white' }}>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Euro />
                                    Pagamento
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2">
                                            <strong>Valor Pago:</strong> €{Number(selectedPayment.amount || 0).toFixed(2)}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            <Typography variant="body2" component="span">
                                                <strong>Método:</strong>
                                            </Typography>
                                            <Chip label={selectedPayment.payment_method} size="small" />
                                        </Box>
                                        <Typography variant="body2" component="span">
                                            <strong>Estado:</strong>
                                            <Chip
                                                label={selectedPayment.payment_status}
                                                size="small"
                                            />
                                        </Typography>
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <Typography variant="body2">
                                            <strong>ID Transação:</strong> {selectedPayment.transaction_id}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Order ID:</strong> {selectedPayment.order_id}
                                        </Typography>
                                        <Typography variant="body2">
                                            <strong>Data Criação:</strong> {new Date(selectedPayment.created_at).toLocaleString('pt-PT')}
                                        </Typography>
                                        {selectedPayment.updated_at && (
                                            <Typography variant="body2">
                                                <strong>Última Actualização:</strong> {new Date(selectedPayment.updated_at).toLocaleString('pt-PT')}
                                            </Typography>
                                        )}
                                    </Grid>
                                </Grid>
                            </Paper>

                            {(selectedPayment.validated_by || selectedPayment.validated_at) && (
                                <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light', color: 'white' }}>
                                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircle />
                                        Validação
                                    </Typography>
                                    <Typography variant="body2">
                                        <strong>Validado por:</strong> {selectedPayment.validator_name || `Utilizador ${selectedPayment.validated_by}`}
                                    </Typography>
                                    {selectedPayment.validated_at && (
                                        <Typography variant="body2">
                                            <strong>Data Validação:</strong> {new Date(selectedPayment.validated_at).toLocaleString('pt-PT')}
                                        </Typography>
                                    )}
                                </Paper>
                            )}

                            {selectedPayment.payment_reference && (
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                    <Typography variant="h6" gutterBottom>
                                        Detalhes Específicos
                                    </Typography>
                                    {(() => {
                                        try {
                                            const ref = typeof selectedPayment.payment_reference === 'string'
                                                ? JSON.parse(selectedPayment.payment_reference)
                                                : selectedPayment.payment_reference;

                                            return (
                                                <Box>
                                                    {ref.payment_details && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Referencia:</strong> {ref.payment_details}
                                                        </Typography>
                                                    )}
                                                    {ref.submitted_by && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Submetido por:</strong> {selectedPayment.submitter_name || `Utilizador ${ref.submitted_by}`}
                                                        </Typography>
                                                    )}
                                                    {ref.submitted_at && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Data Submissão:</strong> {new Date(ref.submitted_at).toLocaleString('pt-PT')}
                                                        </Typography>
                                                    )}
                                                    {ref.payment_type && (
                                                        <Typography variant="body2" gutterBottom>
                                                            <strong>Tipo:</strong> {ref.payment_type}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );
                                        } catch (e) {
                                            return (
                                                <Paper sx={{ p: 1, bgcolor: 'grey.100' }}>
                                                    <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                                                        {selectedPayment.payment_reference}
                                                    </Typography>
                                                </Paper>
                                            );
                                        }
                                    })()}
                                </Paper>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Fechar</Button>
                    {tab === 0 && selectedPayment && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                                setDetailsOpen(false);
                                setConfirmOpen(true);
                            }}
                            startIcon={<CheckCircle />}
                        >
                            Aprovar
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Modal Confirmação */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Confirmar Aprovação</DialogTitle>
                <DialogContent>
                    <Typography>
                        Aprovar pagamento de <strong>€{Number(selectedPayment?.amount || 0).toFixed(2)}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={() => approvePayment(selectedPayment.pk)}
                        color="success"
                        disabled={isApproving}
                    >
                        {isApproving ? 'A aprovar...' : 'Aprovar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PaymentAdminPage;