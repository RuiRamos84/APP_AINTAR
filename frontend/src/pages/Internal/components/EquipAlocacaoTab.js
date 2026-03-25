import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, Tooltip, Chip, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, MenuItem, Grid, CircularProgress, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    getEquipamentoAloc, createEquipamentoAloc,
    updateEquipamentoAloc, deleteEquipamentoAloc,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const ALOC_COLORS = { "Instalação": "success", "Armazém": "default", "Reparação": "warning" };

const EMPTY_FORM = {
    tt_equipamento_aloc: "", tb_instalacao: "", tt_equipamento_localizacao: "",
    start_date: new Date().toISOString().split("T")[0], stop_date: "", memo: "", ord: "",
};

function AlocForm({ open, onClose, onSubmit, aloc, meta }) {
    const { alocTipos = [], instalacoes = [], localizacoes = [], alocInstalacaoPk } = meta || {};
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (aloc) {
            setForm({
                tt_equipamento_aloc: alocTipos.find(t => t.value === aloc["tt_equipamento$aloc"])?.pk ?? "",
                tb_instalacao: aloc.pk_instalacao ?? "",
                tt_equipamento_localizacao: localizacoes.find(l => l.value === aloc["tt_equipamento$localizacao"])?.pk ?? "",
                start_date: aloc.start_date?.split("T")[0] ?? "",
                stop_date: aloc.stop_date?.split("T")[0] ?? "",
                memo: aloc.memo ?? "",
                ord: aloc.ord ?? "",
            });
        } else {
            setForm({ ...EMPTY_FORM, start_date: new Date().toISOString().split("T")[0] });
        }
    }, [open, aloc]);

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));
    const isInstalacao = Number(form.tt_equipamento_aloc) === alocInstalacaoPk;
    const isValid = form.tt_equipamento_aloc && form.start_date &&
        (!isInstalacao || (form.tb_instalacao && form.tt_equipamento_localizacao));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit({
                tt_equipamento_aloc: Number(form.tt_equipamento_aloc),
                tb_instalacao: form.tb_instalacao ? Number(form.tb_instalacao) : undefined,
                tt_equipamento_localizacao: form.tt_equipamento_localizacao ? Number(form.tt_equipamento_localizacao) : undefined,
                start_date: form.start_date,
                stop_date: form.stop_date || undefined,
                memo: form.memo || undefined,
                ord: form.ord ? Number(form.ord) : undefined,
            });
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{aloc ? "Editar Alocação" : "Nova Alocação"}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={12}>
                            <TextField select fullWidth size="small" label="Tipo de Alocação *"
                                value={form.tt_equipamento_aloc} onChange={e => set("tt_equipamento_aloc", e.target.value)}>
                                {alocTipos.map(t => <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>)}
                            </TextField>
                        </Grid>
                        {isInstalacao && (<>
                            <Grid size={12}>
                                <TextField select fullWidth size="small" label="Instalação *"
                                    value={form.tb_instalacao} onChange={e => set("tb_instalacao", e.target.value)}>
                                    {instalacoes.map(i => <MenuItem key={i.pk} value={i.pk}>{i.nome}</MenuItem>)}
                                </TextField>
                            </Grid>
                            <Grid size={12}>
                                <TextField select fullWidth size="small" label="Localização *"
                                    value={form.tt_equipamento_localizacao} onChange={e => set("tt_equipamento_localizacao", e.target.value)}>
                                    {localizacoes.map(l => <MenuItem key={l.pk} value={l.pk}>{l.value}</MenuItem>)}
                                </TextField>
                            </Grid>
                        </>)}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" type="date" label="Data Início *"
                                value={form.start_date} onChange={e => set("start_date", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" type="date" label="Data Fim"
                                value={form.stop_date} onChange={e => set("stop_date", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid size={12}>
                            <TextField fullWidth size="small" label="Observações" multiline rows={2}
                                value={form.memo} onChange={e => set("memo", e.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : null}>
                        {aloc ? "Guardar" : "Adicionar"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

export default function EquipAlocacaoTab({ equipamento, meta, onAlocChange }) {
    const [alocacoes, setAlocacoes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const load = useCallback(async () => {
        if (!equipamento?.pk) return;
        setLoading(true);
        try {
            const data = await getEquipamentoAloc(equipamento.pk);
            setAlocacoes((data?.alocacoes || []).sort((a, b) => b.pk - a.pk));
        } catch { notifyError("Erro ao carregar alocações"); }
        finally { setLoading(false); }
    }, [equipamento?.pk]);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (data) => {
        try {
            if (editing) {
                await updateEquipamentoAloc(equipamento.pk, editing.pk, data);
                notifySuccess("Alocação atualizada");
            } else {
                await createEquipamentoAloc(equipamento.pk, data);
                notifySuccess("Alocação registada");
            }
            setEditing(null);
            load();
            onAlocChange?.();
        } catch (err) {
            notifyError(err?.response?.data?.message || "Erro ao guardar alocação");
            throw err;
        }
    };

    const handleDelete = async (pk) => {
        if (!window.confirm("Eliminar esta alocação?")) return;
        try {
            await deleteEquipamentoAloc(equipamento.pk, pk);
            notifySuccess("Alocação eliminada");
            load();
            onAlocChange?.();
        } catch { notifyError("Erro ao eliminar alocação"); }
    };

    return (
        <Box>
            <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button size="small" variant="outlined" startIcon={<AddIcon />}
                    onClick={() => { setEditing(null); setFormOpen(true); }}>
                    Nova Alocação
                </Button>
            </Box>

            {loading ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>A carregar...</Typography>
            ) : alocacoes.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>Sem alocações registadas</Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Estado</b></TableCell>
                                <TableCell><b>Instalação</b></TableCell>
                                <TableCell><b>Localização</b></TableCell>
                                <TableCell><b>Início</b></TableCell>
                                <TableCell><b>Fim</b></TableCell>
                                <TableCell><b>Obs.</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {alocacoes.map(a => (
                                <TableRow key={a.pk}>
                                    <TableCell>
                                        <Chip label={a["tt_equipamento$aloc"] || "—"} size="small"
                                            color={ALOC_COLORS[a["tt_equipamento$aloc"]] || "default"} />
                                    </TableCell>
                                    <TableCell>{a.tb_instalacao || "—"}</TableCell>
                                    <TableCell>{a["tt_equipamento$localizacao"] || "—"}</TableCell>
                                    <TableCell>{a.start_date?.split("T")[0] || "—"}</TableCell>
                                    <TableCell>{a.stop_date?.split("T")[0] || "—"}</TableCell>
                                    <TableCell sx={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {a.memo || "—"}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => { setEditing(a); setFormOpen(true); }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(a.pk)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <AlocForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }}
                onSubmit={handleSubmit} aloc={editing} meta={meta} />
        </Box>
    );
}
