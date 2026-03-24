import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, FormControl, InputLabel, Select,
    Grid, CircularProgress, Chip, Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EquipamentoDetailDrawer from "../components/EquipamentoDetailDrawer";
import {
    getAllEquipamentos,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
    getEquipamentosMeta,
    createEquipamentoAloc,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const EMPTY_FORM = {
    tt_equipamento_tipo: "", marca: "", modelo: "", serial: "",
};

/* ─── Modal: Criar / Editar equipamento ─── */
const EquipamentoModal = ({ open, onClose, editing, meta, onSaved, onCreated }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const isValid = form.tt_equipamento_tipo && form.modelo?.trim() && form.marca?.trim();

    useEffect(() => {
        if (!open) return;
        if (editing) {
            setForm({
                tt_equipamento_tipo: meta?.tipos?.find(t => t.value === editing["tt_equipamento$tipo"])?.pk ?? "",
                marca: editing.marca ?? "",
                modelo: editing.modelo ?? "",
                serial: editing.serial ?? "",
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editing, open, meta]);

    const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                tt_equipamento_tipo: Number(form.tt_equipamento_tipo),
                marca: form.marca || undefined,
                modelo: form.modelo || undefined,
                serial: form.serial || undefined,
            };
            if (editing?.pk) {
                await updateEquipamento(editing.pk, payload);
                notifySuccess("Equipamento atualizado");
                onSaved();
                onClose();
            } else {
                const res = await createEquipamento(payload);
                onClose();
                onCreated(res?.pk);
            }
        } catch {
            notifyError("Erro ao guardar equipamento");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{editing ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tipo de Equipamento *</InputLabel>
                                <Select value={form.tt_equipamento_tipo}
                                    onChange={e => set("tt_equipamento_tipo", e.target.value)}
                                    label="Tipo de Equipamento *">
                                    {(meta?.tipos || []).map(t => (
                                        <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="Marca *"
                                value={form.marca} onChange={e => set("marca", e.target.value)} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" label="Modelo *"
                                value={form.modelo} onChange={e => set("modelo", e.target.value)} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Nº de Série"
                                value={form.serial} onChange={e => set("serial", e.target.value)} />
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

/* ─── Dialog: Definir estado após criação ─── */
const AlocDialog = ({ open, onClose, equipamentoPk, meta, onSaved }) => {
    const EMPTY = {
        tt_equipamento_aloc: "",
        tb_instalacao: "",
        tt_equipamento_localizacao: "",
        start_date: new Date().toISOString().split("T")[0],
        stop_date: "",
        memo: "",
    };
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const isInstalacao = meta?.alocInstalacaoPk && Number(form.tt_equipamento_aloc) === meta.alocInstalacaoPk;
    const isValid = form.tt_equipamento_aloc && form.start_date;

    useEffect(() => { if (open) setForm(EMPTY); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createEquipamentoAloc(equipamentoPk, {
                tt_equipamento_aloc: Number(form.tt_equipamento_aloc),
                tb_instalacao: isInstalacao && form.tb_instalacao ? Number(form.tb_instalacao) : undefined,
                tt_equipamento_localizacao: isInstalacao && form.tt_equipamento_localizacao ? Number(form.tt_equipamento_localizacao) : undefined,
                start_date: form.start_date,
                stop_date: form.stop_date || undefined,
                memo: form.memo || undefined,
            });
            notifySuccess("Estado definido com sucesso");
            onSaved();
            onClose();
        } catch {
            notifyError("Erro ao definir estado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Definir Estado do Equipamento</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Estado *</InputLabel>
                                <Select value={form.tt_equipamento_aloc}
                                    onChange={e => set("tt_equipamento_aloc", e.target.value)}
                                    label="Estado *">
                                    {(meta?.alocTipos || []).map(t => (
                                        <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {isInstalacao && (<>
                            <Grid item xs={12}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Instalação</InputLabel>
                                    <Select value={form.tb_instalacao}
                                        onChange={e => set("tb_instalacao", e.target.value)}
                                        label="Instalação">
                                        <MenuItem value="">— Selecionar —</MenuItem>
                                        {(meta?.instalacoes || []).map(i => (
                                            <MenuItem key={i.pk} value={i.pk}>{i.nome}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Localização</InputLabel>
                                    <Select value={form.tt_equipamento_localizacao}
                                        onChange={e => set("tt_equipamento_localizacao", e.target.value)}
                                        label="Localização">
                                        <MenuItem value="">— Selecionar —</MenuItem>
                                        {(meta?.localizacoes || []).map(l => (
                                            <MenuItem key={l.pk} value={l.pk}>{l.value}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </>)}
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" type="date" label="Data de Início *"
                                value={form.start_date} onChange={e => set("start_date", e.target.value)}
                                InputLabelProps={{ shrink: true }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth size="small" type="date" label="Data de Fim"
                                value={form.stop_date} onChange={e => set("stop_date", e.target.value)}
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
                    <Button type="submit" variant="contained" disabled={loading || !isValid}
                        startIcon={loading ? <CircularProgress size={16} /> : null}>
                        Guardar
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default function EquipamentoGeralView() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [confirmAlocOpen, setConfirmAlocOpen] = useState(false);
    const [alocOpen, setAlocOpen] = useState(false);
    const [pendingAlocPk, setPendingAlocPk] = useState(null);

    useEffect(() => {
        getEquipamentosMeta().then(setMeta).catch(() => notifyError("Erro ao carregar metadados"));
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllEquipamentos();
            setRows(data?.equipamentos || []);
        } catch {
            notifyError("Erro ao carregar equipamentos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleRowClick = (row) => {
        setSelected(row);
        setDrawerOpen(true);
    };

    const handleEdit = (eq) => {
        setDrawerOpen(false);
        setEditing(eq);
        setModalOpen(true);
    };

    const handleCreated = (pk) => {
        notifySuccess("Equipamento registado");
        load();
        setPendingAlocPk(pk);
        setConfirmAlocOpen(true);
    };

    const handleDelete = async () => {
        try {
            await deleteEquipamento(confirmDelete.pk);
            notifySuccess("Equipamento eliminado");
            setConfirmDelete(null);
            if (selected?.pk === confirmDelete.pk) setDrawerOpen(false);
            load();
        } catch {
            notifyError("Erro ao eliminar");
        }
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Equipamentos</Typography>
                <Button variant="contained" size="small" startIcon={<AddIcon />}
                    onClick={() => { setEditing(null); setModalOpen(true); }}>
                    Adicionar
                </Button>
            </Box>

            {loading ? (
                <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : rows.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Nenhum equipamento registado.
                </Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Tipo</b></TableCell>
                                <TableCell><b>Marca</b></TableCell>
                                <TableCell><b>Modelo</b></TableCell>
                                <TableCell><b>Nº Série</b></TableCell>
                                <TableCell><b>Estado Actual</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map(row => (
                                <TableRow key={row.pk} hover
                                    onClick={() => handleRowClick(row)}
                                    sx={{ cursor: "pointer" }}>
                                    <TableCell>{row["tt_equipamento$tipo"] || "—"}</TableCell>
                                    <TableCell>{row.marca || "—"}</TableCell>
                                    <TableCell>{row.modelo || "—"}</TableCell>
                                    <TableCell>{row.serial || "—"}</TableCell>
                                    <TableCell>
                                        {row.estado
                                            ? <Chip label={row.estado} size="small" color="primary" variant="outlined" />
                                            : <Typography variant="caption" color="text.secondary">Sem alocação</Typography>}
                                        {row.instalacao && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {row.instalacao}{row.localizacao ? ` · ${row.localizacao}` : ""}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell align="right" onClick={e => e.stopPropagation()}>
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => handleEdit(row)}>
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

            <EquipamentoDetailDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                equipamento={selected}
                meta={meta}
                onEdit={handleEdit}
                onAlocChange={load}
            />

            <EquipamentoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editing={editing}
                meta={meta}
                onSaved={load}
                onCreated={handleCreated}
            />

            {/* Confirmar definição de estado */}
            <Dialog open={confirmAlocOpen} onClose={() => setConfirmAlocOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Definir estado do equipamento?</DialogTitle>
                <DialogContent>
                    <Typography>Pretende definir um estado para o equipamento registado?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmAlocOpen(false)}>Não</Button>
                    <Button variant="contained" onClick={() => { setConfirmAlocOpen(false); setAlocOpen(true); }}>
                        Sim
                    </Button>
                </DialogActions>
            </Dialog>

            <AlocDialog
                open={alocOpen}
                onClose={() => setAlocOpen(false)}
                equipamentoPk={pendingAlocPk}
                meta={meta}
                onSaved={load}
            />

            {/* Confirmar eliminação */}
            <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Confirmar eliminação</DialogTitle>
                <DialogContent>
                    <Typography>Tem a certeza que pretende eliminar este equipamento?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                    <Button color="error" variant="contained" onClick={handleDelete}>Eliminar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
