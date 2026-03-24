import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, FormControl, InputLabel, Select, MenuItem,
    Grid, CircularProgress, Tooltip, Chip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import {
    getEquipamentosByInstalacao,
    getAllEquipamentos,
    getEquipamentosMeta,
    createEquipamentoAloc,
    reallocarEquipamento,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";
import EquipamentoDetailDrawer from "./EquipamentoDetailDrawer";

/* ─── Dialog: Alocar equipamento existente a esta instalação ─── */
function AlocarDialog({ open, onClose, onSubmit, meta, instalacaoPk }) {
    const [allEquipamentos, setAllEquipamentos] = useState([]);
    const [loadingEquip, setLoadingEquip] = useState(false);
    const [form, setForm] = useState({ equipamentoPk: "", localizacaoId: "", startDate: new Date().toISOString().split("T")[0], memo: "" });
    const [loading, setLoading] = useState(false);
    const isValid = form.equipamentoPk && form.startDate;

    useEffect(() => {
        if (!open) return;
        setForm({ equipamentoPk: "", localizacaoId: "", startDate: new Date().toISOString().split("T")[0], memo: "" });
        setLoadingEquip(true);
        getAllEquipamentos()
            .then(data => {
                const equips = data?.equipamentos || [];
                setAllEquipamentos(equips.filter(e => e.estado !== "Instalação"));
            })
            .catch(() => notifyError("Erro ao carregar equipamentos"))
            .finally(() => setLoadingEquip(false));
    }, [open]);

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                equipamentoPk: Number(form.equipamentoPk),
                alocData: {
                    tt_equipamento_aloc: meta?.alocInstalacaoPk,
                    tb_instalacao: instalacaoPk,
                    tt_equipamento_localizacao: form.localizacaoId ? Number(form.localizacaoId) : undefined,
                    start_date: form.startDate,
                    memo: form.memo || undefined,
                },
            });
            onClose();
        } catch {
            // error already notified in parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Alocar Equipamento</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small" disabled={loadingEquip}>
                                <InputLabel>Equipamento *</InputLabel>
                                <Select value={form.equipamentoPk}
                                    onChange={e => set("equipamentoPk", e.target.value)}
                                    label="Equipamento *">
                                    {allEquipamentos.map(eq => (
                                        <MenuItem key={eq.pk} value={eq.pk}>
                                            {eq.marca} {eq.modelo}
                                            {eq.serial ? ` · S/N: ${eq.serial}` : ""}
                                            {eq.estado ? ` (${eq.estado})` : " (Sem alocação)"}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Localização</InputLabel>
                                <Select value={form.localizacaoId}
                                    onChange={e => set("localizacaoId", e.target.value)}
                                    label="Localização">
                                    <MenuItem value="">— Sem localização —</MenuItem>
                                    {(meta?.localizacoes || []).map(l => (
                                        <MenuItem key={l.pk} value={l.pk}>{l.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" type="date" label="Data de Entrada *"
                                value={form.startDate} onChange={e => set("startDate", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Observações" multiline rows={2}
                                value={form.memo} onChange={e => set("memo", e.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={loading || !isValid || loadingEquip}
                        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}>
                        Alocar
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

/* ─── Dialog: Realocar equipamento (para armazém ou reparação) ─── */
function ReallocarDialog({ open, onClose, onSubmit, meta, equipamento }) {
    const [form, setForm] = useState({ alocTipoId: "", data: new Date().toISOString().split("T")[0], memo: "" });
    const [loading, setLoading] = useState(false);
    const isValid = form.alocTipoId && form.data;

    // Tipos de alocação excluindo "Instalação"
    const tiposDestino = (meta?.alocTipos || []).filter(t => t.pk !== meta?.alocInstalacaoPk);

    useEffect(() => {
        if (!open) return;
        setForm({ alocTipoId: "", data: new Date().toISOString().split("T")[0], memo: "" });
    }, [open]);

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                tt_equipamento_aloc: Number(form.alocTipoId),
                data: form.data,
                memo: form.memo || undefined,
            });
            onClose();
        } catch {
            // error already notified in parent
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Realocar Equipamento</DialogTitle>
            {equipamento && (
                <Box px={3} pt={0.5} pb={0}>
                    <Typography variant="body2" color="text.secondary">
                        {equipamento.marca} {equipamento.modelo}
                        {equipamento.serial ? ` · S/N: ${equipamento.serial}` : ""}
                    </Typography>
                </Box>
            )}
            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Destino *</InputLabel>
                                <Select value={form.alocTipoId}
                                    onChange={e => set("alocTipoId", e.target.value)}
                                    label="Destino *">
                                    {tiposDestino.map(t => (
                                        <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" type="date" label="Data de Saída *"
                                value={form.data} onChange={e => set("data", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Motivo" multiline rows={2}
                                value={form.memo} onChange={e => set("memo", e.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" variant="contained" color="warning" disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : <SwapHorizIcon />}>
                        Realocar
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

/* ─── Tabela principal ─── */
const EquipamentoInstalacaoTable = ({ selectedEntity }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState(null);
    const [alocarOpen, setAlocarOpen] = useState(false);
    const [reallocarTarget, setReallocarTarget] = useState(null);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        getEquipamentosMeta().then(setMeta).catch(() => notifyError("Erro ao carregar metadados"));
    }, []);

    const load = useCallback(async () => {
        if (!selectedEntity?.pk) return;
        setLoading(true);
        try {
            const data = await getEquipamentosByInstalacao(selectedEntity.pk);
            setRows(data?.equipamentos || []);
        } catch {
            notifyError("Erro ao carregar equipamentos");
        } finally {
            setLoading(false);
        }
    }, [selectedEntity?.pk]);

    useEffect(() => { load(); }, [load]);

    const handleAlocar = async ({ equipamentoPk, alocData }) => {
        try {
            await createEquipamentoAloc(equipamentoPk, alocData);
            notifySuccess("Equipamento alocado");
            load();
        } catch (err) {
            notifyError(err?.response?.data?.message || "Erro ao alocar equipamento");
            throw err;
        }
    };

    const handleReallocar = async (data) => {
        try {
            await reallocarEquipamento(reallocarTarget.pk, data);
            notifySuccess("Equipamento realocado");
            setReallocarTarget(null);
            load();
        } catch (err) {
            notifyError(err?.response?.data?.message || "Erro ao realocar equipamento");
            throw err;
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Equipamentos Instalados</Typography>
                <Button variant="contained" size="small" startIcon={<AddIcon />}
                    onClick={() => setAlocarOpen(true)}>
                    Alocar Equipamento
                </Button>
            </Box>

            {loading ? (
                <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : rows.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Nenhum equipamento alocado nesta instalação.
                </Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Tipo</b></TableCell>
                                <TableCell><b>Marca / Modelo</b></TableCell>
                                <TableCell><b>Nº Série</b></TableCell>
                                <TableCell><b>Localização</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow key={row.pk} hover
                                    onClick={() => { setSelected(row); setDrawerOpen(true); }}
                                    sx={{ cursor: "pointer" }}>
                                    <TableCell>
                                        <Chip label={row["tt_equipamento$tipo"] || "—"} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>{row.marca} {row.modelo}</TableCell>
                                    <TableCell>{row.serial || "—"}</TableCell>
                                    <TableCell>{row.localizacao || "—"}</TableCell>
                                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                                        <Tooltip title="Realocar">
                                            <IconButton size="small" color="warning"
                                                onClick={() => setReallocarTarget(row)}>
                                                <SwapHorizIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <AlocarDialog
                open={alocarOpen}
                onClose={() => setAlocarOpen(false)}
                onSubmit={handleAlocar}
                meta={meta}
                instalacaoPk={selectedEntity?.pk}
            />

            <ReallocarDialog
                open={!!reallocarTarget}
                onClose={() => setReallocarTarget(null)}
                onSubmit={handleReallocar}
                meta={meta}
                equipamento={reallocarTarget}
            />

            <EquipamentoDetailDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                equipamento={selected}
                meta={meta}
                onEdit={() => {}}
                onAlocChange={load}
            />
        </Box>
    );
};

export default EquipamentoInstalacaoTable;
