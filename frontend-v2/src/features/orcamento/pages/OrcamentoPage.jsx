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

/* ── Navegador de ano ────────────────────────────────────────── */
export const YearNavigator = ({ compact = false }) => {
    const { data: anos = [] } = useOrcamentoAnos();
    const { anoSelecionado, setAno } = useOrcamentoStore();
    const idx    = anos.indexOf(Number(anoSelecionado));
    const canOld = idx < anos.length - 1;
    const canNew = idx > 0;

    if (!anoSelecionado) return null;

    return (
        <Stack direction="row" alignItems="center" spacing={0}>
            <IconButton
                size="small"
                onClick={() => setAno(anos[idx + 1])}
                disabled={!canOld}
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
                disabled={!canNew}
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
        if (anos.length > 0 && !anoSelecionado) setAno(anos[0]);
    }, [anos, anoSelecionado, setAno]);

    const handleExport = () => {
        const total = registos.reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
        const rows = registos.map(r => ({
            'Classe':       r.classe     ?? '',
            'Subclasse':    r.subclasse  ?? '',
            'Tipo':         r.tipo       ?? '',
            'SNC-AP':       r.sncap      ?? '',
            'Descrição':    r.memo       ?? '',
            'Data Início':  r.data_inicio ?? '',
            'Data Fim':     r.data_fim    ?? '',
            'Dotação (€)':  parseFloat(r.valor) || 0,
            'Peso (%)':     total > 0
                ? +((parseFloat(r.valor) || 0) / total * 100).toFixed(2)
                : 0,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);

        // Larguras das colunas
        ws['!cols'] = [
            { wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
            { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 10 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Orçamento ${anoSelecionado}`);
        XLSX.writeFile(wb, `orcamento_${anoSelecionado}.xlsx`);
    };

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
