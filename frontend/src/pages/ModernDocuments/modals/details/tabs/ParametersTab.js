import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Box,
    Typography,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Skeleton,
    Button,
    Chip,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    RadioGroup,
    FormControlLabel,
    Radio,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Divider,
    CircularProgress
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';

// Import services
import { getDocumentTypeParams, updateDocumentParams } from '../../../../../services/documentService';
import { useDocumentsContext } from '../../../../ModernDocuments/context/DocumentsContext';
import { useDocumentActions } from '../../../../ModernDocuments/context/DocumentActionsContext';
import {
    notifySuccess,
    notifyError,
} from '../../../../../components/common/Toaster/ThemedToaster';
import { useSmartRefresh } from '../../../hooks/useSmartRefresh';

// Helpers
const normalizeZoneName = (zoneName) => {
    if (!zoneName) return "";
    return zoneName.replace(/^Município de /, "").trim();
};

const isBooleanParam = (name) => {
    return [
        "Gratuito",
        "Existência de sanemanto até 20 m",
        "Existência de rede de água",
        "Urgência",
        "Existência de saneamento até 20 m"
    ].includes(name);
};

const ParametersTab = ({ document, metaData, isAssignedToMe = false }) => {
    const theme = useTheme();
    const { } = useDocumentsContext();
    const { updateDocumentParams: updateContextParams, documentParams } = useDocumentActions();

    // States
    const [params, setParams] = useState([]);
    const [loadingParams, setLoadingParams] = useState(true);
    const [openParamModal, setOpenParamModal] = useState(false);
    const [savingParams, setSavingParams] = useState(false);
    const [etars, setEtars] = useState([]);
    const { smartRefresh } = useSmartRefresh();

    // Fetch parameters
    const fetchParams = useCallback(async () => {
        setLoadingParams(true);
        try {
            if (document?.pk) {
                const response = await getDocumentTypeParams(document.pk);
                const fetchedParams = response.params || [];
                setParams(fetchedParams);
            }
        } catch (error) {
            console.error("Erro ao buscar parâmetros:", error);
            notifyError("Erro ao carregar parâmetros");
        } finally {
            setLoadingParams(false);
        }
    }, [document?.pk]);

    // Initial fetch
    useEffect(() => {
        fetchParams();
    }, [fetchParams]);

    // Setup ETARs
    useEffect(() => {
        if (metaData?.etar) {
            const tsAssociate = normalizeZoneName(document?.ts_associate || "");
            const filteredEtars = metaData.etar.filter(etar =>
                normalizeZoneName(etar.ts_entity) === tsAssociate
            );
            setEtars(filteredEtars);
        }
    }, [document?.ts_associate, metaData?.etar]);

    // Modal handlers
    const handleOpenParamModal = useCallback(() => {
        setOpenParamModal(true);
    }, []);

    const handleCloseParamModal = useCallback(() => {
        setOpenParamModal(false);
    }, []);

    // Save parameters
    const handleSaveParams = useCallback(async (updatedParams) => {
        setSavingParams(true);
        try {
            const paramsToSend = updatedParams.map(param => ({
                pk: Number(param.pk),
                value: param.value !== null && param.value !== undefined ? String(param.value) : "",
                memo: String(param.memo || "")
            }));

            await updateDocumentParams(document.pk, paramsToSend);
            setParams(updatedParams);

            if (updateContextParams) {
                updateContextParams(document.pk, updatedParams);
            }

            // Disparar evento para notificar componentes interessados
            window.dispatchEvent(new CustomEvent('document-updated', {
                detail: {
                    documentId: document.pk,
                    type: 'params-updated'
                }
            }));

            // Usar o sistema de refresh inteligente
            smartRefresh('UPDATE_PARAMS', {
                documentId: document.pk
            });

            setOpenParamModal(false);
            notifySuccess("Parâmetros atualizados com sucesso");
        } catch (error) {
            console.error("Error saving parameters:", error);
            notifyError(error.message || "Erro ao atualizar parâmetros");
        } finally {
            setSavingParams(false);
        }
    }, [document.pk, updateContextParams, smartRefresh]);

    // Get display value for parameter
    const getDisplayValueForParam = useCallback((param) => {
        if (!param) return "-";

        switch (param.name) {
            case "Local de descarga/ETAR":
                return metaData?.etar?.find(e => Number(e.pk) === Number(param.value))?.nome || "-";
            case "EE":
                return metaData?.ee?.find(e => Number(e.pk) === Number(param.value))?.nome || "-";
            case "ETAR":
                return metaData?.etar?.find(e => Number(e.pk) === Number(param.value))?.nome || "-";
            case "Método de pagamento":
                return metaData?.payment_method?.find(m => Number(m.pk) === Number(param.value))?.value || "-";
            default:
                if (isBooleanParam(param.name)) {
                    // IMPORTANTE: Manter comportamento original
                    if (param.value === "1") return "Sim";
                    if (param.value === "0") return "Não";
                    return "-"; // null, vazio ou undefined
                }
                return param.value || "-";
        }
    }, [metaData]);

    // Loading state
    if (loadingParams) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} variant="rectangular" width="100%" height={80} />
                ))}
            </Box>
        );
    }

    // No parameters
    if (!params?.length) {
        return (
            <Box textAlign="center" py={3}>
                <Typography variant="body1" color="text.secondary">
                    Sem parâmetros disponíveis para este documento
                </Typography>
            </Box>
        );
    }

    // Main render
    return (
        <>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Parâmetros do Documento</Typography>
                {isAssignedToMe && (
                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={handleOpenParamModal}
                    >
                        Editar Parâmetros
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                <Table sx={{ minWidth: 650 }} size="medium">
                    <TableHead>
                        <TableRow sx={{ bgcolor: theme.palette.grey[100] }}>
                            <TableCell>Parâmetro</TableCell>
                            <TableCell>Valor</TableCell>
                            <TableCell>Observações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {params.map((param) => {
                            const valueDisplay = getDisplayValueForParam(param);
                            return (
                                <TableRow key={param.pk}>
                                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                                        {param.name}
                                    </TableCell>
                                    <TableCell>
                                        {isBooleanParam(param.name) ? (
                                            param.value === "1" || param.value === "0" ? (
                                                <Chip
                                                    label={valueDisplay}
                                                    color={param.value === "1" ? "success" : "default"}
                                                    size="small"
                                                    variant={param.value === "1" ? "filled" : "outlined"}
                                                />
                                            ) : (
                                                valueDisplay
                                            )
                                        ) : (
                                            valueDisplay
                                        )}
                                    </TableCell>
                                    <TableCell>{param.memo || ""}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>

            {openParamModal && (
                <EditParametersModal
                    open={openParamModal}
                    onClose={handleCloseParamModal}
                    params={params}
                    onSave={handleSaveParams}
                    metaData={metaData}
                    etars={etars}
                    saving={savingParams}
                />
            )}
        </>
    );
};

// Edit Parameters Modal Component
const EditParametersModal = React.memo(({
    open,
    onClose,
    params,
    onSave,
    metaData = {},
    etars = [],
    saving = false
}) => {
    const [localParams, setLocalParams] = useState([]);
    const [filteredEtars, setFilteredEtars] = useState([]);

    useEffect(() => {
        if (open && params?.length) {
            setLocalParams(params.map(param => ({ ...param })));
        }
    }, [open, params]);

    // Garantir que temos as ETARs corretas com base no TS associado
    useEffect(() => {
        if (etars?.length) {
            setFilteredEtars(etars);
        }
    }, [etars]);

    const handleParamChange = useCallback((paramPk, field, newValue) => {
        setLocalParams(prev => prev.map(param =>
            param.pk === paramPk ? { ...param, [field]: newValue } : param
        ));
    }, []);

    const handleSave = useCallback(() => {
        onSave(localParams);
    }, [localParams, onSave]);

    // Função para obter o nome do valor selecionado
    const getSelectedName = useCallback((paramName, value) => {
        if (!value) return "";

        switch (paramName) {
            case "Local de descarga/ETAR":
            case "ETAR":
                return metaData?.etar?.find(e => String(e.pk) === String(value))?.nome || "";
            case "EE":
                return metaData?.ee?.find(e => String(e.pk) === String(value))?.nome || "";
            case "Método de pagamento":
                return metaData?.payment_method?.find(m => String(m.pk) === String(value))?.value || "";
            default:
                return value;
        }
    }, [metaData]);

    if (!localParams?.length) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xl"
            PaperProps={{
                sx: {
                    maxHeight: '95vh',
                    height: { sm: '80vh', md: '70vh' }
                }
            }}
        >
            <DialogTitle>Editar Parâmetros</DialogTitle>
            <DialogContent dividers>
                {localParams.map((param) => (
                    <Box key={param.pk} mb={3}>
                        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                            {param.name}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: '1fr',
                                sm: '1fr 1fr',
                                md: '1fr 1.5fr'
                            },
                            gap: 3,
                            alignItems: 'flex-start'
                        }}>
                            {param.name === "Local de descarga/ETAR" || param.name === "ETAR" ? (
                                <FormControl fullWidth>
                                    <InputLabel>ETAR</InputLabel>
                                    <Select
                                        value={param.value || ""}
                                        onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                        label="ETAR"
                                        size="medium"
                                        displayEmpty
                                    >
                                        <MenuItem value="">
                                            <em>Selecione uma ETAR</em>
                                        </MenuItem>
                                        {filteredEtars.map((etar) => (
                                            <MenuItem key={etar.pk} value={String(etar.pk)}>
                                                {etar.nome}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {param.value && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                            Selecionado: {getSelectedName(param.name, param.value)}
                                        </Typography>
                                    )}
                                </FormControl>
                            ) : param.name === "EE" && metaData?.ee ? (
                                <FormControl fullWidth>
                                    <InputLabel>Estação Elevatória</InputLabel>
                                    <Select
                                        value={param.value || ""}
                                        onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                        label="Estação Elevatória"
                                        size="medium"
                                        displayEmpty
                                    >
                                        <MenuItem value="">
                                            <em>Selecione uma EE</em>
                                        </MenuItem>
                                        {metaData.ee?.map((ee) => (
                                            <MenuItem key={ee.pk} value={String(ee.pk)}>
                                                {ee.nome}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {param.value && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                            Selecionado: {getSelectedName(param.name, param.value)}
                                        </Typography>
                                    )}
                                </FormControl>
                            ) : param.name === "Método de pagamento" && metaData?.payment_method ? (
                                <FormControl fullWidth>
                                    <InputLabel>Método de Pagamento</InputLabel>
                                    <Select
                                        value={param.value || ""}
                                        onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                        label="Método de Pagamento"
                                        size="medium"
                                        displayEmpty
                                    >
                                        <MenuItem value="">
                                            <em>Selecione um método</em>
                                        </MenuItem>
                                        {metaData.payment_method.map((method) => (
                                            <MenuItem key={method.pk} value={String(method.pk)}>
                                                {method.value}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {param.value && (
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                                            Selecionado: {getSelectedName(param.name, param.value)}
                                        </Typography>
                                    )}
                                </FormControl>
                            ) : isBooleanParam(param.name) ? (
                                <Box sx={{
                                    pt: 1,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    width: '100%'
                                }}>
                                    <RadioGroup
                                        row
                                        value={param.value === "1" || param.value === "0" ? String(param.value) : ""}
                                        onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                        sx={{ gap: 4 }}
                                    >
                                        <FormControlLabel
                                            value="1"
                                            control={<Radio size="medium" />}
                                            label="Sim"
                                            sx={{ '& .MuiFormControlLabel-label': { fontSize: '1.1rem' } }}
                                        />
                                        <FormControlLabel
                                            value="0"
                                            control={<Radio size="medium" />}
                                            label="Não"
                                            sx={{ '& .MuiFormControlLabel-label': { fontSize: '1.1rem' } }}
                                        />
                                    </RadioGroup>
                                </Box>
                            ) : param.name === "Número de cisternas" ? (
                                <TextField
                                    fullWidth
                                    label="Cisternas"
                                    value={param.value || ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Aceitar apenas números inteiros
                                        if (value === "" || /^\d+$/.test(value)) {
                                            handleParamChange(param.pk, "value", value);
                                        }
                                    }}
                                    variant="outlined"
                                    size="medium"
                                    inputProps={{
                                        pattern: "[0-9]*",
                                        inputMode: "numeric"
                                    }}
                                />
                            ) : (
                                <TextField
                                    fullWidth
                                    label="Valor"
                                    value={param.value || ""}
                                    onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
                                    variant="outlined"
                                    size="medium"
                                />
                            )}
                            <TextField
                                fullWidth
                                label="Observações"
                                value={param.memo || ""}
                                onChange={(e) => handleParamChange(param.pk, "memo", e.target.value)}
                                variant="outlined"
                                size="medium"
                                multiline
                                minRows={1}
                                maxRows={5}
                                InputProps={{
                                    sx: {
                                        minHeight: '56px', // Mesma altura dos outros campos
                                        alignItems: 'flex-start'
                                    }
                                }}
                                sx={{ gridColumn: { sm: 'span 1', md: 'auto' } }}
                            />
                        </Box>
                    </Box>
                ))}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, gap: 2 }}>
                <Button
                    onClick={onClose}
                    startIcon={<CancelIcon />}
                    disabled={saving}
                    size="large"
                    sx={{ minWidth: 120 }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                    variant="contained"
                    disabled={saving}
                    size="large"
                    sx={{ minWidth: 150 }}
                >
                    {saving ? "Guardando..." : "Guardar Alterações"}
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default ParametersTab;