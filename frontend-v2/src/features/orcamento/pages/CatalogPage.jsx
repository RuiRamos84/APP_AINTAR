import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper,
    Table, TableBody, TableCell,
    TableHead, TableRow, Chip, alpha,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import {
    Add as AddIcon,
    TuneRounded as TuneIcon,
    AccountBalance as OrcamentoIcon,
} from '@mui/icons-material';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useOrcamentoStore } from '../store/orcamentoStore';

const MODULE_COLOR = '#059669';

/* ── Dialog Nova Classe ─────────────────────────────────────── */
const NovaClasseDialog = ({ open, onClose, onSave }) => {
    const [designacao, setDesignacao] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { if (open) { setDesignacao(''); setError(''); } }, [open]);

    const handleSave = async () => {
        if (!designacao.trim()) { setError('A designação é obrigatória.'); return; }
        setLoading(true);
        try {
            await onSave(designacao.trim());
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.response?.data?.erro || err.message || 'Erro ao guardar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` } } }}>
            <DialogTitle>Nova Classe</DialogTitle>
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
                    Criar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Dialog Nova Subclasse ──────────────────────────────────── */
const NovaSubclasseDialog = ({ open, onClose, onSave, classes, tipos }) => {
    const [designacao, setDesignacao] = useState('');
    const [classe, setClasse] = useState('');
    const [tipo, setTipo] = useState('');
    const [sncap, setSncap] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) { setDesignacao(''); setClasse(''); setTipo(''); setSncap(''); setError(''); }
    }, [open]);

    const handleSave = async () => {
        if (!designacao.trim() || !classe || !tipo || sncap === '') {
            setError('Preenche todos os campos obrigatórios.');
            return;
        }
        setLoading(true);
        try {
            await onSave({
                designacao: designacao.trim(),
                ts_orcamento_classe: parseInt(classe, 10),
                ts_orcamento_tipo: parseInt(tipo, 10),
                sncap: parseInt(sncap, 10),
            });
            onClose();
        } catch (err) {
            setError(err?.response?.data?.error || err?.response?.data?.erro || err.message || 'Erro ao guardar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            slotProps={{ paper: { sx: { borderRadius: 3, borderTop: `4px solid ${MODULE_COLOR}` } } }}>
            <DialogTitle>Nova Subclasse</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Designação" value={designacao}
                        onChange={(e) => setDesignacao(e.target.value)}
                        fullWidth required autoFocus size="small" />
                    <TextField select label="Classe" value={classe}
                        onChange={(e) => setClasse(e.target.value)} fullWidth required size="small">
                        {classes.map((c) => (
                            <MenuItem key={c.pk} value={c.pk}>{c.designacao}</MenuItem>
                        ))}
                    </TextField>
                    <TextField select label="Tipo" value={tipo}
                        onChange={(e) => setTipo(e.target.value)} fullWidth required size="small">
                        {tipos.map((t) => (
                            <MenuItem key={t.pk} value={t.pk}>{t.designacao}</MenuItem>
                        ))}
                    </TextField>
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
                    Criar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Painel de subclasses (coluna direita) ───────────────────── */
const SubclassesList = ({ subclasses, classeNome }) => {
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
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Stack direction="row" alignItems="center" px={2} py={1.5}
                sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="subtitle2" fontWeight={700} color={MODULE_COLOR}>
                    {classeNome}
                </Typography>
                <Chip label={subclasses.length} size="small" sx={{
                    ml: 1, height: 18, fontSize: '0.68rem',
                    bgcolor: alpha(MODULE_COLOR, 0.12), color: MODULE_COLOR, fontWeight: 700,
                }} />
            </Stack>
            <Box sx={{ px: 2, py: 1, flexShrink: 0 }}>
                <SearchBar
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder="Pesquisar subclasse, SNC-AP..."
                    size="small"
                    fullWidth
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
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5 }}>Designação</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 100 }}>Tipo</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', letterSpacing: 0.5, width: 90 }}>SNC-AP</TableCell>
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
                                        {s.tipo && (
                                            <Chip label={s.tipo} size="small"
                                                color={s.tipo === 'Capital' ? 'warning' : 'info'} />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                                            {s.sncap ?? '—'}
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
    const {
        classes, subclasses, tipos,
        fetchClasses, fetchSubclasses, fetchTipos,
        addClasse, addSubclasse,
    } = useOrcamentoStore();

    const [classeSelPk, setClasseSelPk]               = useState(null);
    const [classeDialogOpen, setClasseDialogOpen]     = useState(false);
    const [subclasseDialogOpen, setSubclasseDialogOpen] = useState(false);
    const [searchClasses, setSearchClasses]           = useState('');

    useEffect(() => {
        fetchClasses();
        fetchSubclasses();
        fetchTipos();
    }, []);

    /* Auto-seleciona a primeira classe */
    useEffect(() => {
        if (classes.length > 0 && classeSelPk === null) {
            setClasseSelPk(classes[0].pk);
        }
    }, [classes]);

    const classesFiltradas = useSearch(classes, searchClasses);

    /* Subclasses da classe seleccionada — join por pk */
    const subclassesDaClasse = useMemo(() => {
        if (!classeSelPk) return [];
        const classeObj = classes.find(c => c.pk === classeSelPk);
        if (!classeObj) return [];
        return subclasses.filter(s => s.classe === classeObj.designacao);
    }, [subclasses, classes, classeSelPk]);

    const classeSelNome = classes.find(c => c.pk === classeSelPk)?.designacao ?? null;

    return (
        <ModulePage
            title="Catálogo de Orçamento"
            subtitle="Classes e subclasses orçamentais"
            icon={OrcamentoIcon}
            color={MODULE_COLOR}
            breadcrumbs={[{ label: 'Orçamento', path: '/orcamento' }, { label: 'Catálogo' }]}
            actions={
                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />}
                        onClick={() => setClasseDialogOpen(true)}>
                        Nova Classe
                    </Button>
                    <Button variant="contained" size="small" startIcon={<AddIcon />}
                        onClick={() => setSubclasseDialogOpen(true)}
                        sx={{ bgcolor: MODULE_COLOR, '&:hover': { bgcolor: '#047857' } }}>
                        Nova Subclasse
                    </Button>
                </Stack>
            }
        >
            {/* Layout duas colunas */}
            <Paper variant="outlined" sx={{
                display: 'flex',
                borderRadius: 2,
                overflow: 'hidden',
                minHeight: 500,
                height: 'calc(100vh - 220px)',
            }}>
                {/* Coluna esquerda — classes */}
                <Box sx={{
                    width: 260,
                    flexShrink: 0,
                    borderRight: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'grey.50',
                }}>
                    <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                        <SearchBar
                            value={searchClasses}
                            onChange={setSearchClasses}
                            placeholder="Filtrar classes..."
                            size="small"
                            fullWidth
                        />
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {classesFiltradas.length === 0 ? (
                            <Typography variant="body2" color="text.disabled"
                                sx={{ p: 2, textAlign: 'center' }}>
                                Sem classes.
                            </Typography>
                        ) : classesFiltradas.map((c) => {
                            const count = subclasses.filter(s => s.classe === c.designacao).length;
                            const isSelected = c.pk === classeSelPk;
                            return (
                                <Box
                                    key={c.pk}
                                    onClick={() => setClasseSelPk(c.pk)}
                                    sx={{
                                        px: 2, py: 1.25,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        bgcolor: isSelected ? alpha(MODULE_COLOR, 0.1) : 'transparent',
                                        borderLeft: `3px solid ${isSelected ? MODULE_COLOR : 'transparent'}`,
                                        '&:hover': {
                                            bgcolor: isSelected
                                                ? alpha(MODULE_COLOR, 0.1)
                                                : alpha(MODULE_COLOR, 0.05),
                                        },
                                        transition: 'all .15s',
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        fontWeight={isSelected ? 700 : 400}
                                        color={isSelected ? MODULE_COLOR : 'text.primary'}
                                        sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {c.designacao}
                                    </Typography>
                                    <Chip label={count} size="small" sx={{
                                        ml: 1, height: 18, fontSize: '0.65rem', flexShrink: 0,
                                        bgcolor: isSelected ? alpha(MODULE_COLOR, 0.15) : 'grey.200',
                                        color: isSelected ? MODULE_COLOR : 'text.secondary',
                                        fontWeight: 700,
                                    }} />
                                </Box>
                            );
                        })}
                    </Box>
                </Box>

                {/* Coluna direita — subclasses */}
                <SubclassesList subclasses={subclassesDaClasse} classeNome={classeSelNome} />
            </Paper>

            <NovaClasseDialog
                open={classeDialogOpen}
                onClose={() => setClasseDialogOpen(false)}
                onSave={addClasse}
            />
            <NovaSubclasseDialog
                open={subclasseDialogOpen}
                onClose={() => setSubclasseDialogOpen(false)}
                onSave={addSubclasse}
                classes={classes}
                tipos={tipos}
            />
        </ModulePage>
    );
};

export default CatalogPage;
