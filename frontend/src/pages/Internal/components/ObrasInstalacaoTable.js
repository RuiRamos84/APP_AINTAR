// /components/ObrasInstalacaoTable.js
import React, { useEffect, useState, useMemo } from "react";
import {
    Box, Typography, Paper, Grid, TextField, Button,
    FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TableSortLabel,
    IconButton, Tooltip, Dialog, DialogTitle,
    DialogContent, DialogActions, Menu, Tabs, Tab
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { getObrasInstalacaoRecords, addObra, updateObra, deleteObra, addObraDespesa, getObraDespesaByInstalacao, updateObraDespesa } from "../../../services/InternalService";
import { notifySuccess } from "../../../components/common/Toaster/ThemedToaster";
import { handleApiError } from "../utils/errorHandler";

const columns = [
    { id: "nome", label: "Nome", field: "nome" },
    { id: "ts_associate", label: "Associado", field: "ts_associate" },
    { id: "data_prevista", label: "Data Prevista", field: "data_prevista" },
    { id: "data_obra_inicio", label: "Data Início", field: "data_obra_inicio" },
    { id: "data_obra_fim", label: "Data Fim", field: "data_obra_fim" },
    { id: "tt_urgencia", label: "Urgência", field: "tt_urgencia" },
    { id: "estado", label: "Estado", field: "estado" },
    { id: "valor_estimado", label: "Valor Estimado (€)", field: "valor_estimado" },
    { id: "valor_exec_aintar", label: "Exec. AINTAR (€)", field: "valor_exec_aintar" },
    { id: "valor_exec_subsidio", label: "Exec. Subsídio (€)", field: "valor_exec_subsidio" },
    { id: "valor_exec_municipio", label: "Exec. Município (€)", field: "valor_exec_municipio" },
    { id: "aviso", label: "Aviso", field: "aviso" },
    { id: "memo", label: "Observações", field: "memo" },
    { id: "acoes", label: "Ações" },
];

function sortRows(rows, orderBy, order) {
    if (!orderBy) return rows;
    return [...rows].sort((a, b) => {
        let av = a[orderBy] ?? "", bv = b[orderBy] ?? "";
        const num = Number(av);
        if (!isNaN(num) && av !== "") { av = num; bv = Number(bv); }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        if (av < bv) return order === "asc" ? -1 : 1;
        if (av > bv) return order === "asc" ? 1 : -1;
        return 0;
    });
}

const emptyForm = {
    nome: "", ts_associate: "", tt_urgencia: "",
    data_prevista: "", data_obra_inicio: "", data_obra_fim: "",
    valor_estimado: "", valor_exec_aintar: "", valor_exec_subsidio: "",
    valor_exec_municipio: "", aviso: "", memo: "",
};

const ObrasInstalacaoForm = ({ formData, setFormData, onSubmit, onCancel, loading, metaData, editMode }) => {
    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const isValid = true;

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Data Prevista" type="date" value={formData.data_prevista || ""} onChange={e => handleChange("data_prevista", e.target.value)} InputLabelProps={{ shrink: true }} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Data Início" type="date" value={formData.data_obra_inicio || ""} onChange={e => handleChange("data_obra_inicio", e.target.value)} InputLabelProps={{ shrink: true }} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Data Fim" type="date" value={formData.data_obra_fim || ""} onChange={e => handleChange("data_obra_fim", e.target.value)} InputLabelProps={{ shrink: true }} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Urgência</InputLabel>
                        <Select value={formData.tt_urgencia || ""} onChange={e => handleChange("tt_urgencia", e.target.value)} label="Urgência" disabled={loading}>
                            <MenuItem value=""><em>Nenhuma</em></MenuItem>
                            {(metaData?.urgencia || []).map(opt => (
                                <MenuItem key={opt.code} value={opt.code}>{opt.value}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Valor Estimado (€)" type="number" value={formData.valor_estimado || ""} onChange={e => handleChange("valor_estimado", e.target.value)} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Exec. AINTAR (€)" type="number" value={formData.valor_exec_aintar || ""} onChange={e => handleChange("valor_exec_aintar", e.target.value)} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Exec. Subsídio (€)" type="number" value={formData.valor_exec_subsidio || ""} onChange={e => handleChange("valor_exec_subsidio", e.target.value)} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Exec. Município (€)" type="number" value={formData.valor_exec_municipio || ""} onChange={e => handleChange("valor_exec_municipio", e.target.value)} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField label="Aviso" value={formData.aviso || ""} onChange={e => handleChange("aviso", e.target.value)} fullWidth disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField label="Observações" value={formData.memo || ""} onChange={e => handleChange("memo", e.target.value)} fullWidth multiline rows={2} disabled={loading} />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button variant="contained" fullWidth onClick={() => onSubmit(formData)} disabled={!isValid || loading} startIcon={loading ? <CircularProgress size={18} /> : null}>
                        {loading ? "A processar..." : editMode ? "Atualizar" : "Adicionar"}
                    </Button>
                    {onCancel && (
                        <Button variant="outlined" color="inherit" fullWidth onClick={onCancel} disabled={loading}>Cancelar</Button>
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
};

const ObrasInstalacaoTable = ({ selectedEntity, areaId, metaData }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState("asc");
    const [editRow, setEditRow] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
    const [selectedRow, setSelectedRow] = useState(null);
    const [despesaDialog, setDespesaDialog] = useState(false);
    const [despesaForm, setDespesaForm] = useState({ tt_despesaobra: "", data: "", valor: "", memo: "" });
    const [despesaSubmitting, setDespesaSubmitting] = useState(false);

    const [tab, setTab] = useState(0);

    const [despesas, setDespesas] = useState([]);
    const [despesasLoading, setDespesasLoading] = useState(false);
    const [editDespesaRow, setEditDespesaRow] = useState(null);
    const [editDespesaForm, setEditDespesaForm] = useState({});

    // tt_tipoobra automático: 1=ETAR, 2=EEAR
    const tipoObra = areaId === 1 ? 1 : 2;

    // Pré-preencher nome e associado com base na entidade seleccionada
    useEffect(() => {
        if (!selectedEntity || !metaData) return;
        const tipoLabel = metaData.tipo_obra?.find(t => t.pk === tipoObra)?.value ?? "";
        const nome = tipoLabel ? `${tipoLabel} de ${selectedEntity.nome}` : selectedEntity.nome;
        const match = metaData.associates?.find(a =>
            a.name === `Município de ${selectedEntity.ts_entity}` ||
            a.name.replace("Município de ", "") === selectedEntity.ts_entity
        );
        setFormData(prev => ({
            ...prev,
            nome,
            ts_associate: match?.pk ?? prev.ts_associate,
        }));
    }, [selectedEntity?.pk, metaData]);

    const fetchRecords = async () => {
        if (!selectedEntity?.pk) return;
        setLoading(true);
        try {
            const res = await getObrasInstalacaoRecords(selectedEntity.pk);
            setRecords(res.obras || []);
        } catch (error) {
            handleApiError(error, "Erro ao carregar obras");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, [selectedEntity?.pk]);

    const fetchDespesas = async () => {
        if (!selectedEntity?.pk) return;
        setDespesasLoading(true);
        try {
            const res = await getObraDespesaByInstalacao(selectedEntity.pk);
            setDespesas(res.despesas || []);
        } catch (error) {
            handleApiError(error, "Erro ao carregar despesas");
        } finally {
            setDespesasLoading(false);
        }
    };

    useEffect(() => { fetchDespesas(); }, [selectedEntity?.pk]);

    const lookupAssociate = (pk) => metaData?.associates?.find(o => o.pk === pk)?.name ?? pk ?? "-";
    const lookupUrgencia = (code) => metaData?.urgencia?.find(o => o.code === code)?.value ?? code ?? "-";

    const handleAdd = async (data) => {
        setSubmitting(true);
        try {
            await addObra({
                nome: data.nome,
                tt_tipoobra: tipoObra,
                tb_instalacao: selectedEntity.pk,
                ts_associate: data.ts_associate ? parseInt(data.ts_associate, 10) : undefined,
                tt_urgencia: data.tt_urgencia ? parseInt(data.tt_urgencia, 10) : undefined,
                data_prevista: data.data_prevista || undefined,
                data_obra_inicio: data.data_obra_inicio || undefined,
                data_obra_fim: data.data_obra_fim || undefined,
                valor_estimado: data.valor_estimado ? parseFloat(data.valor_estimado) : undefined,
                valor_exec_aintar: data.valor_exec_aintar ? parseFloat(data.valor_exec_aintar) : undefined,
                valor_exec_subsidio: data.valor_exec_subsidio ? parseFloat(data.valor_exec_subsidio) : undefined,
                valor_exec_municipio: data.valor_exec_municipio ? parseFloat(data.valor_exec_municipio) : undefined,
                aviso: data.aviso || undefined,
                memo: data.memo || undefined,
            });
            notifySuccess("Obra registada com sucesso");
            setFormData({ ...emptyForm });
            await fetchRecords();
        } catch (error) {
            handleApiError(error, "Erro ao registar obra");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditOpen = (row) => {
        setEditRow(row.pk);
        setEditForm({
            nome: row.nome || "",
            ts_associate: row.ts_associate || "",
            tt_urgencia: row.tt_urgencia || "",
            data_prevista: row.data_prevista ? row.data_prevista.split("T")[0] : "",
            data_obra_inicio: row.data_obra_inicio ? row.data_obra_inicio.split("T")[0] : "",
            data_obra_fim: row.data_obra_fim ? row.data_obra_fim.split("T")[0] : "",
            valor_estimado: row.valor_estimado ?? "",
            valor_exec_aintar: row.valor_exec_aintar ?? "",
            valor_exec_subsidio: row.valor_exec_subsidio ?? "",
            valor_exec_municipio: row.valor_exec_municipio ?? "",
            aviso: row.aviso || "",
            memo: row.memo || "",
        });
    };

    const handleEditSubmit = async (data) => {
        setSubmitting(true);
        try {
            await updateObra(editRow, {
                nome: data.nome,
                ts_associate: data.ts_associate ? parseInt(data.ts_associate, 10) : undefined,
                tt_urgencia: data.tt_urgencia ? parseInt(data.tt_urgencia, 10) : undefined,
                data_prevista: data.data_prevista || undefined,
                data_obra_inicio: data.data_obra_inicio || undefined,
                data_obra_fim: data.data_obra_fim || undefined,
                valor_estimado: data.valor_estimado !== "" ? parseFloat(data.valor_estimado) : undefined,
                valor_exec_aintar: data.valor_exec_aintar !== "" ? parseFloat(data.valor_exec_aintar) : undefined,
                valor_exec_subsidio: data.valor_exec_subsidio !== "" ? parseFloat(data.valor_exec_subsidio) : undefined,
                valor_exec_municipio: data.valor_exec_municipio !== "" ? parseFloat(data.valor_exec_municipio) : undefined,
                aviso: data.aviso || undefined,
                memo: data.memo || undefined,
            });
            notifySuccess("Obra atualizada com sucesso");
            setEditRow(null);
            await fetchRecords();
        } catch (error) {
            handleApiError(error, "Erro ao atualizar obra");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDespesaSubmit = async () => {
        setDespesaSubmitting(true);
        try {
            await addObraDespesa({
                tb_obra: selectedRow.pk,
                tt_despesaobra: parseInt(despesaForm.tt_despesaobra, 10),
                data: despesaForm.data,
                valor: parseFloat(despesaForm.valor),
                memo: despesaForm.memo || undefined,
            });
            notifySuccess("Despesa registada com sucesso");
            setDespesaDialog(false);
            await fetchDespesas();
        } catch (error) {
            handleApiError(error, "Erro ao registar despesa");
        } finally {
            setDespesaSubmitting(false);
        }
    };

    const isDespesaValid = despesaForm.tt_despesaobra && despesaForm.data && despesaForm.valor !== "";

    const handleEditDespesaOpen = (row) => {
        setEditDespesaRow(row.pk);
        setEditDespesaForm({
            tt_despesaobra: row.tt_despesaobra || "",
            data: row.data ? row.data.split("T")[0] : "",
            valor: row.valor ?? "",
            memo: row.memo || "",
        });
    };

    const handleEditDespesaSubmit = async () => {
        setDespesaSubmitting(true);
        try {
            await updateObraDespesa(editDespesaRow, {
                tt_despesaobra: editDespesaForm.tt_despesaobra ? parseInt(editDespesaForm.tt_despesaobra, 10) : undefined,
                data: editDespesaForm.data || undefined,
                valor: editDespesaForm.valor !== "" ? parseFloat(editDespesaForm.valor) : undefined,
                memo: editDespesaForm.memo || undefined,
            });
            notifySuccess("Despesa atualizada com sucesso");
            setEditDespesaRow(null);
            await fetchDespesas();
        } catch (error) {
            handleApiError(error, "Erro ao atualizar despesa");
        } finally {
            setDespesaSubmitting(false);
        }
    };

    const lookupTipoDespesa = (pk) => metaData?.despesaobra?.find(o => o.pk === pk)?.value ?? pk ?? "-";

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteObra(deleteTarget);
            notifySuccess("Obra eliminada com sucesso");
            setDeleteTarget(null);
            await fetchRecords();
        } catch (error) {
            handleApiError(error, "Erro ao eliminar obra");
        } finally {
            setDeleting(false);
        }
    };

    const handleSort = (field) => {
        if (orderBy === field) setOrder(prev => prev === "asc" ? "desc" : "asc");
        else { setOrderBy(field); setOrder("asc"); }
    };

    const sortedRecords = useMemo(() => sortRows(records, orderBy, order), [records, orderBy, order]);

    return (
        <Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="Obras" />
                <Tab label="Despesas de Obra" />
            </Tabs>

            {tab === 0 && <>
            <ObrasInstalacaoForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleAdd}
                loading={submitting}
                metaData={metaData}
                editMode={false}
            />

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Paper sx={{ mt: 2 }}>
                    <Typography variant="h6" sx={{ p: 2, borderBottom: "1px solid #eee" }}>
                        Obras — {selectedEntity?.nome}
                    </Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {columns.map(col => (
                                        <TableCell key={col.id}>
                                            {col.field ? (
                                                <TableSortLabel active={orderBy === col.field} direction={orderBy === col.field ? order : "asc"} onClick={() => handleSort(col.field)}>
                                                    {col.label}
                                                </TableSortLabel>
                                            ) : col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} align="center">Nenhuma obra registada</TableCell>
                                    </TableRow>
                                ) : sortedRecords.map(row => (
                                    editRow === row.pk ? (
                                        <TableRow key={row.pk}>
                                            <TableCell colSpan={columns.length} sx={{ p: 0 }}>
                                                <Box sx={{ p: 1 }}>
                                                    <ObrasInstalacaoForm
                                                        formData={editForm}
                                                        setFormData={setEditForm}
                                                        onSubmit={handleEditSubmit}
                                                        onCancel={() => setEditRow(null)}
                                                        loading={submitting}
                                                        metaData={metaData}
                                                        editMode={true}
                                                    />
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow
                                            key={row.pk} hover
                                            onClick={(e) => { setSelectedRow(row); setRowMenuAnchor({ top: e.clientY, left: e.clientX }); }}
                                            sx={{ cursor: "pointer" }}
                                        >
                                            <TableCell>{row.nome ?? "-"}</TableCell>
                                            <TableCell>{lookupAssociate(row.ts_associate)}</TableCell>
                                            <TableCell>{row.data_prevista ? formatDate(row.data_prevista) : "-"}</TableCell>
                                            <TableCell>{row.data_obra_inicio ? formatDate(row.data_obra_inicio) : "-"}</TableCell>
                                            <TableCell>{row.data_obra_fim ? formatDate(row.data_obra_fim) : "-"}</TableCell>
                                            <TableCell>{row.tt_urgencia != null ? lookupUrgencia(row.tt_urgencia) : "-"}</TableCell>
                                            <TableCell>{row.estado === 1 || row.estado === "1" ? "Concluído" : "Por concluir"}</TableCell>
                                            <TableCell>{row.valor_estimado != null ? formatCurrency(row.valor_estimado) : "-"}</TableCell>
                                            <TableCell>{row.valor_exec_aintar != null ? formatCurrency(row.valor_exec_aintar) : "-"}</TableCell>
                                            <TableCell>{row.valor_exec_subsidio != null ? formatCurrency(row.valor_exec_subsidio) : "-"}</TableCell>
                                            <TableCell>{row.valor_exec_municipio != null ? formatCurrency(row.valor_exec_municipio) : "-"}</TableCell>
                                            <TableCell>{row.aviso ?? "-"}</TableCell>
                                            <TableCell>{row.memo ?? "-"}</TableCell>
                                            <TableCell>
                                                <Tooltip title="Editar">
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditOpen(row); }}><EditIcon fontSize="small" /></IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    )
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
            </>}

            {tab === 1 && <>
            {/* Tabela de despesas */}
            <Paper sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ p: 2, borderBottom: "1px solid #eee" }}>
                    Despesas de Obra — {selectedEntity?.nome}
                </Typography>
                {despesasLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Obra</TableCell>
                                    <TableCell>Tipo de Despesa</TableCell>
                                    <TableCell>Data</TableCell>
                                    <TableCell>Valor (€)</TableCell>
                                    <TableCell>Observações</TableCell>
                                    <TableCell>Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {despesas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">Nenhuma despesa registada</TableCell>
                                    </TableRow>
                                ) : despesas.map(row => (
                                    editDespesaRow === row.pk ? (
                                        <TableRow key={row.pk}>
                                            <TableCell colSpan={6} sx={{ p: 1 }}>
                                                <Grid container spacing={2} alignItems="center">
                                                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                        <TextField
                                                            label="Data" type="date"
                                                            value={editDespesaForm.data}
                                                            onChange={e => setEditDespesaForm(p => ({ ...p, data: e.target.value }))}
                                                            InputLabelProps={{ shrink: true }}
                                                            fullWidth size="small" disabled={despesaSubmitting}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                        <FormControl fullWidth size="small">
                                                            <InputLabel>Tipo de Despesa</InputLabel>
                                                            <Select
                                                                value={editDespesaForm.tt_despesaobra}
                                                                onChange={e => setEditDespesaForm(p => ({ ...p, tt_despesaobra: e.target.value }))}
                                                                label="Tipo de Despesa"
                                                                disabled={despesaSubmitting}
                                                            >
                                                                {(metaData?.despesaobra || []).map(opt => (
                                                                    <MenuItem key={opt.pk} value={opt.pk}>{opt.value}</MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                                                        <TextField
                                                            label="Valor (€)" type="number"
                                                            value={editDespesaForm.valor}
                                                            onChange={e => setEditDespesaForm(p => ({ ...p, valor: e.target.value }))}
                                                            fullWidth size="small" disabled={despesaSubmitting}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                        <TextField
                                                            label="Observações"
                                                            value={editDespesaForm.memo}
                                                            onChange={e => setEditDespesaForm(p => ({ ...p, memo: e.target.value }))}
                                                            fullWidth size="small" disabled={despesaSubmitting}
                                                        />
                                                    </Grid>
                                                    <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex", gap: 1 }}>
                                                        <Button variant="contained" size="small" onClick={handleEditDespesaSubmit} disabled={despesaSubmitting}
                                                            startIcon={despesaSubmitting ? <CircularProgress size={14} /> : null}>
                                                            Guardar
                                                        </Button>
                                                        <Button variant="outlined" size="small" color="inherit" onClick={() => setEditDespesaRow(null)} disabled={despesaSubmitting}>
                                                            Cancelar
                                                        </Button>
                                                    </Grid>
                                                </Grid>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow key={row.pk} hover>
                                            <TableCell>{records.find(o => o.pk === row.tb_obra)?.nome ?? row.tb_obra ?? "-"}</TableCell>
                                            <TableCell>{row.tt_despesaobra != null ? lookupTipoDespesa(row.tt_despesaobra) : "-"}</TableCell>
                                            <TableCell>{row.data ? formatDate(row.data) : "-"}</TableCell>
                                            <TableCell>{row.valor != null ? formatCurrency(row.valor) : "-"}</TableCell>
                                            <TableCell>{row.memo ?? "-"}</TableCell>
                                            <TableCell>
                                                <Tooltip title="Editar">
                                                    <IconButton size="small" onClick={() => handleEditDespesaOpen(row)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    )
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            </>}

            {/* Menu de linha */}
            <Menu
                open={Boolean(rowMenuAnchor)}
                onClose={() => setRowMenuAnchor(null)}
                anchorReference="anchorPosition"
                anchorPosition={rowMenuAnchor ?? undefined}
            >
                <MenuItem onClick={() => {
                    setRowMenuAnchor(null);
                    setDespesaForm({ tt_despesaobra: "", data: "", valor: "", memo: "" });
                    setDespesaDialog(true);
                }}>
                    <ReceiptLongIcon fontSize="small" sx={{ mr: 1 }} />
                    Adicionar despesa de obra
                </MenuItem>
            </Menu>

            {/* Diálogo de despesa */}
            <Dialog open={despesaDialog} onClose={() => setDespesaDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Adicionar despesa — {selectedRow?.nome}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Data" type="date"
                                value={despesaForm.data}
                                onChange={e => setDespesaForm(p => ({ ...p, data: e.target.value }))}
                                InputLabelProps={{ shrink: true }}
                                fullWidth required disabled={despesaSubmitting}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required>
                                <InputLabel>Tipo de Despesa</InputLabel>
                                <Select
                                    value={despesaForm.tt_despesaobra}
                                    onChange={e => setDespesaForm(p => ({ ...p, tt_despesaobra: e.target.value }))}
                                    label="Tipo de Despesa"
                                    disabled={despesaSubmitting}
                                >
                                    {(metaData?.despesaobra || []).map(opt => (
                                        <MenuItem key={opt.pk} value={opt.pk}>{opt.value}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Valor (€)" type="number"
                                value={despesaForm.valor}
                                onChange={e => setDespesaForm(p => ({ ...p, valor: e.target.value }))}
                                fullWidth required disabled={despesaSubmitting}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Observações — opcional"
                                value={despesaForm.memo}
                                onChange={e => setDespesaForm(p => ({ ...p, memo: e.target.value }))}
                                fullWidth multiline rows={2} disabled={despesaSubmitting}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDespesaDialog(false)} disabled={despesaSubmitting}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={handleDespesaSubmit}
                        disabled={!isDespesaValid || despesaSubmitting}
                        startIcon={despesaSubmitting ? <CircularProgress size={18} /> : null}
                    >
                        {despesaSubmitting ? "A processar..." : "Adicionar"}
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default ObrasInstalacaoTable;
