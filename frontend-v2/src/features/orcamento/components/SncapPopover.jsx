import React, { useEffect, useState } from 'react';
import {
    Popover, Box, Typography, CircularProgress,
    Alert, Divider, alpha, Chip,
} from '@mui/material';
import { orcamentoService } from '../api/orcamentoService';

const MODULE_COLOR = '#059669';

export const SncapPopover = ({ anchorEl, sncapCode, onClose }) => {
    const open = Boolean(anchorEl) && Boolean(sncapCode);

    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        if (!open) { setData(null); setError(null); return; }
        setData(null);
        setError(null);
        setLoading(true);
        orcamentoService.getSncap(sncapCode)
            .then(res => setData(res?.data ?? res))
            .catch(() => setError('Código SNC-AP não encontrado na tabela de referência.'))
            .finally(() => setLoading(false));
    }, [open, sncapCode]);

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top',    horizontal: 'left' }}
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 2,
                        border: `1.5px solid ${alpha(MODULE_COLOR, 0.25)}`,
                        boxShadow: 6,
                        width: 340,
                        overflow: 'hidden',
                    },
                },
            }}
        >
            {/* Cabeçalho */}
            <Box sx={{
                bgcolor: alpha(MODULE_COLOR, 0.07),
                borderBottom: `1px solid ${alpha(MODULE_COLOR, 0.15)}`,
                px: 2, py: 1.25,
                display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
                <Box>
                    <Typography variant="caption" color="text.secondary"
                        textTransform="uppercase" letterSpacing={0.7} fontWeight={700}
                        display="block">
                        SNC-AP
                    </Typography>
                    <Typography variant="h6" fontFamily="monospace" fontWeight={800}
                        color={MODULE_COLOR} lineHeight={1.1}>
                        {sncapCode}
                    </Typography>
                </Box>
                <Chip
                    label="SNC-AP"
                    size="small"
                    sx={{
                        ml: 'auto', height: 20, fontSize: '0.65rem',
                        bgcolor: alpha(MODULE_COLOR, 0.12),
                        color: MODULE_COLOR, fontWeight: 700,
                    }}
                />
            </Box>

            {/* Corpo */}
            <Box sx={{ px: 2, py: 1.75 }}>
                {loading && (
                    <Box display="flex" justifyContent="center" py={2}>
                        <CircularProgress size={22} sx={{ color: MODULE_COLOR }} />
                    </Box>
                )}

                {error && !loading && (
                    <Alert severity="warning" sx={{ fontSize: '0.8rem', py: 0.5 }}>
                        {error}
                    </Alert>
                )}

                {data && !loading && (
                    <Box>
                        {/* Nome */}
                        <Typography variant="body2" fontWeight={700} color="text.primary"
                            sx={{ lineHeight: 1.4 }}>
                            {data.name || '—'}
                        </Typography>

                        {/* Memo */}
                        {data.memo && (
                            <>
                                <Divider sx={{ my: 1.25 }} />
                                <Typography variant="caption" textTransform="uppercase"
                                    letterSpacing={0.5} fontWeight={700}
                                    color="text.disabled" display="block" mb={0.5}>
                                    Descrição
                                </Typography>
                                <Typography variant="body2" color="text.secondary"
                                    sx={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    {data.memo}
                                </Typography>
                            </>
                        )}

                        {/* Exemplo */}
                        {data.example && (
                            <>
                                <Divider sx={{ my: 1.25 }} />
                                <Typography variant="caption" textTransform="uppercase"
                                    letterSpacing={0.5} fontWeight={700}
                                    color="text.disabled" display="block" mb={0.5}>
                                    Exemplo
                                </Typography>
                                <Typography variant="body2" color="text.secondary"
                                    sx={{ fontSize: '0.8rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                                    {data.example}
                                </Typography>
                            </>
                        )}
                    </Box>
                )}
            </Box>
        </Popover>
    );
};
