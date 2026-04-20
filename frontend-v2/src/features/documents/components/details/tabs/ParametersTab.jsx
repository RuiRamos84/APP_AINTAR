import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    Paper,
    Typography,
    Skeleton,
    Alert,
    Chip,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Divider,
    CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, Close as CloseIcon } from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { documentsService } from '../../../api/documentsService';
import ParametersStep from '../../forms/steps/ParametersStep';
import { useMetaData } from '@/core/hooks/useMetaData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import paymentService from '../../../../../features/payments/services/paymentService';

const ParametersTab = ({ document }) => {
    const theme = useTheme();
    const { data: metaData } = useMetaData();
    const queryClient = useQueryClient();
    const [editOpen, setEditOpen] = useState(false);

    // Fetch invoice data para verificar se pagamento SIBS foi concluído
    const { data: invoiceAmount } = useQuery({
        queryKey: ['invoiceAmount', document?.pk],
        queryFn: () => paymentService.getInvoiceAmount(document.pk),
        enabled: !!document?.pk
    });

    const isSibsPaymentCompleted = useMemo(() => {
        if (!invoiceAmount?.invoice_data) return false;
        const paymentStatus = invoiceAmount.invoice_data.payment_status?.toLowerCase();
        const paymentMethod = invoiceAmount.invoice_data.payment_method?.toUpperCase();
        return paymentStatus === 'success' &&
               (paymentMethod === 'MBWAY' || paymentMethod === 'MULTIBANCO' || paymentMethod === 'REFERENCE');
    }, [invoiceAmount]);

    // Fetch Params
    const { data: params, isLoading, error } = useQuery({
        queryKey: ['documentParams', document?.pk],
        queryFn: () => documentsService.fetchParams(document.pk),
        enabled: !!document?.pk
    });

    const [editValues, setEditValues] = useState({});
    const [docTypeParams, setDocTypeParams] = useState([]);

    useEffect(() => {
        if (params) {
            const definitions = params.map(p => ({
                param_pk: p.tb_param || p.pk,
                link_pk: p.pk,
                name: p.name,
                type: p.type,
                units: p.units,
                multiline: 0
            }));
            setDocTypeParams(definitions);

            const values = {};
            params.forEach(p => {
                const key = `param_${p.tb_param || p.pk}`;
                values[key] = p.value;
            });
            setEditValues(values);
        }
    }, [params]);

    const handleParamChange = (paramId, value) => {
        setEditValues(prev => ({ ...prev, [`param_${paramId}`]: value }));
    };

    const updatemutation = useMutation({
        mutationFn: (newParams) => documentsService.updateParams(document.pk, newParams),
        onSuccess: () => {
            queryClient.invalidateQueries(['documentParams', document.pk]);
            setEditOpen(false);
        }
    });

    const handleSave = () => {
        const payload = params.map(p => {
            const key = `param_${p.tb_param || p.pk}`;
            return { pk: p.pk, value: editValues[key], memo: p.memo };
        });
        updatemutation.mutate(payload);
    };

    // ── Format display value for the read-only list ───────────────────────
    const formatValue = (p) => {
        if (p.type === 4 || p.type === '4') {
            const val = p.value;
            if (val === null || val === undefined || val === '') return <Chip label="—" size="small" variant="outlined" />;
            const isTrue = val === '1' || val === 1 || val === true || val === 'true';
            const isFalse = val === '0' || val === 0 || val === false || val === 'false';
            if (isTrue) return <Chip label="Sim" color="success" size="small" />;
            if (isFalse) return <Chip label="Não" color="default" size="small" />;
            return <Chip label="—" size="small" variant="outlined" />;
        }
        if (p.type === 3 || p.type === '3') {
            if (p.name === 'Local de descarga/ETAR' || p.name === 'ETAR') {
                const resolved = metaData?.etar?.find(x => String(x.pk) === String(p.value))?.nome;
                return resolved || p.value || '—';
            }
            if (p.name === 'EE') {
                const resolved = metaData?.ee?.find(x => String(x.pk) === String(p.value))?.nome;
                return resolved || p.value || '—';
            }
            if (p.name === 'Método de pagamento') {
                const resolved = metaData?.payment_method?.find(x => String(x.pk) === String(p.value))?.value;
                return resolved || p.value || '—';
            }
        }
        return p.value ?? '—';
    };

    if (isLoading) return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />;
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>Erro ao carregar parâmetros.</Alert>;
    if (!params || params.length === 0) return <Alert severity="info" sx={{ mt: 2 }}>Sem parâmetros.</Alert>;

    return (
        <Box>
            {/* Read-only parameter list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {params.map((p) => (
                    <Paper
                        key={p.pk}
                        variant="outlined"
                        sx={{
                            px: 2,
                            py: 1.25,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 2,
                            bgcolor: alpha(theme.palette.background.paper, 1),
                        }}
                    >
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            fontWeight="500"
                            sx={{ flex: 1 }}
                        >
                            {p.name}
                        </Typography>
                        <Box sx={{ flexShrink: 0 }}>
                            {typeof formatValue(p) === 'string' || typeof formatValue(p) === 'number' ? (
                                <Typography variant="body2" fontWeight="600">
                                    {formatValue(p)}{p.units ? ` ${p.units}` : ''}
                                </Typography>
                            ) : (
                                formatValue(p)
                            )}
                        </Box>
                    </Paper>
                ))}
            </Box>

            <Box display="flex" justifyContent="flex-end" mt={2}>
                <Button
                    startIcon={<EditIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => setEditOpen(true)}
                >
                    Editar Parâmetros
                </Button>
            </Box>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EditIcon color="primary" fontSize="small" />
                        <Typography variant="h6">Editar Parâmetros</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => setEditOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent sx={{ pt: 2.5 }}>
                    <ParametersStep
                        docTypeParams={docTypeParams}
                        paramValues={editValues}
                        handleParamChange={handleParamChange}
                        isSibsPaymentCompleted={isSibsPaymentCompleted}
                    />
                </DialogContent>
                <Divider />
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setEditOpen(false)} color="inherit">Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={updatemutation.isPending}
                        startIcon={updatemutation.isPending ? <CircularProgress size={16} /> : null}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ParametersTab;
