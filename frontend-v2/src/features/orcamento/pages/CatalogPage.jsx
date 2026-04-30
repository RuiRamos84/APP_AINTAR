import React, { useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Divider,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import {
    ArrowBack as BackIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOrcamentoStore } from '../store/orcamentoStore';

/* ── Dialog Nova Classe ─────────────────────────────────────── */
const NovaClasseDialog = ({ open, onClose, onSave }) => {
    const [designacao, setDesignacao] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) { setDesignacao(''); setError(''); }
    }, [open]);

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
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Nova Classe</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField
                        label="Designação"
                        value={designacao}
                        onChange={(e) => setDesignacao(e.target.value)}
                        fullWidth required autoFocus
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}>
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
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Nova Subclasse</DialogTitle>
            <DialogContent>
                <Stack spacing={2.5} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">{error}</Alert>}
                    <TextField label="Designação" value={designacao}
                        onChange={(e) => setDesignacao(e.target.value)}
                        fullWidth required autoFocus />
                    <TextField select label="Classe" value={classe}
                        onChange={(e) => setClasse(e.target.value)} fullWidth required>
                        {classes.map((c) => (
                            <MenuItem key={c.pk} value={c.pk}>{c.designacao}</MenuItem>
                        ))}
                    </TextField>
                    <TextField select label="Tipo" value={tipo}
                        onChange={(e) => setTipo(e.target.value)} fullWidth required>
                        {tipos.map((t) => (
                            <MenuItem key={t.pk} value={t.pk}>{t.designacao}</MenuItem>
                        ))}
                    </TextField>
                    <TextField label="SNCAP" value={sncap}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) setSncap(val);
                        }}
                        fullWidth required type="number" inputProps={{ min: 0, step: 1 }} />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancelar</Button>
                <Button variant="contained" onClick={handleSave} disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}>
                    Criar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/* ── Página principal ───────────────────────────────────────── */
const CatalogPage = () => {
    const navigate = useNavigate();
    const {
        classes, subclasses, tipos,
        fetchClasses, fetchSubclasses, fetchTipos,
        addClasse, addSubclasse,
    } = useOrcamentoStore();

    const [classeDialogOpen, setClasseDialogOpen] = useState(false);
    const [subclasseDialogOpen, setSubclasseDialogOpen] = useState(false);

    useEffect(() => {
        fetchClasses();
        fetchSubclasses();
        fetchTipos();
    }, []);

    /* subclasses agrupadas por classe */
    const porClasse = useMemo(() => {
        const map = {};
        classes.forEach((c) => { map[c.pk] = { ...c, subs: [] }; });
        subclasses.forEach((s) => {
            const classeObj = classes.find((c) => c.designacao === s.classe);
            if (classeObj && map[classeObj.pk]) map[classeObj.pk].subs.push(s);
        });
        return Object.values(map).sort((a, b) => a.designacao.localeCompare(b.designacao));
    }, [classes, subclasses]);

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>

            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Button startIcon={<BackIcon />} onClick={() => navigate('/orcamento')} color="inherit">
                        Voltar
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="h5" fontWeight="bold">
                        Classes e Subclasses
                    </Typography>
                </Stack>
                <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" size="small" startIcon={<AddIcon />}
                        onClick={() => setClasseDialogOpen(true)}>
                        Nova Classe
                    </Button>
                    <Button variant="contained" size="small" startIcon={<AddIcon />}
                        onClick={() => setSubclasseDialogOpen(true)}>
                        Nova Subclasse
                    </Button>
                </Stack>
            </Stack>

            {/* Tabela agrupada */}
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                                <TableCell><b>Designação</b></TableCell>
                                <TableCell><b>Tipo</b></TableCell>
                                <TableCell><b>SNCAP</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {porClasse.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        Sem classes registadas.
                                    </TableCell>
                                </TableRow>
                            ) : porClasse.map((c) => (
                                <React.Fragment key={c.pk}>
                                    {/* Linha de classe */}
                                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                                        <TableCell colSpan={3} sx={{ py: 1 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Typography
                                                    variant="subtitle2"
                                                    fontWeight="bold"
                                                    color="primary.contrastText"
                                                >
                                                    {c.designacao}
                                                </Typography>
                                                <Chip
                                                    label={`${c.subs.length} subclasse${c.subs.length !== 1 ? 's' : ''}`}
                                                    size="small"
                                                    sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', fontSize: '0.7rem' }}
                                                />
                                            </Stack>
                                        </TableCell>
                                    </TableRow>

                                    {/* Linhas de subclasses */}
                                    {c.subs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} sx={{ pl: 4, py: 1.5, color: 'text.secondary', fontStyle: 'italic' }}>
                                                Sem subclasses.
                                            </TableCell>
                                        </TableRow>
                                    ) : c.subs.map((s) => (
                                        <TableRow key={s.pk} hover>
                                            <TableCell sx={{ pl: 4 }}>{s.designacao}</TableCell>
                                            <TableCell>
                                                {s.tipo && (
                                                    <Chip
                                                        label={s.tipo}
                                                        size="small"
                                                        color={s.tipo === 'Capital' ? 'warning' : 'info'}
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>{s.sncap ?? '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Dialogs */}
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
        </Box>
    );
};

export default CatalogPage;
