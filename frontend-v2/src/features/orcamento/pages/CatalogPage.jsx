import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper,
    Table, TableBody, TableCell,
    TableHead, TableRow, Chip, alpha,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, CircularProgress, Alert,
    IconButton, Checkbox, FormControlLabel, FormGroup,
    useTheme, useMediaQuery,
} from '@mui/material';
import {
    Add as AddIcon,
    TuneRounded as TuneIcon,
    AccountBalance as OrcamentoIcon,
    ArrowBack as ArrowBackIcon,
    ChevronRight as ChevronRightIcon,
    EditOutlined as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useOrcamentoStore } from '../store/orcamentoStore';

const MODULE_COLOR = '#059669';

/* ── Diálogo genérico de Classe (criar / editar) ─────────────── */
const ClasseDialog = ({ open, onClose, onSave, initial = null }) => {
    const isEdit = Boolean(initial);
    const [designacao, setDesignacao] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) { setDesignacao(initial?.designacao ?? ''); setError(''); }
    }, [open, initial]);

    const handleSave = async () => {
        if (!designacao.trim()) { setError('A designação é obrigatória.'); return; }
        setLoading(true);
        try {
            await onSave(designacao.trim());
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.response?.data?.erro || err.message || 'Erro ao guardar.');
        } finally { setLoading(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` } } }}>
            <DialogTitle>{isEdit ? 'Editar Classe' : 'Nova Classe'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Designação" value={designacao}
                        onChange={(e) => setDesignacao(e.target.value)}
                        fullWidth required autoFocus size="small" />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                    sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' } }}>
                    {isEdit ? 'Guardar' : 'Criar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Diálogo genérico de Subclasse (criar / editar) ─────────── */
const SubclasseDialog = ({ open, onClose, onSave, classes, tipos, initial = null }) => {
    const isEdit = Boolean(initial);
    const [designacao, setDesignacao] = useState('');
    const [classe, setClasse] = useState('');
    const [tiposSel, setTiposSel] = useState([]);
    const [sncap, setSncap] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            setDesignacao(initial?.designacao ?? '');
            setClasse(initial ? String(classes.find(c => c.designacao === initial.classe)?.pk ?? '') : '');
            setTiposSel(initial?.tipo_pks ?? []);
            setSncap(initial?.sncap != null ? String(initial.sncap) : '');
            setError('');
        }
    }, [open, initial, classes]);

    const toggleTipo = (pk) => {
        setTiposSel(prev =>
            prev.includes(pk) ? prev.filter(p => p !== pk) : [...prev, pk]
        );
    };

    const handleSave = async () => {
        if (!designacao.trim() || !classe || tiposSel.length === 0 || sncap === '') {
            setError('Preenche todos os campos obrigatórios e seleciona pelo menos um tipo.');
            return;
        }
        setLoading(true);
        try {
            await onSave({
                designacao: designacao.trim(),
                ts_orcamento_classe: parseInt(classe, 10),
                tipos: tiposSel,
                sncap: parseInt(sncap, 10),
            });
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.response?.data?.erro || err.message || 'Erro ao guardar.');
        } finally { setLoading(false); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` } } }}>
            <DialogTitle>{isEdit ? 'Editar Subclasse' : 'Nova Subclasse'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Designação" value={designacao}
                        onChange={(e) => setDesignacao(e.target.value)}
                        fullWidth required autoFocus size="small" />
                    <TextField select label="Classe" value={classe}
                        onChange={(e) => setClasse(e.target.value)} fullWidth required size="small">
                        {classes.map((c) => (
                            <MenuItem key={c.pk} value={String(c.pk)}>{c.designacao}</MenuItem>
                        ))}
                    </TextField>
                    <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                            Tipo *
                        </Typography>
                        <FormGroup row>
                            {tipos.map((t) => (
                                <FormControlLabel
                                    key={t.pk}
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={tiposSel.includes(t.pk)}
                                            onChange={() => toggleTipo(t.pk)}
                                            sx={{ color: MODULE_COLOR, '&.Mui-checked': { color: MODULE_COLOR } }}
                                        />
                                    }
                                    label={t.designacao}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                    <TextField label="SNC-AP" value={sncap}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) setSncap(val);
                        }}
                        fullWidth required size="small" type="number" inputProps={{ min: 0, step: 1 }} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                    sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' } }}>
                    {isEdit ? 'Guardar' : 'Criar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Chips de tipos ──────────────────────────────────────────── */
const TipoChips = ({ tipo }) => {
    if (!tipo) return null;
    return (
        <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {tipo.split(', ').map((t) => (
                <Chip key={t} label={t} size="small"
                    color={t.toLowerCase().includes('capital') ? 'warning' : 'info'} />
            ))}
        </Stack>
    );
};

/* ── Painel de subclasses ────────────────────────────────────── */
const SubclassesList = ({ subclasses, classeNome, onBack, isMobile, onEditSubclasse }) => {
    const [searchTerm, setSearchTerm] = useState('');
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
            <Stack direction="row" alignItems="center" px={isMobile ? 1 : 2} py={1.5}
                sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                {isMobile && (
                    <IconButton size="small" onClick={onBack} sx={{ mr: 0.5, color: MODULE_COLOR }}>
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
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
                <SearchBar value={searchTerm} onChange={setSearchTerm}
                    placeholder="Pesquisar subclasse, SNC-AP..." size="small" fullWidth />
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
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>Designação</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 140 }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 80, display: { xs: 'none', sm: 'table-cell' } }}>SNC-AP</TableCell>
                                <TableCell sx={{ width: 40 }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.map((s, i) => (
                                <TableRow key={s.pk} hover sx={{
                                    bgcolor: i % 2 === 0 ? 'background.paper' : alpha(MODULE_COLOR, 0.02),
                                }}>
                                    <TableCell>
                                        <Typography variant="body2">{s.designacao}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <TipoChips tipo={s.tipo} />
                                    </TableCell>
                                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                            {s.sncap ?? '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ p: 0.5 }}>
                                        <IconButton size="small" onClick={() => onEditSubclasse(s)}
                                            sx={{ color: 'text.disabled', '&:hover': { color: MODULE_COLOR } }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
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

    const {
        classes, subclasses, tipos,
        fetchClasses, fetchSubclasses, fetchTipos,
        addClasse, addSubclasse, updateClasse, updateSubclasse,
    } = useOrcamentoStore();

    const [classeSelPk, setClasseSelPk]   = useState(null);
    const [mobilePanel, setMobilePanel]   = useState('classes');

    const [classeDialog, setClasseDialog]         = useState({ open: false, target: null });
    const [subclasseDialog, setSubclasseDialog]   = useState({ open: false, target: null });
    const [searchClasses, setSearchClasses]       = useState('');

    useEffect(() => {
        fetchClasses();
        fetchSubclasses();
        fetchTipos();
    }, []);

    useEffect(() => {
        if (classes.length > 0 && classeSelPk === null) setClasseSelPk(classes[0].pk);
    }, [classes]);

    const classesFiltradas    = useSearch(classes, searchClasses);
    const subclassesDaClasse  = useMemo(() => {
        if (!classeSelPk) return [];
        const classeObj = classes.find(c => c.pk === classeSelPk);
        if (!classeObj) return [];
        return subclasses.filter(s => s.classe === classeObj.designacao);
    }, [subclasses, classes, classeSelPk]);

    const classeSelNome = classes.find(c => c.pk === classeSelPk)?.designacao ?? null;
    const classeSelObj  = classes.find(c => c.pk === classeSelPk) ?? null;

    const handleSelectClasse = (pk) => {
        setClasseSelPk(pk);
        if (isMobile) setMobilePanel('subclasses');
    };

    const handleSaveClasse = async (designacao) => {
        if (classeDialog.target) {
            await updateClasse(classeDialog.target.pk, { designacao });
        } else {
            await addClasse(designacao);
        }
    };

    const handleSaveSubclasse = async (payload) => {
        if (subclasseDialog.target) {
            await updateSubclasse(subclasseDialog.target.pk, payload);
        } else {
            await addSubclasse(payload);
        }
    };

    const classesList = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'grey.50' }}>
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <SearchBar value={searchClasses} onChange={setSearchClasses}
                    placeholder="Filtrar classes..." size="small" fullWidth />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                {classesFiltradas.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ p: 2, textAlign: 'center' }}>
                        Sem classes.
                    </Typography>
                ) : classesFiltradas.map((c) => {
                    const count      = subclasses.filter(s => s.classe === c.designacao).length;
                    const isSelected = c.pk === classeSelPk;
                    return (
                        <Box key={c.pk}
                            onClick={() => handleSelectClasse(c.pk)}
                            sx={{
                                px: 1.5, py: 1.25,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
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
                                {c.designacao}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0, ml: 0.5 }}>
                                <Chip label={count} size="small" sx={{
                                    height: 18, fontSize: '0.65rem',
                                    bgcolor: isSelected && !isMobile ? alpha(MODULE_COLOR, 0.15) : 'grey.200',
                                    color: isSelected && !isMobile ? MODULE_COLOR : 'text.secondary',
                                    fontWeight: 700,
                                }} />
                                <IconButton size="small"
                                    onClick={(e) => { e.stopPropagation(); setClasseDialog({ open: true, target: c }); }}
                                    sx={{ color: 'text.disabled', '&:hover': { color: MODULE_COLOR }, p: 0.25 }}>
                                    <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
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
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" size="small"
                        startIcon={!isMobile && <AddIcon />}
                        onClick={() => setClasseDialog({ open: true, target: null })}
                        sx={{ minWidth: 0 }}>
                        {isMobile ? <AddIcon fontSize="small" /> : 'Nova Classe'}
                    </Button>
                    <Button variant="contained" size="small"
                        startIcon={!isMobile && <AddIcon />}
                        onClick={() => setSubclasseDialog({ open: true, target: null })}
                        sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' }, minWidth: 0 }}>
                        {isMobile ? <TuneIcon fontSize="small" /> : 'Nova Subclasse'}
                    </Button>
                </Stack>
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
                            onEditSubclasse={(s) => setSubclasseDialog({ open: true, target: s })}
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
                            onEditSubclasse={(s) => setSubclasseDialog({ open: true, target: s })}
                        />
                    </>
                )}
            </Paper>

            <ClasseDialog
                open={classeDialog.open}
                onClose={() => setClasseDialog({ open: false, target: null })}
                onSave={handleSaveClasse}
                initial={classeDialog.target}
            />
            <SubclasseDialog
                open={subclasseDialog.open}
                onClose={() => setSubclasseDialog({ open: false, target: null })}
                onSave={handleSaveSubclasse}
                classes={classes}
                tipos={tipos}
                initial={subclasseDialog.target}
            />
        </ModulePage>
    );
};

export default CatalogPage;
