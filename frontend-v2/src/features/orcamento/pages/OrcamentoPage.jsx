import React, { useEffect, useState } from 'react';
import {
    Button, IconButton, Stack, Typography,
    useMediaQuery, useTheme,
    Tooltip,
    Tabs, Tab,
} from '@mui/material';
import {
    AccountBalance as OrcamentoIcon,
    Add as AddIcon,
    TuneRounded as TuneIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon,
    FormatListBulleted as TodosIcon,
    TableChart as ExcelIcon,
    AccountTree as SncapIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { usePermissions } from '@/core/contexts/PermissionContext';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { useOrcamentoAnos, useOrcamentoDetalhe } from '../hooks/useOrcamentoQueries';
import { OrcamentoTable } from '../components/OrcamentoTable';
import { OrcamentoForm } from '../components/OrcamentoForm';
import { SncapPanel } from '../components/SncapPanel';

const MODULE_COLOR = '#059669';

const ANO_MIN = 2023;
const currentYear = new Date().getFullYear();
const ANOS_NAVEGAVEIS = Array.from(
    { length: currentYear - ANO_MIN + 1 },
    (_, i) => currentYear - i,
);

/* ── Navegador de ano ────────────────────────────────────────── */
export const YearNavigator = ({ compact = false }) => {
    const { anoSelecionado, setAno } = useOrcamentoStore();
    const { data: anos = [] }        = useOrcamentoAnos();
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

/* ── Página ──────────────────────────────────────────────────── */
const OrcamentoPage = () => {
    const navigate  = useNavigate();
    const theme     = useTheme();
    const isMobile  = useMediaQuery(theme.breakpoints.down('sm'));
    const isXs      = useMediaQuery(theme.breakpoints.only('xs'));

    const { hasPermission } = usePermissions();
    const canEdit = hasPermission('orcamento.edit');

    const { anoSelecionado, setAno, openModal } = useOrcamentoStore();
    const { data: anos = [] } = useOrcamentoAnos();
    const { data: registos = [] } = useOrcamentoDetalhe(anoSelecionado);

    const [tab,        setTab]        = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (anos.length > 0 && !anoSelecionado) {
            setAno(anos[0]);
        }
    }, [anos]);

    const handleExport = () => {
        const rows = registos.map(r => ({
            'Classe':      r.classe    ?? '',
            'Subclasse':   r.subclasse ?? '',
            'SNC-AP':      r.sncap     ?? '',
            'Descrição':   r.memo      ?? '',
            'Dotação (€)': r.valor     ?? 0,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Orcamento ${anoSelecionado}`);
        XLSX.writeFile(wb, `orcamento_${anoSelecionado}.xlsx`);
    };

    const isSncap = tab === 1;

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
                    {isMobile && <YearNavigator compact />}
                    {!isXs && (
                        <Tooltip title="Exportar Excel">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={handleExport}
                                    disabled={isSncap || registos.length === 0}
                                    sx={{ color: isSncap ? 'text.disabled' : '#217346' }}
                                >
                                    <ExcelIcon fontSize="small" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    )}
                    {canEdit && !isXs && (
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
                    {canEdit && (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={!isMobile && <AddIcon />}
                            onClick={() => openModal(null)}
                            disabled={isSncap || !anoSelecionado}
                            sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' }, minWidth: 0 }}
                        >
                            {isMobile ? <AddIcon fontSize="small" /> : 'Nova Dotação'}
                        </Button>
                    )}
                </Stack>
            }
            center={!isMobile ? <YearNavigator /> : undefined}
        >
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{
                    mb: 2, borderBottom: 1, borderColor: 'divider',
                    '& .MuiTab-root': { minHeight: 40, py: 0.5, textTransform: 'none', fontWeight: 600 },
                    '& .Mui-selected': { color: MODULE_COLOR },
                    '& .MuiTabs-indicator': { bgcolor: MODULE_COLOR },
                }}
            >
                <Tab icon={<TodosIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Dotações" />
                <Tab icon={<SncapIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="SNC-AP" />
            </Tabs>

            {tab === 0 && (
                <OrcamentoTable searchTerm={searchTerm} tipoFilter="todos" canEdit={canEdit} />
            )}
            {tab === 1 && (
                <SncapPanel ano={anoSelecionado} searchTerm={searchTerm} />
            )}

            <OrcamentoForm />
        </ModulePage>
    );
};

export default OrcamentoPage;
