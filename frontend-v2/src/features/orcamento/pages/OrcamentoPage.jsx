import React, { useEffect } from 'react';
import {
    Box, Button, Typography, Stack, MenuItem, TextField, Skeleton,
} from '@mui/material';
import {
    Add as AddIcon,
    AccountBalance as OrcamentoIcon,
    List as CatalogIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { OrcamentoTable } from '../components/OrcamentoTable';

const OrcamentoPage = () => {
    const navigate = useNavigate();
    const { anos, anoSelecionado, setAno, openModal, fetchAnos, loading } = useOrcamentoStore();

    useEffect(() => {
        const init = async () => {
            const list = await fetchAnos();
            if (list.length > 0) {
                setAno(list[0]);
            } else {
                const { fetchDetalhe, fetchSummary, fetchSubclasses } = useOrcamentoStore.getState();
                fetchDetalhe();
                fetchSummary();
                fetchSubclasses();
            }
        };
        init();
    }, []);

    return (
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header */}
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                gap={2}
            >
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <OrcamentoIcon color="primary" fontSize="large" />
                    <Typography variant="h4" fontWeight="bold">
                        Orçamento
                    </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={2}>
                    {/* Seletor de Ano */}
                    {anos.length > 0 ? (
                        <TextField
                            select
                            size="small"
                            label="Ano"
                            value={anoSelecionado ?? ''}
                            onChange={(e) => setAno(e.target.value)}
                            sx={{ minWidth: 110 }}
                        >
                            {anos.map((a) => (
                                <MenuItem key={a} value={a}>{a}</MenuItem>
                            ))}
                        </TextField>
                    ) : (
                        <Skeleton variant="rounded" width={110} height={40} />
                    )}

                    <Button
                        variant="outlined"
                        startIcon={<CatalogIcon />}
                        onClick={() => navigate('/orcamento/catalogo')}
                    >
                        Classes e Subclasses
                    </Button>

                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => openModal(null)}
                        disabled={loading}
                    >
                        Novo Registo
                    </Button>
                </Stack>
            </Stack>

            {/* Tabela */}
            <Box sx={{ flexGrow: 1 }}>
                <OrcamentoTable />
            </Box>

        </Box>
    );
};

export default OrcamentoPage;
