// /components/ObraDespesaTable.js
import React, { useEffect, useState, useMemo } from "react";
import {
    Box, Typography, Paper, Grid, TextField, Button,
    FormControl, InputLabel, Select, MenuItem, Autocomplete,
    CircularProgress, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TableSortLabel,
    IconButton, Tooltip
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import { getObraDespesaRecords, addObraDespesa, updateObraDespesa, getObrasRecords } from "../../../services/InternalService";
import { notifySuccess } from "../../../components/common/Toaster/ThemedToaster";
import { handleApiError } from "../utils/errorHandler";

const columns = [
    { id: "obra_nome", label: "Obra", field: "obra_nome" },
    { id: "tipo_despesa", label: "Tipo de Despesa", field: "tipo_despesa" },
    { id: "data", label: "Data", field: "data" },
    { id: "valor", label: "Valor (€)", field: "valor" },
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

const emptyForm = { tb_obra: "", tt_despesaobra: "", data: "", valor: "", memo: "" };

const ObraDespesaForm = ({ formData, setFormData, onSubmit, onCancel, loading, metaData, obras, editMode }) => {
    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
    const isValid = formData.tb_obra && formData.tt_despesaobra && formData.data && formData.valor !== "";

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        label="Data" type="date"
                        value={formData.data || ""}
                        onChange={e => handleChange("data", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth required disabled={loading}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Autocomplete
                        options={obras}
                        getOptionLabel={opt => opt.nome || ""}
                        value={obras.find(o => o.pk === formData.tb_obra) || null}
                        onChange={(_, selected) => handleChange("tb_obra", selected?.pk ?? "")}
                        disabled={loading}
                        renderInput={params => (
                            <TextField {...params} label="Obra" required fullWidth />
                        )}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth required>
                        <InputLabel>Tipo de Despesa</InputLabel>
                        <Select
                            value={formData.tt_despesaobra || ""}
                            onChange={e => handleChange("tt_despesaobra", e.target.value)}
                            label="Tipo de Despesa"
                            disabled={loading}
                        >
                            {(metaData?.despesaobra || []).map(opt => (
                                <MenuItem key={opt.pk} value={opt.pk}>{opt.value}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Valor (€)" type="number" required
                        value={formData.valor || ""}
                        onChange={e => handleChange("valor", e.target.value)}
                        fullWidth disabled={loading}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        label="Observações — opcional"
                        value={formData.memo || ""}
                        onChange={e => handleChange("memo", e.target.value)}
                        fullWidth multiline rows={2} disabled={loading}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                        variant="contained" fullWidth
                        onClick={() => onSubmit(formData)}
                        disabled={!isValid || loading}
                        startIcon={loading ? <CircularProgress size={18} /> : null}
                    >
                        {loading ? "A processar..." : editMode ? "Atualizar" : "Adicionar"}
                    </Button>
                    {onCancel && (
                        <Button variant="outlined" color="inherit" fullWidth onClick={onCancel} disabled={loading}>
                            Cancelar
                        </Button>
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
};

const ObraDespesaTable = ({ metaData }) => {
    const [records, setRecords] = useState([]);
    const [obras, setObras] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState("asc");
    const [editRow, setEditRow] = useState(null);
    const [editForm, setEditForm] = useState({});

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const [despRes, obrasRes] = await Promise.all([
                getObraDespesaRecords(),
                getObrasRecords(),
            ]);
            setRecords(despRes.despesas || []);
            setObras(obrasRes.obras || []);
        } catch (error) {
            handleApiError(error, "Erro ao carregar despesas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecords(); }, []);

    const lookupTipoDespesa = (pk) => metaData?.despesaobra?.find(o => o.pk === pk)?.value ?? pk ?? "-";
    const lookupObra = (pk) => obras.find(o => o.pk === pk)?.nome ?? pk ?? "-";

    const handleAdd = async (data) => {
        setSubmitting(true);
        try {
            await addObraDespesa({
                tb_obra: data.tb_obra ? parseInt(data.tb_obra, 10) : undefined,
                tt_despesaobra: data.tt_despesaobra ? parseInt(data.tt_despesaobra, 10) : undefined,
                data: data.data || undefined,
                valor: data.valor ? parseFloat(data.valor) : undefined,
                memo: data.memo || undefined,
            });
            notifySuccess("Despesa registada com sucesso");
            setFormData({ ...emptyForm });
            await fetchRecords();
        } catch (error) {
            handleApiError(error, "Erro ao registar despesa");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditOpen = (row) => {
        setEditRow(row.pk);
        setEditForm({
            tb_obra: row.tb_obra || "",
            tt_despesaobra: row.tt_despesaobra || "",
            data: row.data ? row.data.split("T")[0] : "",
            valor: row.valor ?? "",
            memo: row.memo || "",
        });
    };

    const handleEditSubmit = async (data) => {
        setSubmitting(true);
        try {
            await updateObraDespesa(editRow, {
                tb_obra: data.tb_obra ? parseInt(data.tb_obra, 10) : undefined,
                tt_despesaobra: data.tt_despesaobra ? parseInt(data.tt_despesaobra, 10) : undefined,
                data: data.data || undefined,
                valor: data.valor !== "" ? parseFloat(data.valor) : undefined,
                memo: data.memo || undefined,
            });
            notifySuccess("Despesa atualizada com sucesso");
            setEditRow(null);
            await fetchRecords();
        } catch (error) {
            handleApiError(error, "Erro ao atualizar despesa");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSort = (field) => {
        if (orderBy === field) setOrder(prev => prev === "asc" ? "desc" : "asc");
        else { setOrderBy(field); setOrder("asc"); }
    };

    const sortedRecords = useMemo(() => sortRows(records, orderBy, order), [records, orderBy, order]);

    return (
        <Box>
            <ObraDespesaForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleAdd}
                loading={submitting}
                metaData={metaData}
                obras={obras}
                editMode={false}
            />

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Paper sx={{ mt: 2 }}>
                    <Typography variant="h6" sx={{ p: 2, borderBottom: "1px solid #eee" }}>
                        Despesas de Obra
                    </Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {columns.map(col => (
                                        <TableCell key={col.id}>
                                            {col.field ? (
                                                <TableSortLabel
                                                    active={orderBy === col.field}
                                                    direction={orderBy === col.field ? order : "asc"}
                                                    onClick={() => handleSort(col.field)}
                                                >
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
                                        <TableCell colSpan={columns.length} align="center">
                                            Nenhuma despesa registada
                                        </TableCell>
                                    </TableRow>
                                ) : sortedRecords.map(row => (
                                    editRow === row.pk ? (
                                        <TableRow key={row.pk}>
                                            <TableCell colSpan={columns.length} sx={{ p: 0 }}>
                                                <Box sx={{ p: 1 }}>
                                                    <ObraDespesaForm
                                                        formData={editForm}
                                                        setFormData={setEditForm}
                                                        onSubmit={handleEditSubmit}
                                                        onCancel={() => setEditRow(null)}
                                                        loading={submitting}
                                                        metaData={metaData}
                                                        obras={obras}
                                                        editMode={true}
                                                    />
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow key={row.pk} hover>
                                            <TableCell>{lookupObra(row.tb_obra)}</TableCell>
                                            <TableCell>{row.tt_despesaobra != null ? lookupTipoDespesa(row.tt_despesaobra) : "-"}</TableCell>
                                            <TableCell>{row.data ? formatDate(row.data) : "-"}</TableCell>
                                            <TableCell>{row.valor != null ? formatCurrency(row.valor) : "-"}</TableCell>
                                            <TableCell>{row.memo ?? "-"}</TableCell>
                                            <TableCell>
                                                <Tooltip title="Editar">
                                                    <IconButton size="small" onClick={() => handleEditOpen(row)}>
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
                </Paper>
            )}
        </Box>
    );
};

export default ObraDespesaTable;
