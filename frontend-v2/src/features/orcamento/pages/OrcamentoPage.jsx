import React, { useEffect, useState } from 'react';
import {
    Button, IconButton, Stack, Typography,
    useMediaQuery, useTheme,
    ToggleButtonGroup, ToggleButton, Tooltip,
} from '@mui/material';
import {
    AccountBalance as OrcamentoIcon,
    Add as AddIcon,
    TuneRounded as TuneIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    FormatListBulleted as TodosIcon,
    Payments as CorrenteIcon,
    AccountBalance as CapitalIcon,
    TableChart as ExcelIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { useOrcamentoAnos, useOrcamentoDetalhe } from '../hooks/useOrcamentoQueries';
import { OrcamentoTable } from '../components/OrcamentoTable';
import { OrcamentoForm } from '../components/OrcamentoForm';

const MODULE_COLOR = '#059669';

const ANO_MIN = 2023;
const currentYear = new Date().getFullYear();
const ANOS_NAVEGAVEIS = Array.from(
    { length: currentYear - ANO_MIN + 1 },
    (_, i) => currentYear - i,
);

/* ── Navegador de ano ────────────────────────────────────────── */
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
                sx={{
                    minWidth: compact ? 44 : 52,
                    textAlign: 'center',
                    letterSpacing: 0.5,
                }}
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

/* ── Filtro de tipo compacto (ícones) ────────────────────────── */
const TipoFilter = ({ value, onChange }) => (
    <ToggleButtonGroup
        size="small"
        exclusive
        value={value}
        onChange={(_, v) => v && onChange(v)}
        sx={{ '& .MuiToggleButton-root': { px: 1, py: 0.5, border: 'none' } }}
    >
        <Tooltip title="Todos">
            <ToggleButton value="todos">
                <TodosIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
        </Tooltip>
        <Tooltip title="Corrente">
            <ToggleButton value="Corrente"
                sx={{ '&.Mui-selected': { color: '#0891b2', bgcolor: 'rgba(8,145,178,0.1)' } }}>
                <CorrenteIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
        </Tooltip>
        <Tooltip title="Capital">
            <ToggleButton value="Capital"
                sx={{ '&.Mui-selected': { color: '#d97706', bgcolor: 'rgba(217,119,6,0.1)' } }}>
                <CapitalIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
        </Tooltip>
    </ToggleButtonGroup>
);

/* ── Página ──────────────────────────────────────────────────── */
const OrcamentoPage = () => {
    const navigate  = useNavigate();
    const theme     = useTheme();
    const isMobile  = useMediaQuery(theme.breakpoints.down('sm'));
    const isXs      = useMediaQuery(theme.breakpoints.only('xs'));

    const { anoSelecionado, setAno, openModal } = useOrcamentoStore();
    const { data: anos     = [] } = useOrcamentoAnos();
    const { data: registos = [] } = useOrcamentoDetalhe(anoSelecionado);

    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFilter, setTipoFilter] = useState('todos');

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
            icon={OrcamentoIcon}
            color={MODULE_COLOR}
            compact
            breadcrumbs={[{ label: 'Orçamento' }]}
            search={<SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />}
            actions={
                <Stack direction="row" spacing={0.5} alignItems="center">
                    {!isXs && <TipoFilter value={tipoFilter} onChange={setTipoFilter} />}
                    {isMobile && <YearNavigator compact />}
                    {!isXs && (
                        <Tooltip title="Exportar Excel">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={handleExport}
                                    disabled={registos.length === 0}
                                    sx={{ color: '#217346' }}
                                >
                                    <ExcelIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                    {!isXs && (
                        <Tooltip title="Catálogo">
                            <IconButton
                                size="small"
                                onClick={() => navigate('/orcamento/catalogo')}
                                sx={{ color: 'text.secondary' }}
                            >
                                <TuneIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={!isMobile && <AddIcon />}
                        onClick={() => openModal(null)}
                        disabled={!anoSelecionado}
                        sx={{
                            bgcolor: MODULE_COLOR,
                            '&:hover': { bgcolor: '#047857' },
                            minWidth: 0,
                        }}
                    >
                        {isMobile ? <AddIcon fontSize="small" /> : 'Nova Dotação'}
                    </Button>
                </Stack>
            }
            center={!isMobile ? <YearNavigator /> : undefined}
        >
            <OrcamentoTable
                searchTerm={searchTerm}
                tipoFilter={tipoFilter}
            />
            <OrcamentoForm />
        </ModulePage>
    );
};

export default OrcamentoPage;
