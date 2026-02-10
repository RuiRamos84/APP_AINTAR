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
    CircularProgress,
    Switch
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';

// Import services
import { getDocumentTypeParams, updateDocumentParams } from '../../../../../services/documentService';
import { useDocumentsContext } from '../../../context/DocumentsContext';
import { useDocumentActions } from '../../../context/DocumentActionsContext';
import {
    notifySuccess,
    notifyError,
} from '../../../../../components/common/Toaster/ThemedToaster';
import { useSmartRefresh } from '../../../hooks/useSmartRefresh';

// ============================================
// CONSTANTES DE TIPOS DE PARÂMETROS
// ============================================
const PARAM_TYPES = {
    NUMBER: 1,      // Input numérico
    TEXT: 2,        // Input de texto
    REFERENCE: 3,   // Select/dropdown (referência a outra tabela)
    BOOLEAN: 4      // Switch/checkbox (Sim/Não)
};

// Helpers
const normalizeZoneName = (zoneName) => {
    if (!zoneName) return "";
    return zoneName.replace(/^Município de /, "").trim();
};

// Fallback para parâmetros sem type definido (compatibilidade)
const isBooleanParamByName = (name) => {
    if (!name) return false;
    const booleanNames = [
        "Gratuito",
        "Urgência",
        "Existência de saneamento até 20 m",
        "Existência de sanemanto até 20 m",
        "Existência de rede de água",
        "Existe pavimento",
        "Existe rede de águas",
        "Existe rede de esgotos",
        "Existe rede de telecomunicações",
        "Existe rede de gás",
        "Existe rede elétrica",
        "Necessita licenciamento",
        "Obra em zona protegida"
    ];
    return booleanNames.some(bp => name.toLowerCase().includes(bp.toLowerCase()));
};

// Verifica se é booleano por type OU por nome (fallback)
const isBooleanParam = (param) => {
    if (param.type === PARAM_TYPES.BOOLEAN) return true;
    if (!param.type && isBooleanParamByName(param.name)) return true;
    return false;
};

// Verifica se é numérico por type OU por nome (fallback)
const isNumberParam = (param) => {
    if (param.type === PARAM_TYPES.NUMBER) return true;
    if (!param.type && param.name === "Número de cisternas") return true;
    return false;
};

// Verifica se é referência (select) - por type ou por nome
const isReferenceParam = (param) => {
    if (param.type === PARAM_TYPES.REFERENCE) return true;
    // Fallback por nome para parâmetros antigos
    if (!param.type) {
        return ["Local de descarga/ETAR", "ETAR", "EE", "Método de pagamento"].includes(param.name);
    }
    return false;
};

const ParametersTab = ({ document, metaData, isAssignedToMe = false, invoiceData = null }) => {
    const theme = useTheme();
    const { } = useDocumentsContext();
    const { updateDocumentParams: updateContextParams, documentParams } = useDocumentActions();

    // Verificar se o pagamento foi feito via SIBS (MBWay ou Multibanco) com sucesso
    const isSibsPaymentCompleted = useMemo(() => {
        if (!invoiceData) return false;
        const paymentStatus = invoiceData.payment_status?.toLowerCase();
        const paymentMethod = invoiceData.payment_method?.toUpperCase();
        return paymentStatus === 'success' &&
               (paymentMethod === 'MBWAY' || paymentMethod === 'MULTIBANCO' || paymentMethod === 'REFERENCE');
    }, [invoiceData]);

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
                console.log("Parâmetros carregados:", fetchedParams);
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
            const paramsToSend = updatedParams.map(param => {
                let value;

                // Se o valor é null, undefined ou vazio, preservar como null
                if (param.value === null || param.value === undefined || param.value === '') {
                    value = null;
                } else if (isBooleanParam(param)) {
                    // Booleanos: converter para "1" ou "0" apenas se tiver valor
                    value = (param.value === "1" || param.value === 1 || param.value === true) ? "1" : "0";
                } else {
                    value = String(param.value);
                }

                return {
                    pk: Number(param.pk),
                    value,
                    memo: String(param.memo || "")
                };
            });

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

        // Verificar por type primeiro, depois fallback por nome
        if (isBooleanParam(param)) {
            if (param.value === "1" || param.value === 1) return "Sim";
            if (param.value === "0" || param.value === 0) return "Não";
            return "-";
        }

        if (isReferenceParam(param)) {
            // Referências - determinar fonte pelo nome (fallback)
            switch (param.name) {
                case "Local de descarga/ETAR":
                case "ETAR":
                    return metaData?.etar?.find(e => Number(e.pk) === Number(param.value))?.nome || "-";
                case "EE":
                    return metaData?.ee?.find(e => Number(e.pk) === Number(param.value))?.nome || "-";
                case "Método de pagamento":
                    return metaData?.payment_method?.find(m => Number(m.pk) === Number(param.value))?.value || "-";
                default:
                    return param.value || "-";
            }
        }

        // NUMBER e TEXT - mostrar valor diretamente
        return param.value || "-";
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
                            const isBoolean = isBooleanParam(param);
                            const hasValue = param.value === "1" || param.value === "0" || param.value === 1 || param.value === 0;

                            return (
                                <TableRow key={param.pk}>
                                    <TableCell component="th" scope="row" sx={{ fontWeight: 'medium' }}>
                                        {param.name}
                                        {/* Debug: mostrar type */}
                                        {process.env.NODE_ENV === 'development' && param.type && (
                                            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                                (type: {param.type})
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {isBoolean && hasValue ? (
                                            <Chip
                                                label={valueDisplay}
                                                color={param.value === "1" || param.value === 1 ? "success" : "default"}
                                                size="small"
                                                variant={param.value === "1" || param.value === 1 ? "filled" : "outlined"}
                                            />
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
                    isSibsPaymentCompleted={isSibsPaymentCompleted}
                />
            )}
        </>
    );
};

// ============================================
// FUNÇÃO DE RENDERIZAÇÃO DINÂMICA POR TYPE
// ============================================
const renderParamInput = (param, handleParamChange, options = {}) => {
    const { metaData, filteredEtars, getSelectedName } = options;

    // TYPE 4: BOOLEAN - Switch Sim/Não
    if (isBooleanParam(param)) {
        return (
            <Box sx={{
                pt: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                width: '100%'
            }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={param.value === "1" || param.value === 1}
                            onChange={(e) => handleParamChange(param.pk, "value", e.target.checked ? "1" : "0")}
                            color="primary"
                            size="medium"
                        />
                    }
                    label={param.value === "1" || param.value === 1 ? "Sim" : "Não"}
                    sx={{
                        '& .MuiFormControlLabel-label': {
                            fontSize: '1.1rem',
                            fontWeight: 500
                        }
                    }}
                />
            </Box>
        );
    }

    // TYPE 1: NUMBER - Input numérico
    if (isNumberParam(param)) {
        return (
            <TextField
                fullWidth
                label="Valor"
                value={param.value || ""}
                onChange={(e) => {
                    const value = e.target.value;
                    // Aceitar números inteiros e decimais
                    if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
                        handleParamChange(param.pk, "value", value);
                    }
                }}
                variant="outlined"
                size="medium"
                type="text"
                inputProps={{
                    inputMode: "decimal",
                    pattern: "[0-9]*\\.?[0-9]*"
                }}
                InputProps={{
                    endAdornment: param.units ? (
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                            {param.units}
                        </Typography>
                    ) : null
                }}
            />
        );
    }

    // TYPE 3: REFERENCE - Select/Dropdown (fallback por nome)
    if (isReferenceParam(param)) {
        // Determinar qual lista usar baseado no nome
        if (param.name === "Local de descarga/ETAR" || param.name === "ETAR") {
            return (
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
                        {filteredEtars?.map((etar) => (
                            <MenuItem key={etar.pk} value={String(etar.pk)}>
                                {etar.nome}
                            </MenuItem>
                        ))}
                    </Select>
                    {param.value && getSelectedName && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            Selecionado: {getSelectedName(param.name, param.value)}
                        </Typography>
                    )}
                </FormControl>
            );
        }

        if (param.name === "EE" && metaData?.ee) {
            return (
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
                    {param.value && getSelectedName && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                            Selecionado: {getSelectedName(param.name, param.value)}
                        </Typography>
                    )}
                </FormControl>
            );
        }

        if (param.name === "Método de pagamento" && metaData?.payment_method) {
            // Campo sempre desactivado - gerido pelo módulo de pagamentos
            const selectedMethod = metaData.payment_method.find(m => String(m.pk) === String(param.value));
            return (
                <FormControl fullWidth disabled>
                    <InputLabel>Método de Pagamento</InputLabel>
                    <Select
                        value={param.value || ""}
                        label="Método de Pagamento"
                        size="medium"
                        displayEmpty
                        disabled
                    >
                        <MenuItem value="">
                            <em>Não definido</em>
                        </MenuItem>
                        {metaData.payment_method.map((method) => (
                            <MenuItem key={method.pk} value={String(method.pk)}>
                                {method.value}
                            </MenuItem>
                        ))}
                    </Select>
                    <Typography variant="caption" color="info.main" sx={{ mt: 1 }}>
                        {param.value
                            ? `Definido pelo módulo de pagamentos: ${selectedMethod?.value || param.value}`
                            : "Gerido pelo módulo de pagamentos"
                        }
                    </Typography>
                </FormControl>
            );
        }
    }

    // TYPE 2: TEXT (default) - Input de texto
    return (
        <TextField
            fullWidth
            label="Valor"
            value={param.value || ""}
            onChange={(e) => handleParamChange(param.pk, "value", e.target.value)}
            variant="outlined"
            size="medium"
        />
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
    saving = false,
    isSibsPaymentCompleted = false
}) => {
    const [localParams, setLocalParams] = useState([]);
    const [filteredEtars, setFilteredEtars] = useState([]);

    useEffect(() => {
        if (open && params?.length) {
            setLocalParams(params.map(param => {
                const copy = { ...param };
                // Normalizar booleanos: null/undefined/'' → '0'
                if (isBooleanParam(copy) && (copy.value === null || copy.value === undefined || copy.value === '')) {
                    copy.value = '0';
                }
                return copy;
            }));
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
                            {/* Renderização dinâmica baseada no type */}
                            {renderParamInput(param, handleParamChange, {
                                metaData,
                                filteredEtars,
                                getSelectedName,
                                isSibsPaymentCompleted
                            })}
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