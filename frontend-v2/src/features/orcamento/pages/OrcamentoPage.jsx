import React, { useEffect } from 'react';
import { Button, IconButton, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
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

/* ── Navegador de ano inline (usado no toolbar da tabela) ────── */
export const YearNavigator = ({ compact = false }) => {
    const { anos, anoSelecionado, setAno, loading } = useOrcamentoStore();
    const idx    = anos.indexOf(Number(anoSelecionado));
    const canOld = idx < anos.length - 1;
    const canNew = idx > 0;

    if (!anoSelecionado) return null;

    return (
        <Stack direction="row" alignItems="center" spacing={0}>
            <IconButton
                size="small"
                onClick={() => setAno(anos[idx + 1])}
                disabled={!canOld || loading}
                sx={{ color: 'text.secondary' }}
            >
                <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <Typography
                variant={compact ? 'body1' : 'h6'}
                fontWeight={700}
                sx={{ minWidth: compact ? 44 : 52, textAlign: 'center', letterSpacing: 0.5 }}
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
    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
            subtitle={isMobile ? undefined : 'Gestão de dotações por classificação económica'}
            icon={OrcamentoIcon}
            color={MODULE_COLOR}
            breadcrumbs={[{ label: 'Orçamento' }]}
            actions={
                <Stack direction="row" spacing={1} alignItems="center">
                    {/* Em mobile o YearNavigator fica nas actions para não sobrepor o título */}
                    {isMobile && <YearNavigator compact />}
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={!isMobile && <TuneIcon />}
                        onClick={() => navigate('/orcamento/catalogo')}
                        sx={{ minWidth: 0 }}
                    >
                        {isMobile ? <TuneIcon fontSize="small" /> : 'Catálogo'}
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={!isMobile && <AddIcon />}
                        onClick={() => openModal(null)}
                        disabled={loading}
                        sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' }, minWidth: 0 }}
                    >
                        {isMobile ? <AddIcon fontSize="small" /> : 'Nova Dotação'}
                    </Button>
                </Stack>
            }
            /* Em desktop o YearNavigator fica centrado no header */
            center={!isMobile ? <YearNavigator /> : undefined}
        >
            <OrcamentoTable />
            <OrcamentoForm />
        </ModulePage>
    );
};

export default OrcamentoPage;
