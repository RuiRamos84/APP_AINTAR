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
import { useMetaData } from "../../../contexts/MetaDataContext";
import {
    getEquipamentoAloc,
    createEquipamentoAloc,
    updateEquipamentoAloc,
    deleteEquipamentoAloc,
    getAllEquipamentos,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const EMPTY_FORM = {
    tb_equipamento: "",
    "tt_equipamento$aloc": "",
    tb_instalacao: "",
    "tt_equipamento$localizacao": "",
    start_date: "",
    stop_date: "",
    memo: "",
    ord: "",
};

const AlocacaoModal = ({ open, onClose, editing, equipamentos, metaData, onSaved }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);

    const instalacoes = metaData?.instalacao || [];
    const equipAloc = metaData?.equipaloc || [];
    const equipLoc = metaData?.equiplocalizacao || [];

    const isValid = form.tb_equipamento && form["tt_equipamento$aloc"] && form.tb_instalacao && form.start_date;

    useEffect(() => {
        if (editing) {
            setForm({
                tb_equipamento: editing.tb_equipamento ?? "",
                "tt_equipamento$aloc": equipAloc.find(a => a.value === editing.aloc_nome)?.pk ?? "",
                tb_instalacao: editing.pk_instalacao ?? "",
                "tt_equipamento$localizacao": equipLoc.find(l => l.value === editing.localizacao_nome)?.pk ?? "",
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
                tb_equipamento: form.tb_equipamento || null,
                "tt_equipamento$aloc": form["tt_equipamento$aloc"] || null,
                tb_instalacao: form.tb_instalacao || null,
                "tt_equipamento$localizacao": form["tt_equipamento$localizacao"] || null,
                start_date: form.start_date || null,
                stop_date: form.stop_date || null,
                memo: form.memo || null,
                ord: form.ord ? Number(form.ord) : null,
            };
            if (editing?.pk) {
                await updateEquipamentoAloc(editing.pk, payload);
                notifySuccess("Alocação atualizada");
            } else {
                await createEquipamentoAloc(payload);
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
                                <InputLabel>Equipamento *</InputLabel>
                                <Select value={form.tb_equipamento}
                                    onChange={(e) => set("tb_equipamento", e.target.value)}
                                    label="Equipamento *">
                                    {equipamentos.map((eq) => (
                                        <MenuItem key={eq.pk} value={eq.pk}>
                                            {eq.marca ? `${eq.marca} — ${eq.modelo}` : eq.modelo}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Tipo de Alocação *</InputLabel>
                                <Select value={form["tt_equipamento$aloc"]}
                                    onChange={(e) => set("tt_equipamento$aloc", e.target.value)}
                                    label="Tipo de Alocação *">
                                    {equipAloc.map((a) => (
                                        <MenuItem key={a.pk} value={a.pk}>{a.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Instalação *</InputLabel>
                                <Select value={form.tb_instalacao}
                                    onChange={(e) => set("tb_instalacao", e.target.value)}
                                    label="Instalação *">
                                    {instalacoes.map((i) => (
                                        <MenuItem key={i.pk} value={i.pk}>{i.nome}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Localização</InputLabel>
                                <Select value={form["tt_equipamento$localizacao"]}
                                    onChange={(e) => set("tt_equipamento$localizacao", e.target.value)}
                                    label="Localização">
                                    <MenuItem value=""><em>— Nenhuma —</em></MenuItem>
                                    {equipLoc.map((l) => (
                                        <MenuItem key={l.pk} value={l.pk}>{l.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
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
                        <Grid item xs={12} sm={4}>
                            <TextField fullWidth size="small" label="Ordem" type="number"
                                value={form.ord}
                                onChange={(e) => set("ord", e.target.value)} />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth size="small" label="Notas" multiline rows={2}
                                value={form.memo}
                                onChange={(e) => set("memo", e.target.value)} />
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

const EquipamentoAlocTable = () => {
    const { metaData } = useMetaData();
    const [rows, setRows] = useState([]);
    const [equipamentos, setEquipamentos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [alocData, equipData] = await Promise.all([
                getEquipamentoAloc(),
                getAllEquipamentos(),
            ]);
            setRows(alocData?.alocacoes || []);
            setEquipamentos(equipData?.equipamentos || []);
        } catch {
            notifyError("Erro ao carregar alocações");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async () => {
        try {
            await deleteEquipamentoAloc(confirmDelete.pk);
            notifySuccess("Alocação eliminada");
            setConfirmDelete(null);
            load();
        } catch {
            notifyError("Erro ao eliminar");
        }
    };

    const formatDate = (d) => d ? d.split("T")[0] : "—";

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Alocações de Equipamento</Typography>
                <Button variant="contained" size="small" startIcon={<AddIcon />}
                    onClick={() => { setEditing(null); setModalOpen(true); }}>
                    Adicionar
                </Button>
            </Box>

            {loading ? (
                <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : rows.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Nenhuma alocação registada.
                </Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell><b>Equipamento</b></TableCell>
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
                                    <TableCell>
                                        <Typography variant="body2">{row.equipamento_tipo || "—"}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {[row.equipamento_marca, row.equipamento_nome, row.equipamento_serial].filter(Boolean).join(" · ")}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{row.aloc_nome || "—"}</TableCell>
                                    <TableCell>{row.instalacao_nome || "—"}</TableCell>
                                    <TableCell>{row.localizacao_nome || "—"}</TableCell>
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
                equipamentos={equipamentos}
                metaData={metaData}
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
