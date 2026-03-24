import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Box, Button, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TableSortLabel, Paper, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, FormControl, InputLabel, Select,
    Grid, CircularProgress, Chip, Tooltip, Divider,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterAltOffIcon from "@mui/icons-material/FilterAltOff";
import EquipamentoDetailDrawer from "../components/EquipamentoDetailDrawer";
import {
    getAllEquipamentos,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
    getEquipamentosMeta,
} from "../../../services/InternalService";
import { notifySuccess, notifyError } from "../../../components/common/Toaster/ThemedToaster";

const EMPTY_FORM = { tt_equipamento_tipo: "", marca: "", modelo: "", serial: "" };

const EquipamentoModal = ({ open, onClose, editing, meta, onSaved }) => {
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
            } else {
                await createEquipamento(payload);
                notifySuccess("Equipamento registado");
            }
            onSaved();
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
                        <Grid size={12}>
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
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Marca *"
                                value={form.marca} onChange={e => set("marca", e.target.value)} />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField fullWidth size="small" label="Modelo *"
                                value={form.modelo} onChange={e => set("modelo", e.target.value)} />
                        </Grid>
                        <Grid size={12}>
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

export default function EquipamentoGeralView() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [selected, setSelected] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filterEstado, setFilterEstado] = useState("");
    const [filterTipo, setFilterTipo] = useState("");
    const [sortCol, setSortCol] = useState("marca");
    const [sortDir, setSortDir] = useState("asc");

    const SEM_ALOC = "Sem alocação";

    const matchEstado = (r, f) => f === SEM_ALOC ? !r.estado : r.estado === f;

    // Cross-filter: cada dimensão conta só a partir das linhas filtradas pela outra dimensão
    const rowsByEstado = useMemo(() =>
        filterEstado ? rows.filter(r => matchEstado(r, filterEstado)) : rows,
    [rows, filterEstado]);

    const rowsByTipo = useMemo(() =>
        filterTipo ? rows.filter(r => r["tt_equipamento$tipo"] === filterTipo) : rows,
    [rows, filterTipo]);

    const estadoCounts = useMemo(() => {
        const counts = {};
        rowsByTipo.forEach(r => {
            const key = r.estado || SEM_ALOC;
            counts[key] = (counts[key] ?? 0) + 1;
        });
        return counts;
    }, [rowsByTipo]);

    const tipoCounts = useMemo(() => {
        const counts = {};
        rowsByEstado.forEach(r => {
            const t = r["tt_equipamento$tipo"];
            if (t) counts[t] = (counts[t] ?? 0) + 1;
        });
        return counts;
    }, [rowsByEstado]);

    const filtered = useMemo(() => {
        let result = rows;
        if (filterEstado) result = result.filter(r => matchEstado(r, filterEstado));
        if (filterTipo) result = result.filter(r => r["tt_equipamento$tipo"] === filterTipo);
        return result;
    }, [rows, filterEstado, filterTipo]);

    const estados = useMemo(() => Object.keys(estadoCounts).sort(), [estadoCounts]);
    const tipos = useMemo(() => Object.keys(tipoCounts).sort(), [tipoCounts]);
    const hasFilter = !!filterEstado || !!filterTipo;

    const SORT_KEY = {
        tipo:   r => r["tt_equipamento$tipo"] ?? "",
        marca:  r => r.marca ?? "",
        modelo: r => r.modelo ?? "",
        serial: r => r.serial ?? "",
        estado: r => r.estado ?? "",
    };

    const sorted = useMemo(() => {
        const key = SORT_KEY[sortCol] ?? (r => "");
        return [...filtered].sort((a, b) => {
            const cmp = key(a).localeCompare(key(b), "pt", { sensitivity: "base" });
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [filtered, sortCol, sortDir]);

    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortCol(col); setSortDir("asc"); }
    };

    const ESTADO_CONFIG = { Instalação: "success", Reparação: "warning" };
    const ESTADO_CUSTOM = {
        Armazém:        { outlined: { color: "#7b1fa2", borderColor: "#7b1fa2" }, filled: { bgcolor: "#7b1fa2", color: "#fff", borderColor: "#7b1fa2" } },
        Trabalhador:    { outlined: { color: "#b8860b", borderColor: "#b8860b" }, filled: { bgcolor: "#f5c518", color: "#000", borderColor: "#f5c518" } },
        [SEM_ALOC]:     { outlined: { color: "text.secondary", borderColor: "text.disabled" }, filled: { bgcolor: "text.secondary", color: "#fff", borderColor: "text.secondary" } },
    };

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

            {/* Barra de filtros */}
            {!loading && rows.length > 0 && (estados.length > 0 || tipos.length > 0) && (
                <Box sx={{
                    display: "flex", flexDirection: "column", gap: 1,
                    px: 1.5, py: 1, mb: 1.5, borderRadius: 2,
                    bgcolor: "background.paper",
                    border: "1px solid", borderColor: "divider",
                }}>
                    {/* Linha Estado */}
                    {estados.length > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 44 }}>
                                Estado
                            </Typography>
                            {estados.map(estado => {
                                const active = filterEstado === estado;
                                return (
                                    <Chip key={estado}
                                        label={`${estado} ${estadoCounts[estado]}`}
                                        size="small"
                                        color={ESTADO_CUSTOM[estado] ? undefined : (ESTADO_CONFIG[estado] || "default")}
                                        variant={active ? "filled" : "outlined"}
                                        onClick={() => setFilterEstado(active ? "" : estado)}
                                        clickable
                                        sx={{
                                            fontWeight: active ? 600 : 400, transition: "all 0.15s",
                                            ...(ESTADO_CUSTOM[estado] && (active ? ESTADO_CUSTOM[estado].filled : ESTADO_CUSTOM[estado].outlined)),
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    )}
                    {/* Linha Tipo */}
                    {tipos.length > 0 && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, minWidth: 44 }}>
                                Tipo
                            </Typography>
                            {tipos.map(tipo => {
                                const active = filterTipo === tipo;
                                return (
                                    <Chip key={tipo}
                                        label={`${tipo} ${tipoCounts[tipo]}`}
                                        size="small"
                                        variant={active ? "filled" : "outlined"}
                                        onClick={() => setFilterTipo(active ? "" : tipo)}
                                        clickable
                                        sx={{
                                            fontWeight: active ? 600 : 400, transition: "all 0.15s",
                                            ...(active && { bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } }),
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    )}
                    {/* Linha rodapé: contagem + limpar */}
                    <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                        </Typography>
                        {hasFilter && (
                            <Tooltip title="Limpar filtros">
                                <IconButton size="small" onClick={() => { setFilterEstado(""); setFilterTipo(""); }}
                                    sx={{ color: "text.secondary", p: 0.25 }}>
                                    <FilterAltOffIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                </Box>
            )}

            {loading ? (
                <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : rows.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Nenhum equipamento registado.
                </Typography>
            ) : filtered.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                    Nenhum equipamento corresponde aos filtros seleccionados.
                </Typography>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {[
                                    { id: "tipo",   label: "Tipo" },
                                    { id: "marca",  label: "Marca" },
                                    { id: "modelo", label: "Modelo" },
                                    { id: "serial", label: "Nº Série" },
                                    { id: "estado", label: "Estado Actual" },
                                ].map(col => (
                                    <TableCell key={col.id} sortDirection={sortCol === col.id ? sortDir : false}>
                                        <TableSortLabel
                                            active={sortCol === col.id}
                                            direction={sortCol === col.id ? sortDir : "asc"}
                                            onClick={() => handleSort(col.id)}>
                                            <b>{col.label}</b>
                                        </TableSortLabel>
                                    </TableCell>
                                ))}
                                <TableCell align="right"><b>Ações</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sorted.map(row => (
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
                onSaved={() => { load(); setModalOpen(false); }}
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
}
