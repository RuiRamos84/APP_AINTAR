import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, FormControl, InputLabel, Select,
    Grid, CircularProgress, Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
    getAllEquipamentos,
    getEquipamentoAloc,
    createEquipamentoAloc,
    updateEquipamentoAloc,
    deleteEquipamentoAloc,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const EMPTY_FORM = {
    tt_equipamento_aloc: "",
    tb_instalacao: "",
    tt_equipamento_localizacao: "",
    start_date: "",
    stop_date: "",
    memo: "",
    ord: "",
};

const AlocacaoModal = ({ open, onClose, editing, equipPk, meta, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);

    const alocTipos = meta?.alocTipos || [];
    const instalacoes = meta?.instalacoes || [];
    const localizacoes = meta?.localizacoes || [];
    const alocInstalacaoPk = meta?.alocInstalacaoPk;

    const requiresInstalacao = Number(form.tt_equipamento_aloc) === alocInstalacaoPk;
    const isValid = form.tt_equipamento_aloc && form.start_date &&
        (!requiresInstalacao || (form.tb_instalacao && form.tt_equipamento_localizacao));

    useEffect(() => {
        if (editing) {
            setForm({
                tt_equipamento_aloc: alocTipos.find(a => a.value === editing["tt_equipamento$aloc"])?.pk ?? "",
                tb_instalacao: editing.pk_instalacao ?? "",
                tt_equipamento_localizacao: localizacoes.find(l => l.value === editing["tt_equipamento$localizacao"])?.pk ?? "",
                start_date: editing.start_date ? editing.start_date.split("T")[0] : "",
                stop_date: editing.stop_date ? editing.stop_date.split("T")[0] : "",
                memo: editing.memo ?? "",
                ord: editing.ord ?? "",
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editing, open]);

    const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                tt_equipamento_aloc: Number(form.tt_equipamento_aloc),
                tb_instalacao: form.tb_instalacao ? Number(form.tb_instalacao) : undefined,
                tt_equipamento_localizacao: form.tt_equipamento_localizacao ? Number(form.tt_equipamento_localizacao) : undefined,
                start_date: form.start_date,
                stop_date: form.stop_date || undefined,
                memo: form.memo || undefined,
                ord: form.ord ? Number(form.ord) : undefined,
            };
            if (editing?.pk) {
                await updateEquipamentoAloc(equipPk, editing.pk, payload);
                notifySuccess("Alocação atualizada");
            } else {
                await createEquipamentoAloc(equipPk, payload);
                notifySuccess("Alocação registada");
            }
            onSaved();
            onClose();
        } catch {
            notifyError("Erro ao guardar alocação");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>{editing ? "Editar Alocação" : "Nova Alocação"}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tipo de Alocação *</InputLabel>
                                <Select value={form.tt_equipamento_aloc}
                                    onChange={(e) => set("tt_equipamento_aloc", e.target.value)}
                                    label="Tipo de Alocação *">
                                    {alocTipos.map((a) => (
                                        <MenuItem key={a.pk} value={a.pk}>{a.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Instalação {requiresInstalacao ? "*" : ""}</InputLabel>
                                <Select value={form.tb_instalacao}
                                    onChange={(e) => set("tb_instalacao", e.target.value)}
                                    label={`Instalação ${requiresInstalacao ? "*" : ""}`}>
                                    <MenuItem value=""><em>— Nenhuma —</em></MenuItem>
                                    {instalacoes.map((i) => (
                                        <MenuItem key={i.pk} value={i.pk}>{i.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Localização {requiresInstalacao ? "*" : ""}</InputLabel>
                                <Select value={form.tt_equipamento_localizacao}
                                    onChange={(e) => set("tt_equipamento_localizacao", e.target.value)}
                                    label={`Localização ${requiresInstalacao ? "*" : ""}`}>
                                    <MenuItem value=""><em>— Nenhuma —</em></MenuItem>
                                    {localizacoes.map((l) => (
                                        <MenuItem key={l.pk} value={l.pk}>{l.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="Ordem" type="number"
                                value={form.ord} onChange={(e) => set("ord", e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth size="small" label="Data Início *" type="date"
                                value={form.start_date}
                                onChange={(e) => set("start_date", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth size="small" label="Data Fim" type="date"
                                value={form.stop_date}
                                onChange={(e) => set("stop_date", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Notas" multiline rows={2}
                                value={form.memo} onChange={(e) => set("memo", e.target.value)} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={loading}>Cancelar</Button>
                    <Button type="submit" variant="contained" disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}>
                        {editing ? "Guardar" : "Registar"}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

const EquipamentoAlocTable = ({ meta, initialEquipPk }) => {
    const [equipamentos, setEquipamentos] = useState([]);
    const [selectedEquip, setSelectedEquip] = useState(initialEquipPk || "");

    useEffect(() => {
        if (initialEquipPk) setSelectedEquip(initialEquipPk);
    }, [initialEquipPk]);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        getAllEquipamentos()
            .then(d => setEquipamentos(d?.equipamentos || []))
            .catch(() => notifyError("Erro ao carregar equipamentos"));
    }, []);

    const load = useCallback(async () => {
        if (!selectedEquip) { setRows([]); return; }
        setLoading(true);
        try {
            const data = await getEquipamentoAloc(selectedEquip);
            setRows(data?.alocacoes || []);
        } catch {
            notifyError("Erro ao carregar alocações");
        } finally {
            setLoading(false);
        }
    }, [selectedEquip]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async () => {
        try {
            await deleteEquipamentoAloc(selectedEquip, confirmDelete.pk);
            notifySuccess("Alocação eliminada");
            setConfirmDelete(null);
            load();
        } catch {
            notifyError("Erro ao eliminar");
        }
    };

    const formatDate = (d) => d ? d.split("T")[0] : "—";

    const equipLabel = (eq) => eq.marca ? `${eq.marca} — ${eq.modelo} (${eq.serial || "s/série"})` : eq.modelo;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Alocações de Equipamento</Typography>
                <Button variant="contained" size="small" startIcon={<AddIcon />}
                    disabled={!selectedEquip}
                    onClick={() => { setEditing(null); setModalOpen(true); }}>
                    Adicionar
                </Button>
            </Box>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Selecionar Equipamento</InputLabel>
                <Select value={selectedEquip}
                    onChange={(e) => setSelectedEquip(e.target.value)}
                    label="Selecionar Equipamento">
                    <MenuItem value=""><em>— Escolha um equipamento —</em></MenuItem>
                    {equipamentos.map((eq) => (
                        <MenuItem key={eq.pk} value={eq.pk}>{equipLabel(eq)}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {!selectedEquip ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Selecione um equipamento para ver as alocações.
                </Typography>
            ) : loading ? (
                <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : rows.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Nenhuma alocação registada para este equipamento.
                </Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Tipo Alocação</b></TableCell>
                                <TableCell><b>Instalação</b></TableCell>
                                <TableCell><b>Localização</b></TableCell>
                                <TableCell><b>Data Início</b></TableCell>
                                <TableCell><b>Data Fim</b></TableCell>
                                <TableCell><b>Notas</b></TableCell>
                                <TableCell><b>Ord.</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.pk} hover>
                                    <TableCell>{row["tt_equipamento$aloc"] || "—"}</TableCell>
                                    <TableCell>{row.tb_instalacao || "—"}</TableCell>
                                    <TableCell>{row["tt_equipamento$localizacao"] || "—"}</TableCell>
                                    <TableCell>{formatDate(row.start_date)}</TableCell>
                                    <TableCell>{formatDate(row.stop_date)}</TableCell>
                                    <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {row.memo || "—"}
                                    </TableCell>
                                    <TableCell>{row.ord ?? "—"}</TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => { setEditing(row); setModalOpen(true); }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => setConfirmDelete(row)}>
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

            <AlocacaoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editing={editing}
                equipPk={selectedEquip}
                meta={meta}
                onSaved={load}
            />

            <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirmar eliminação</DialogTitle>
                <DialogContent>
                    <Typography>Tem a certeza que pretende eliminar esta alocação?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Eliminar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EquipamentoAlocTable;
