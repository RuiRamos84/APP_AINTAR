import React, { useState, useEffect, useCallback } from "react";
import {
    Box, Button, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, FormControl, InputLabel, Select,
    Grid, CircularProgress, Chip, Tooltip, Tabs, Tab,
} from "@mui/material";
import EquipamentoAlocTable from "../components/EquipamentoAlocTable";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { useMetaData } from "../../../contexts/MetaDataContext";
import {
    getAllEquipamentos,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
    openEquipamentoFile,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const EMPTY_FORM = {
    tt_equiptipo: "",
    marca: "",
    modelo: "",
    serial: "",
    file_manual: null,
    file_specs: null,
    file_esquemas: null,
};

const FileInput = ({ label, value, onChange }) => (
    <Box>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {label}
        </Typography>
        <Button
            component="label"
            variant="outlined"
            size="small"
            startIcon={<AttachFileIcon />}
            fullWidth
            sx={{ justifyContent: "flex-start", textTransform: "none" }}
        >
            {value ? value.name : "Selecionar PDF ou imagem"}
            <input
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                onChange={(e) => onChange(e.target.files[0] || null)}
            />
        </Button>
        {value && (
            <Chip
                label={value.name}
                size="small"
                onDelete={() => onChange(null)}
                sx={{ mt: 0.5 }}
            />
        )}
    </Box>
);

const EquipamentoModal = ({ open, onClose, editing, metaData, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const isValid = form.tt_equiptipo && form.modelo?.trim() && form.serial?.trim();

    const equipTipos = metaData?.equiptipo || [];

    useEffect(() => {
        if (editing) {
            setForm({
                tt_equiptipo: editing.tt_equiptipo ?? "",
                marca: editing.marca ?? "",
                modelo: editing.modelo ?? "",
                serial: editing.serial ?? "",
                file_manual: null,
                file_specs: null,
                file_esquemas: null,
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [editing, open]);

    const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.tt_equiptipo || !form.modelo || !form.serial) {
            notifyError("Tipo, Modelo e Nº de Série são obrigatórios");
            return;
        }
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("tt_equiptipo", form.tt_equiptipo);
            if (form.marca) fd.append("marca", form.marca);
            if (form.modelo) fd.append("modelo", form.modelo);
            if (form.serial) fd.append("serial", form.serial);
            if (form.file_manual) fd.append("file_manual", form.file_manual);
            if (form.file_specs) fd.append("file_specs", form.file_specs);
            if (form.file_esquemas) fd.append("file_esquemas", form.file_esquemas);

            if (editing?.pk) {
                await updateEquipamento(editing.pk, fd);
                notifySuccess("Equipamento atualizado");
            } else {
                await createEquipamento(fd);
                notifySuccess("Equipamento registado");
            }
            onSaved();
            onClose();
        } catch {
            notifyError("Erro ao guardar equipamento");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {editing ? "Editar Equipamento" : "Novo Equipamento"}
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={12}>
                            <FormControl fullWidth>
                                <InputLabel>Tipo de Equipamento *</InputLabel>
                                <Select
                                    value={form.tt_equiptipo}
                                    onChange={(e) => set("tt_equiptipo", e.target.value)}
                                    label="Tipo de Equipamento *"
                                >
                                    {equipTipos.map((t) => (
                                        <MenuItem key={t.pk} value={t.pk}>
                                            {t.value}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth size="small" label="Marca"
                                value={form.marca} onChange={(e) => set("marca", e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth size="small" label="Modelo *"
                                value={form.modelo} onChange={(e) => set("modelo", e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                fullWidth size="small" label="Nº de Série *"
                                value={form.serial} onChange={(e) => set("serial", e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" mt={1}>
                                Documentos (opcional)
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <FileInput label="Manual" value={form.file_manual} onChange={(f) => set("file_manual", f)} />
                        </Grid>
                        <Grid item xs={12}>
                            <FileInput label="Ficha Técnica" value={form.file_specs} onChange={(f) => set("file_specs", f)} />
                        </Grid>
                        <Grid item xs={12}>
                            <FileInput label="Esquemas" value={form.file_esquemas} onChange={(f) => set("file_esquemas", f)} />
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

const EquipamentoGeralView = () => {
    const { metaData } = useMetaData();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const equipTipos = metaData?.equiptipo || [];

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

    const handleDelete = async () => {
        try {
            await deleteEquipamento(confirmDelete.pk);
            notifySuccess("Equipamento eliminado");
            setConfirmDelete(null);
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
                                <TableCell><b>Docs</b></TableCell>
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.pk} hover>
                                    <TableCell>{row.tipo_nome || "—"}</TableCell>
                                    <TableCell>{row.marca || "—"}</TableCell>
                                    <TableCell>{row.modelo || "—"}</TableCell>
                                    <TableCell>{row.serial || "—"}</TableCell>
                                    <TableCell>
                                        <Box display="flex" gap={0.5} flexWrap="wrap">
                                            {row.file_manual && (
                                                <Chip label="Manual" size="small" variant="outlined"
                                                    onClick={() => openEquipamentoFile(row.file_manual)}
                                                    sx={{ cursor: 'pointer' }} />
                                            )}
                                            {row.file_specs && (
                                                <Chip label="Ficha" size="small" variant="outlined"
                                                    onClick={() => openEquipamentoFile(row.file_specs)}
                                                    sx={{ cursor: 'pointer' }} />
                                            )}
                                            {row.file_esquemas && (
                                                <Chip label="Esquemas" size="small" variant="outlined"
                                                    onClick={() => openEquipamentoFile(row.file_esquemas)}
                                                    sx={{ cursor: 'pointer' }} />
                                            )}
                                            {!row.file_manual && !row.file_specs && !row.file_esquemas && "—"}
                                        </Box>
                                    </TableCell>
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

            <EquipamentoModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editing={editing}
                metaData={metaData}
                onSaved={load}
            />

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
};

const EquipamentoGeralViewWrapper = () => {
    const [tab, setTab] = useState(0);
    return (
        <Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Equipamentos" />
                <Tab label="Alocações" />
            </Tabs>
            {tab === 0 && <EquipamentoGeralView />}
            {tab === 1 && <EquipamentoAlocTable />}
        </Box>
    );
};

export default EquipamentoGeralViewWrapper;
