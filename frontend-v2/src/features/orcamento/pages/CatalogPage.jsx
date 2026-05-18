import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper,
    Table, TableBody, TableCell,
    TableHead, TableRow, Chip, alpha,
    useTheme, useMediaQuery,
    TextField, InputAdornment,
} from '@mui/material';
import {
    TuneRounded as TuneIcon,
    AccountBalance as OrcamentoIcon,
    ArrowBack as ArrowBackIcon,
    ChevronRight as ChevronRightIcon,
    SearchRounded as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { useSearch } from '@/shared/hooks';
import { useOrcamentoStore } from '../store/orcamentoStore';
import { SncapPopover } from '../components/SncapPopover';

const MODULE_COLOR = '#059669';

/* ── Painel de subclasses ────────────────────────────────────── */
const SubclassesList = ({ subclasses, classeNome, onBack, isMobile }) => {
    const [searchTerm,  setSearchTerm]  = useState('');
    const [sncapAnchor, setSncapAnchor] = useState({ el: null, code: null });
    const results = useSearch(subclasses, searchTerm);

    if (!classeNome) return (
        <Box sx={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'text.disabled', gap: 1, p: 4,
        }}>
            <TuneIcon sx={{ fontSize: 40, opacity: 0.3 }} />
            <Typography variant="body2">Seleciona uma classe para ver as subclasses</Typography>
        </Box>
    );

    return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <SncapPopover
                anchorEl={sncapAnchor.el}
                sncapCode={sncapAnchor.code}
                onClose={() => setSncapAnchor({ el: null, code: null })}
            />
            <Stack direction="row" alignItems="center" px={isMobile ? 1 : 2} py={1.5}
                sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                {isMobile && (
                    <Button size="small" startIcon={<ArrowBackIcon />}
                        onClick={onBack} sx={{ mr: 0.5, color: MODULE_COLOR, minWidth: 0 }}>
                        Voltar
                    </Button>
                )}
                <Typography variant="subtitle2" fontWeight={700} color={MODULE_COLOR} noWrap sx={{ flex: 1 }}>
                    {classeNome}
                </Typography>
                <Chip label={subclasses.length} size="small" sx={{
                    ml: 1, height: 18, fontSize: '0.68rem', flexShrink: 0,
                    bgcolor: alpha(MODULE_COLOR, 0.12), color: MODULE_COLOR, fontWeight: 700,
                }} />
            </Stack>
            <Box sx={{ px: 2, py: 1, flexShrink: 0 }}>
                <TextField
                    size="small" fullWidth
                    placeholder="Pesquisar subclasse, SNC-AP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {results.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', color: 'text.disabled' }}>
                        <Typography variant="body2">Sem resultados.</Typography>
                    </Box>
                ) : (
                    <Table size="small">
                        <TableHead sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'grey.50' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>
                                    Nome
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 90, whiteSpace: 'nowrap' }}>
                                    SNC-AP
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, display: { xs: 'none', md: 'table-cell' } }}>
                                    Descrição
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 48, textAlign: 'center' }}>
                                    Ord
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.map((s, i) => (
                                <TableRow key={s.pk} hover sx={{
                                    bgcolor: i % 2 === 0 ? 'background.paper' : alpha(MODULE_COLOR, 0.02),
                                }}>
                                    <TableCell>
                                        <Typography variant="body2">{s.name}</Typography>
                                    </TableCell>
                                    <TableCell
                                        onClick={s.sncap
                                            ? (e) => { e.stopPropagation(); setSncapAnchor({ el: e.currentTarget, code: s.sncap }); }
                                            : undefined}
                                    >
                                        <Typography variant="caption" fontFamily="monospace"
                                            sx={s.sncap ? {
                                                color: MODULE_COLOR, cursor: 'pointer', fontWeight: 600,
                                                textDecoration: 'underline', textDecorationStyle: 'dotted',
                                                textUnderlineOffset: 3, '&:hover': { textDecorationStyle: 'solid' },
                                            } : { color: 'text.secondary' }}>
                                            {s.sncap ?? '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                                        <Typography variant="caption" color="text.secondary">
                                            {s.memo ?? '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Typography variant="caption" color="text.secondary">
                                            {s.ord ?? '—'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Box>
        </Box>
    );
};

/* ── Página principal ───────────────────────────────────────── */
const CatalogPage = () => {
    const theme    = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const navigate = useNavigate();

    const { classes, subclasses, fetchClasses, fetchSubclasses } = useOrcamentoStore();

    const [classeSelPk,   setClasseSelPk]   = useState(null);
    const [mobilePanel,   setMobilePanel]   = useState('classes');
    const [searchClasses, setSearchClasses] = useState('');

    useEffect(() => {
        fetchClasses();
        fetchSubclasses();
    }, []);

    useEffect(() => {
        if (classes.length > 0 && classeSelPk === null) setClasseSelPk(classes[0].pk);
    }, [classes]);

    const classesFiltradas   = useSearch(classes, searchClasses);
    const subclassesDaClasse = useMemo(() => {
        if (!classeSelPk) return [];
        const classeObj = classes.find(c => c.pk === classeSelPk);
        if (!classeObj) return [];
        return subclasses.filter(s => s.classe === classeObj.name);
    }, [subclasses, classes, classeSelPk]);

    const classeSelNome = classes.find(c => c.pk === classeSelPk)?.name ?? null;

    const handleSelectClasse = (pk) => {
        setClasseSelPk(pk);
        if (isMobile) setMobilePanel('subclasses');
    };

    const classesList = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'grey.50' }}>
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <TextField
                    size="small" fullWidth
                    placeholder="Filtrar classes..."
                    value={searchClasses}
                    onChange={(e) => setSearchClasses(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {classesFiltradas.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ p: 2, textAlign: 'center' }}>
                        Sem classes.
                    </Typography>
                ) : classesFiltradas.map((c) => {
                    const count      = subclasses.filter(s => s.classe === c.name).length;
                    const isSelected = c.pk === classeSelPk;
                    return (
                        <Box key={c.pk}
                            onClick={() => handleSelectClasse(c.pk)}
                            sx={{
                                px: 1.5, py: 1.25, cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                                bgcolor: isSelected && !isMobile ? alpha(MODULE_COLOR, 0.1) : 'transparent',
                                borderLeft: `3px solid ${isSelected && !isMobile ? MODULE_COLOR : 'transparent'}`,
                                '&:hover': { bgcolor: alpha(MODULE_COLOR, 0.05) },
                                transition: 'all .15s',
                            }}
                        >
                            <Typography variant="body2"
                                fontWeight={isSelected && !isMobile ? 700 : 400}
                                color={isSelected && !isMobile ? MODULE_COLOR : 'text.primary'}
                                sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.name}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0, ml: 0.5 }}>
                                <Chip label={count} size="small" sx={{
                                    height: 18, fontSize: '0.65rem',
                                    bgcolor: isSelected && !isMobile ? alpha(MODULE_COLOR, 0.15) : 'grey.200',
                                    color: isSelected && !isMobile ? MODULE_COLOR : 'text.secondary',
                                    fontWeight: 700,
                                }} />
                                {isMobile && <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                            </Stack>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );

    return (
        <ModulePage
            title="Catálogo de Orçamento"
            subtitle={isMobile ? undefined : 'Classes e subclasses orçamentais'}
            icon={OrcamentoIcon}
            color={MODULE_COLOR}
            breadcrumbs={[{ label: 'Orçamento', path: '/orcamento' }, { label: 'Catálogo' }]}
            actions={
                <Button variant="outlined" size="small"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate('/orcamento')}>
                    {!isMobile && 'Voltar'}
                </Button>
            }
        >
            <Paper variant="outlined" sx={{
                display: 'flex',
                borderRadius: 2,
                overflow: 'hidden',
                height: { xs: 'calc(100vh - 180px)', md: 'calc(100vh - 220px)' },
                minHeight: { xs: 400, md: 500 },
            }}>
                {isMobile ? (
                    mobilePanel === 'classes' ? (
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {classesList}
                        </Box>
                    ) : (
                        <SubclassesList
                            subclasses={subclassesDaClasse}
                            classeNome={classeSelNome}
                            onBack={() => setMobilePanel('classes')}
                            isMobile
                        />
                    )
                ) : (
                    <>
                        <Box sx={{
                            width: 260, flexShrink: 0,
                            borderRight: 1, borderColor: 'divider',
                            display: 'flex', flexDirection: 'column',
                        }}>
                            {classesList}
                        </Box>
                        <SubclassesList
                            subclasses={subclassesDaClasse}
                            classeNome={classeSelNome}
                            isMobile={false}
                        />
                    </>
                )}
            </Paper>
        </ModulePage>
    );
};

export default CatalogPage;
