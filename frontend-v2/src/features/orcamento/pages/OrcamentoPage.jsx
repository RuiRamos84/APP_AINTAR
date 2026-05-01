import React, { useEffect } from 'react';
import { Button, IconButton, Stack, Typography } from '@mui/material';
import {
    AccountBalance as OrcamentoIcon,
    Add as AddIcon,
    TuneRounded as TuneIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { OrcamentoTable } from '../components/OrcamentoTable';
import { OrcamentoForm } from '../components/OrcamentoForm';

const MODULE_COLOR = '#059669';

/* ── Navegador de ano: ← 2024 → ─────────────────────────────── */
const YearNavigator = () => {
    const { anos, anoSelecionado, setAno, loading } = useOrcamentoStore();
    const idx    = anos.indexOf(Number(anoSelecionado));
    const canOld = idx < anos.length - 1; // lista desc → maior idx = mais antigo
    const canNew = idx > 0;               // menor idx = mais recente

    if (!anoSelecionado) return null;

    return (
        <Stack direction="row" alignItems="center" spacing={0.25}>
            <IconButton
                size="small"
                onClick={() => setAno(anos[idx + 1])}
                disabled={!canOld || loading}
                sx={{ color: 'text.secondary' }}
            >
                <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography
                variant="h6"
                fontWeight={700}
                sx={{ minWidth: 52, textAlign: 'center', letterSpacing: 0.5 }}
            >
                {anoSelecionado}
            </Typography>
            <IconButton
                size="small"
                onClick={() => setAno(anos[idx - 1])}
                disabled={!canNew || loading}
                sx={{ color: 'text.secondary' }}
            >
                <ChevronRightIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
};

/* ── Página ──────────────────────────────────────────────────── */
const OrcamentoPage = () => {
    const navigate = useNavigate();
    const { fetchAnos, setAno, openModal, loading } = useOrcamentoStore();

    useEffect(() => {
        const init = async () => {
            const list = await fetchAnos();
            if (list.length > 0) setAno(list[0]);
        };
        init();
    }, []);

    return (
        <ModulePage
            title="Orçamento"
            subtitle="Gestão de dotações por classificação económica"
            icon={OrcamentoIcon}
            color={MODULE_COLOR}
            breadcrumbs={[{ label: 'Orçamento' }]}
            center={<YearNavigator />}
            actions={
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<TuneIcon />}
                        onClick={() => navigate('/orcamento/catalogo')}
                    >
                        Catálogo
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => openModal(null)}
                        disabled={loading}
                        sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' } }}
                    >
                        Nova Dotação
                    </Button>
                </Stack>
            }
        >
            <OrcamentoTable />
            <OrcamentoForm />
        </ModulePage>
    );
};

export default OrcamentoPage;
