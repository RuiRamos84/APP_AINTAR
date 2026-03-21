// /components/ObrasTable.js
import React, { useEffect, useMemo, useState } from "react";
import {
    Box, Typography, Paper, Grid, TextField, Button,
    FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TableSortLabel,
    IconButton, Tooltip, Dialog, DialogTitle,
    DialogContent, DialogActions, Menu
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useInternalContext } from "../context/InternalContext";
import { useRecords } from "../hooks/useRecords";
import { formatDate, formatCurrency } from "../utils/recordsFormatter";
import * as InternalService from "../../../services/InternalService";
import { notifySuccess } from "../../../components/common/Toaster/ThemedToaster";
import { handleApiError } from "../utils/errorHandler";

// ========================= COLUNAS =========================
const columns = [
    { id: "nome", label: "Nome", field: "nome" },
    { id: "tt_tipoobra", label: "Tipo", field: "tt_tipoobra" },
    { id: "tb_instalacao", label: "Instalação", field: "tb_instalacao" },
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

// ========================= ORDENAÇÃO =========================
function sortRows(rows, orderBy, order) {
    if (!orderBy) return rows;
    return [...rows].sort((a, b) => {
        let av = a[orderBy] ?? "";
        let bv = b[orderBy] ?? "";
        const num = Number(av);
        if (!isNaN(num) && av !== "") { av = num; bv = Number(bv); }
        else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
        if (av < bv) return order === "asc" ? -1 : 1;
        if (av > bv) return order === "asc" ? 1 : -1;
        return 0;
    });
}

// ========================= FORMULÁRIO =========================
const emptyForm = {
    nome: "", tt_tipoobra: "", ts_associate: "", tb_instalacao: "", tt_urgencia: "",
    data_prevista: "", data_obra_inicio: "", data_obra_fim: "",
    valor_estimado: "", valor_exec_aintar: "", valor_exec_subsidio: "",
    valor_exec_municipio: "", estado: "", aviso: "", memo: "",
};

const ObrasForm = ({ formData, setFormData, onSubmit, onCancel, loading, metaData, editMode }) => {
    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    // tb_instalacao é obrigatório e nome auto-gerado se tt_tipoobra for 1 ou 2
    const instalacaoRequired = formData.tt_tipoobra === 1 || formData.tt_tipoobra === 2
        || formData.tt_tipoobra === "1" || formData.tt_tipoobra === "2";

    // Filtrar instalações pelo município do associado seleccionado
    const associadoNome = (metaData?.associates || []).find(a => a.pk === formData.ts_associate || a.pk === Number(formData.ts_associate))?.name ?? "";
    const municipioNome = associadoNome.replace("Município de ", "");
    const instalacoesFiltradas = formData.ts_associate && municipioNome
        ? (metaData?.instalacao || []).filter(i => i.ts_entity === municipioNome)
        : (metaData?.instalacao || []);

    // Auto-gerar nome ao seleccionar instalação (tipo 1 ou 2)
    const handleInstalacaoChange = (selected) => {
        handleChange("tb_instalacao", selected?.pk ?? "");
        if (instalacaoRequired && selected) {
            const tipoLabel = (metaData?.tipo_obra || []).find(t => t.pk === formData.tt_tipoobra || t.pk === Number(formData.tt_tipoobra))?.value ?? "";
            handleChange("nome", tipoLabel ? `${tipoLabel} de ${selected.value || selected.nome}` : (selected.value || selected.nome));
        }
    };

    // Ao mudar tipo para 1/2, limpar instalação e nome auto-gerado
    const handleTipoChange = (val) => {
        handleChange("tt_tipoobra", val);
        const isAuto = val === 1 || val === 2 || val === "1" || val === "2";
        if (isAuto) handleChange("nome", "");
        handleChange("tb_instalacao", "");
    };

    const isValid = formData.nome?.trim() && formData.tt_tipoobra && formData.ts_associate
        && (!instalacaoRequired || formData.tb_instalacao);

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
                {/* Data Prevista */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Data Prevista" type="date"
                        value={formData.data_prevista || ""}
                        onChange={e => handleChange("data_prevista", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Data Início */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Data Início" type="date"
                        value={formData.data_obra_inicio || ""}
                        onChange={e => handleChange("data_obra_inicio", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Data Fim */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Data Fim" type="date"
                        value={formData.data_obra_fim || ""}
                        onChange={e => handleChange("data_obra_fim", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Tipo de Obra */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth required>
                        <InputLabel>Tipo de Obra</InputLabel>
                        <Select
                            value={formData.tt_tipoobra || ""}
                            onChange={e => handleTipoChange(e.target.value)}
                            label="Tipo de Obra"
                            disabled={loading}
                        >
                            {(metaData?.tipo_obra || []).map(opt => (
                                <MenuItem key={opt.pk} value={opt.pk}>{opt.value || opt.nome}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Nome — só visível quando tipo está seleccionado e não é 1 nem 2 */}
                {formData.tt_tipoobra && !instalacaoRequired && (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <TextField
                            label="Nome"
                            value={formData.nome || ""}
                            onChange={e => handleChange("nome", e.target.value)}
                            fullWidth required disabled={loading}
                        />
                    </Grid>
                )}

                {/* Associado */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth required>
                        <InputLabel>Associado</InputLabel>
                        <Select
                            value={formData.ts_associate || ""}
                            onChange={e => {
                                handleChange("ts_associate", e.target.value);
                                handleChange("tb_instalacao", "");
                            }}
                            label="Associado"
                            disabled={loading}
                        >
                            {(metaData?.associates || []).map(opt => (
                                <MenuItem key={opt.pk} value={opt.pk}>{opt.name || opt.value}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Instalação (só aparece se tipo 1 ou 2 e associado seleccionado) */}
                {instalacaoRequired && formData.ts_associate && (
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                        <Autocomplete
                            options={instalacoesFiltradas}
                            getOptionLabel={opt => opt.value || opt.nome || ""}
                            value={instalacoesFiltradas.find(o => o.pk === formData.tb_instalacao) || null}
                            onChange={(_, selected) => handleInstalacaoChange(selected)}
                            disabled={loading}
                            renderInput={params => (
                                <TextField {...params} label="Instalação" required fullWidth />
                            )}
                        />
                    </Grid>
                )}

                {/* Urgência */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <FormControl fullWidth>
                        <InputLabel>Urgência</InputLabel>
                        <Select
                            value={formData.tt_urgencia || ""}
                            onChange={e => handleChange("tt_urgencia", e.target.value)}
                            label="Urgência"
                            disabled={loading}
                        >
                            <MenuItem value=""><em>Nenhuma</em></MenuItem>
                            {(metaData?.urgencia || []).map(opt => (
                                <MenuItem key={opt.code} value={opt.code}>{opt.value}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                {/* Estado */}
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <TextField
                        label="Estado"
                        value={formData.estado || ""}
                        onChange={e => handleChange("estado", e.target.value)}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Valor Estimado */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Valor Estimado (€)" type="number"
                        value={formData.valor_estimado || ""}
                        onChange={e => handleChange("valor_estimado", e.target.value)}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Valor Exec. AINTAR */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Exec. AINTAR (€)" type="number"
                        value={formData.valor_exec_aintar || ""}
                        onChange={e => handleChange("valor_exec_aintar", e.target.value)}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Valor Exec. Subsídio */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Exec. Subsídio (€)" type="number"
                        value={formData.valor_exec_subsidio || ""}
                        onChange={e => handleChange("valor_exec_subsidio", e.target.value)}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Valor Exec. Município */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Exec. Município (€)" type="number"
                        value={formData.valor_exec_municipio || ""}
                        onChange={e => handleChange("valor_exec_municipio", e.target.value)}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Aviso */}
                <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                    <TextField
                        label="Aviso"
                        value={formData.aviso || ""}
                        onChange={e => handleChange("aviso", e.target.value)}
                        fullWidth disabled={loading}
                    />
                </Grid>

                {/* Memo */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                        label="Observações"
                        value={formData.memo || ""}
                        onChange={e => handleChange("memo", e.target.value)}
                        fullWidth multiline rows={2} disabled={loading}
                    />
                </Grid>

                {/* Botões */}
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

// ========================= TABELA PRINCIPAL =========================
const ObrasTable = ({ metaData }) => {
    const { dispatch } = useInternalContext();
    const { records, loading, submitting, newRecord, setNewRecord, addRecord, updateRecord, fetchRecords } = useRecords("obras");

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

    useEffect(() => {
        dispatch({ type: "SET_AREA", payload: 10 });
    }, [dispatch]);

    const lookupTipoObra = (pk) => metaData?.tipo_obra?.find(o => o.pk === pk)?.value ?? pk ?? "-";
    const lookupInstalacao = (pk) => metaData?.instalacao?.find(o => o.pk === pk)?.value ?? metaData?.instalacao?.find(o => o.pk === pk)?.nome ?? pk ?? "-";
    const lookupAssociate = (pk) => metaData?.associates?.find(o => o.pk === pk)?.name ?? pk ?? "-";
    const lookupUrgencia = (code) => metaData?.urgencia?.find(o => o.code === code)?.value ?? code ?? "-";

    const handleAddRecord = async () => {
        const payload = {
            nome: newRecord.nome,
            tt_tipoobra: newRecord.tt_tipoobra ? parseInt(newRecord.tt_tipoobra, 10) : undefined,
            ts_associate: newRecord.ts_associate ? parseInt(newRecord.ts_associate, 10) : undefined,
            tb_instalacao: newRecord.tb_instalacao ? parseInt(newRecord.tb_instalacao, 10) : undefined,
            tt_urgencia: newRecord.tt_urgencia ? parseInt(newRecord.tt_urgencia, 10) : undefined,
            data_prevista: newRecord.data_prevista || undefined,
            data_obra_inicio: newRecord.data_obra_inicio || undefined,
            data_obra_fim: newRecord.data_obra_fim || undefined,
            valor_estimado: newRecord.valor_estimado ? parseFloat(newRecord.valor_estimado) : undefined,
            valor_exec_aintar: newRecord.valor_exec_aintar ? parseFloat(newRecord.valor_exec_aintar) : undefined,
            valor_exec_subsidio: newRecord.valor_exec_subsidio ? parseFloat(newRecord.valor_exec_subsidio) : undefined,
            valor_exec_municipio: newRecord.valor_exec_municipio ? parseFloat(newRecord.valor_exec_municipio) : undefined,
            estado: newRecord.estado || undefined,
            aviso: newRecord.aviso || undefined,
            memo: newRecord.memo || undefined,
        };
        if (await addRecord(payload)) {
            setNewRecord({ ...emptyForm });
        }
    };

    const handleSort = (field) => {
        if (orderBy === field) {
            setOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setOrderBy(field);
            setOrder("asc");
        }
    };

    const sortedRecords = useMemo(() => sortRows(records, orderBy, order), [records, orderBy, order]);

    const handleEditOpen = (row) => {
        setEditRow(row.pk);
        setEditForm({
            nome: row.nome || "",
            tt_tipoobra: row.tt_tipoobra || "",
            ts_associate: row.ts_associate || "",
            tb_instalacao: row.tb_instalacao || "",
            tt_urgencia: row.tt_urgencia || "",
            data_prevista: row.data_prevista ? row.data_prevista.split("T")[0] : "",
            data_obra_inicio: row.data_obra_inicio ? row.data_obra_inicio.split("T")[0] : "",
            data_obra_fim: row.data_obra_fim ? row.data_obra_fim.split("T")[0] : "",
            valor_estimado: row.valor_estimado ?? "",
            valor_exec_aintar: row.valor_exec_aintar ?? "",
            valor_exec_subsidio: row.valor_exec_subsidio ?? "",
            valor_exec_municipio: row.valor_exec_municipio ?? "",
            estado: row.estado || "",
            aviso: row.aviso || "",
            memo: row.memo || "",
        });
    };

    const handleEditSubmit = async (data) => {
        const payload = {
            nome: data.nome,
            tt_tipoobra: data.tt_tipoobra ? parseInt(data.tt_tipoobra, 10) : undefined,
            ts_associate: data.ts_associate ? parseInt(data.ts_associate, 10) : undefined,
            tb_instalacao: data.tb_instalacao ? parseInt(data.tb_instalacao, 10) : undefined,
            tt_urgencia: data.tt_urgencia ? parseInt(data.tt_urgencia, 10) : undefined,
            data_prevista: data.data_prevista || undefined,
            data_obra_inicio: data.data_obra_inicio || undefined,
            data_obra_fim: data.data_obra_fim || undefined,
            valor_estimado: data.valor_estimado !== "" ? parseFloat(data.valor_estimado) : undefined,
            valor_exec_aintar: data.valor_exec_aintar !== "" ? parseFloat(data.valor_exec_aintar) : undefined,
            valor_exec_subsidio: data.valor_exec_subsidio !== "" ? parseFloat(data.valor_exec_subsidio) : undefined,
            valor_exec_municipio: data.valor_exec_municipio !== "" ? parseFloat(data.valor_exec_municipio) : undefined,
            estado: data.estado || undefined,
            aviso: data.aviso || undefined,
            memo: data.memo || undefined,
        };
        if (await updateRecord(editRow, payload)) {
            setEditRow(null);
        }
    };

    const handleDespesaSubmit = async () => {
        setDespesaSubmitting(true);
        try {
            await InternalService.addObraDespesa({
                tb_obra: selectedRow.pk,
                tt_despesaobra: parseInt(despesaForm.tt_despesaobra, 10),
                data: despesaForm.data,
                valor: parseFloat(despesaForm.valor),
                memo: despesaForm.memo || undefined,
            });
            notifySuccess("Despesa registada com sucesso");
            setDespesaDialog(false);
        } catch (error) {
            handleApiError(error, "Erro ao registar despesa");
        } finally {
            setDespesaSubmitting(false);
        }
    };

    const isDespesaValid = despesaForm.tt_despesaobra && despesaForm.data && despesaForm.valor !== "";

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await InternalService.deleteObra(deleteTarget);
            notifySuccess("Obra eliminada com sucesso");
            setDeleteTarget(null);
            await fetchRecords();
        } catch (error) {
            handleApiError(error, "Erro ao eliminar obra");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">Registo de Obras</Typography>
            </Paper>

            <ObrasForm
                formData={newRecord}
                setFormData={setNewRecord}
                onSubmit={handleAddRecord}
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
                        Registos
                    </Typography>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    {columns.map(col => (
                                        <TableCell key={col.id} sortDirection={orderBy === col.field ? order : false}>
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
                                            Nenhum registo encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : sortedRecords.map((row) => (
                                    editRow === row.pk ? (
                                        <TableRow key={row.pk}>
                                            <TableCell colSpan={columns.length} sx={{ p: 0 }}>
                                                <Box sx={{ p: 1 }}>
                                                    <ObrasForm
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
                                            <TableCell>{lookupTipoObra(row.tt_tipoobra)}</TableCell>
                                            <TableCell>{row.tb_instalacao ? lookupInstalacao(row.tb_instalacao) : "-"}</TableCell>
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
                                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditOpen(row); }}>
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

export default ObrasTable;
