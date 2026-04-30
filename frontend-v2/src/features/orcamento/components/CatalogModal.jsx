import React, { useEffect, useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, MenuItem, Stack, Tab, Tabs, Box,
    CircularProgress, Alert,
} from '@mui/material';
import { useOrcamentoStore } from '../store/orcamentoStore';

const TabPanel = ({ children, value, index }) =>
    value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;

export const CatalogModal = () => {
    const {
        catalogModalOpen, closeCatalogModal,
        tipos, classes,
        fetchTipos, fetchClasses,
        addClasse, addSubclasse,
    } = useOrcamentoStore();

    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Campos Classe
    const [classeDesignacao, setClasseDesignacao] = useState('');

    // Campos Subclasse
    const [subDesignacao, setSubDesignacao] = useState('');
    const [subClasse, setSubClasse] = useState('');
    const [subTipo, setSubTipo] = useState('');
    const [subSncap, setSubSncap] = useState('');

    useEffect(() => {
        if (catalogModalOpen) {
            fetchTipos();
            fetchClasses();
            // reset
            setTab(0);
            setError('');
            setSuccess('');
            setClasseDesignacao('');
            setSubDesignacao('');
            setSubClasse('');
            setSubTipo('');
            setSubSncap('');
        }
    }, [catalogModalOpen]);

    const handleSubmit = async () => {
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            if (tab === 0) {
                if (!classeDesignacao.trim()) {
                    setError('A designação é obrigatória.');
                    return;
                }
                await addClasse(classeDesignacao.trim());
                setSuccess('Classe criada com sucesso.');
                setClasseDesignacao('');
            } else {
                if (!subDesignacao.trim() || !subClasse || !subTipo || subSncap === '') {
                    setError('Preenche todos os campos obrigatórios.');
                    return;
                }
                await addSubclasse({
                    designacao: subDesignacao.trim(),
                    ts_orcamento_classe: parseInt(subClasse, 10),
                    ts_orcamento_tipo: parseInt(subTipo, 10),
                    sncap: subSncap !== '' ? parseInt(subSncap, 10) : null,
                });
                setSuccess('Subclasse criada com sucesso.');
                setSubDesignacao('');
                setSubSncap('');
            }
        } catch (err) {
            setError(err?.response?.data?.error || err.message || 'Erro ao guardar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={catalogModalOpen} onClose={closeCatalogModal} maxWidth="sm" fullWidth>
            <DialogTitle>Gerir Catálogo</DialogTitle>

            <DialogContent>
                <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(''); setSuccess(''); }}>
                    <Tab label="Nova Classe" />
                    <Tab label="Nova Subclasse" />
                </Tabs>

                {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mt: 1.5 }}>{success}</Alert>}

                {/* ── CLASSE ── */}
                <TabPanel value={tab} index={0}>
                    <Stack spacing={2.5}>
                        <TextField
                            label="Designação da Classe"
                            value={classeDesignacao}
                            onChange={(e) => setClasseDesignacao(e.target.value)}
                            fullWidth
                            required
                            placeholder="Ex: Ambiente"
                        />
                    </Stack>
                </TabPanel>

                {/* ── SUBCLASSE ── */}
                <TabPanel value={tab} index={1}>
                    <Stack spacing={2.5}>
                        <TextField
                            label="Designação da Subclasse"
                            value={subDesignacao}
                            onChange={(e) => setSubDesignacao(e.target.value)}
                            fullWidth
                            required
                            placeholder="Ex: Material de Limpeza"
                        />

                        <TextField
                            select
                            label="Classe"
                            value={subClasse}
                            onChange={(e) => setSubClasse(e.target.value)}
                            fullWidth
                            required
                        >
                            {classes.map((c) => (
                                <MenuItem key={c.pk} value={c.pk}>{c.designacao}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            select
                            label="Tipo"
                            value={subTipo}
                            onChange={(e) => setSubTipo(e.target.value)}
                            fullWidth
                            required
                        >
                            {tipos.map((t) => (
                                <MenuItem key={t.pk} value={t.pk}>{t.designacao}</MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="SNCAP"
                            value={subSncap}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) setSubSncap(val);
                            }}
                            fullWidth
                            required
                            type="number"
                            inputProps={{ min: 0, step: 1 }}
                            placeholder="Código SNCAP"
                        />
                    </Stack>
                </TabPanel>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={closeCatalogModal} color="inherit" disabled={loading}>
                    Fechar
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    Criar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
