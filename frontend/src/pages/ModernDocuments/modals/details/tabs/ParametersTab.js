import React, { useState, useEffect } from 'react';
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
    Alert
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
} from '@mui/icons-material';

// Import services
import { getDocumentTypeParams, updateDocumentParams } from '../../../../../services/documentService';
import { useDocumentsContext } from '../../../../ModernDocuments/context/DocumentsContext';
import {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning
} from '../../../../../components/common/Toaster/ThemedToaster';

// Helpers
const normalizeZoneName = (zoneName) => {
    if (!zoneName) return "";
    return zoneName.replace(/^Município de /, "").trim();
};

const isBooleanParam = (name) => {
    return (
        name === "Gratuito" ||
        name === "Existência de sanemanto até 20 m" ||
        name === "Existência de rede de água" ||
        name === "Urgência" ||
        name === "Existência de saneamento até 20 m"
    );
};

const ParametersTab = ({ document, metaData, isAssignedToMe = false }) => {
    const theme = useTheme();
    const { showNotification } = useDocumentsContext();

    // States
    const [params, setParams] = useState([]);
    const [loadingParams, setLoadingParams] = useState(true);
    const [openParamModal, setOpenParamModal] = useState(false);
    const [etars, setEtars] = useState([]);

    // Fetch parameters
    const fetchParams = async () => {
        setLoadingParams(true);
        try {
            if (document && document.pk) {
                const response = await getDocumentTypeParams(document.pk);
                const fetchedParams = response.params || [];
                setParams(fetchedParams);
            }
        } catch (error) {
            console.error("Erro ao buscar parâmetros:", error);
            notifyError("Erro ao carregar parâmetros");
            if (showNotification) {
                showNotification("Erro ao carregar parâmetros", "error");
            }
        } finally {
            setLoadingParams(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        if (document?.pk) {
            fetchParams();
        }

        // Initial load of ETARs
        if (metaData?.etar) {
            // Pre-filter ETARs based on document's ts_associate
            const tsAssociate = normalizeZoneName(document?.ts_associate || "");
            const filteredEtars = metaData.etar.filter(etar =>
                normalizeZoneName(etar.ts_entity) === tsAssociate
            );
            setEtars(filteredEtars);
        }
    }, [document, metaData]);

    // Open edit modal
    const handleOpenParamModal = () => {
        setOpenParamModal(true);
    };

    // Close edit modal
    const handleCloseParamModal = () => {
        setOpenParamModal(false);
    };

    // Função para salvar parâmetros
    const handleSaveParams = async (updatedParams) => {
        try {
            // Prepare parameters in the exact format backend expects
            const paramsToSend = updatedParams.map(param => ({
                pk: Number(param.pk),
                value: param.value !== null && param.value !== undefined
                    ? (isBooleanParam(param.name)
                        ? (param.value === true || param.value === "1" ? "1" : "0")
                        : String(param.value))
                    : "",
                memo: param.memo ? String(param.memo) : ""
            }));
            // Debug the payload before sending
            // console.log("Sending params:", paramsToSend);

            // Passar diretamente o array de parâmetros, não o objeto com propriedade 'params'
            const response = await updateDocumentParams(document.pk, paramsToSend);

            if (!response.success) {
                throw new Error(response.error || "Failed to update parameters");
            }

            setOpenParamModal(false);
            notifySuccess("Paramteros atualizados com sucesso");

            // Refresh the parameters list
            fetchParams();

        } catch (error) {
            console.error("Error saving parameters:", error);
            const errorMsg = error.response?.data?.error ||
                error.message ||
                "Error updating parameters";
            notifyError(errorMsg);
        }
    };

    // Get display value for parameter
    const getDisplayValueForParam = (param) => {
        if (!param) return "-";
        let valueDisplay = "-";

        if (param.name === "Local de descarga/ETAR" && metaData?.etar) {
            valueDisplay = metaData.etar.find(
                (etar) => Number(etar.pk) === Number(param.value)
            )?.nome || "-";
        } else if (param.name === "EE" && metaData?.ee) {
            const eeValue = metaData.ee.find(
                (ee) => Number(ee.pk) === Number(param.value)
            );
            valueDisplay = eeValue ? eeValue.nome : "-";
        } else if (param.name === "ETAR" && metaData?.etar) {
            const etarValue = metaData.etar.find(
                (etar) => Number(etar.pk) === Number(param.value)
            );
            valueDisplay = etarValue ? etarValue.nome : "-";
        } else if (param.name === "Método de pagamento" && metaData?.payment_method) {
            const paymentMethod = metaData.payment_method.find(
                (method) => Number(method.pk) === Number(param.value)
            );
            valueDisplay = paymentMethod ? paymentMethod.value : "-";
        } else if (isBooleanParam(param.name)) {
            valueDisplay = param.value === "1" ? "Sim" : param.value === "0" ? "Não" : "-";
        } else if (param.value !== null && param.value !== undefined) {
            valueDisplay = param.value;
        }

        return valueDisplay;
    };

    // Render loading skeleton
    if (loadingParams) {
        return (
            <Box display="flex" flexDirection="column" gap={2} py={2}>
                <Skeleton variant="rectangular" width="100%" height={60} />
                <Skeleton variant="rectangular" width="100%" height={80} />
                <Skeleton variant="rectangular" width="100%" height={80} />
                <Skeleton variant="rectangular" width="100%" height={80} />
            </Box>
        );
    }

    // No parameters
    if (!params || params.length === 0) {
        return (
            <Box textAlign="center" py={3}>
                <Typography variant="body1" color="text.secondary">
                    Sem parâmetros disponíveis para este documento
                </Typography>
            </Box>
        );
    }

    // Render parameters table
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
                        <TableRow sx={{
                            bgcolor: theme.palette.mode === 'dark'
                                ? theme.palette.grey[100]
                                : theme.palette.grey[100]
                        }}>
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
                                            <Chip
                                                label={valueDisplay}
                                                color={param.value === "1" ? "success" : "default"}
                                                size="small"
                                                variant={param.value === "1" ? "filled" : "outlined"}
                                            />
                                        ) : (
                                            valueDisplay
                                        )}
                                    </TableCell>
                                    <TableCell>{param.memo || "-"}</TableCell>
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
                />
            )}
        </>
    );
};

// Edit Parameters Modal Component (isolado para evitar re-renderizações)
const EditParametersModal = React.memo(({
    open,
    onClose,
    params,
    onSave,
    metaData = {},
    etars = []
}) => {
    const [localParams, setLocalParams] = useState([]);

    // Initialize local parameters when the modal opens
    useEffect(() => {
        if (open && params && params.length > 0) {
            setLocalParams(JSON.parse(JSON.stringify(params)));
        }
    }, [open, params]);

    const handleParamChange = (paramPk, field, newValue) => {
        setLocalParams((prevParams) =>
            prevParams.map((param) =>
                param.pk === paramPk ? { ...param, [field]: newValue } : param
            )
        );
    };

    const handleSave = () => {
        onSave(localParams);
    };

    // Guard against rendering before localParams is initialized
    if (!localParams || localParams.length === 0) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
        >
            <DialogTitle>Editar Parâmetros</DialogTitle>
            <DialogContent dividers>
                {localParams.map((param) => (
                    <Box key={param.pk} mb={3}>
                        <Typography variant="subtitle1" fontWeight="medium">
                            {param.name}
                        </Typography>
                        <Divider sx={{ my: 1 }} />

                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2, mb: 1, gap: 2 }}>
                            {param.name === "Local de descarga/ETAR" ? (
                                <FormControl sx={{ minWidth: '45%' }}>
                                    <InputLabel id={`etar-label-${param.pk}`}>ETAR</InputLabel>
                                    <Select
                                        labelId={`etar-label-${param.pk}`}
                                        value={param.value || ""}
                                        onChange={(e) =>
                                            handleParamChange(param.pk, "value", e.target.value ? parseInt(e.target.value, 10) : "")
                                        }
                                        label="ETAR"
                                        notched
                                        size="medium"
                                    >
                                        <MenuItem value="" disabled>
                                            <em>Selecione uma ETAR</em>
                                        </MenuItem>
                                        {etars && etars.length > 0 ? (
                                            etars.map((etar) => (
                                                <MenuItem key={etar.pk} value={etar.pk}>
                                                    {etar.nome}
                                                </MenuItem>
                                            ))
                                        ) : (
                                            <MenuItem disabled>Nenhuma ETAR disponível</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                            ) : param.name === "Método de pagamento" && metaData?.payment_method ? (
                                <FormControl sx={{ minWidth: '45%' }}>
                                    <InputLabel id={`payment-method-label-${param.pk}`}>Método de Pagamento</InputLabel>
                                    <Select
                                        labelId={`payment-method-label-${param.pk}`}
                                        value={param.value || ""}
                                        onChange={(e) =>
                                            handleParamChange(param.pk, "value", e.target.value ? parseInt(e.target.value, 10) : "")
                                        }
                                        label="Método de Pagamento"
                                        notched
                                        size="medium"
                                    >
                                        <MenuItem value="" disabled>
                                            <em>Selecione um método de pagamento</em>
                                        </MenuItem>
                                        {metaData.payment_method.map((method) => (
                                            <MenuItem key={method.pk} value={method.pk}>
                                                {method.value}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : isBooleanParam(param.name) ? (
                                <Box sx={{ minWidth: '45%' }}>
                                    <RadioGroup
                                        row
                                        value={param.value !== null ? String(param.value) : ""}
                                        onChange={(e) =>
                                            handleParamChange(param.pk, "value", parseInt(e.target.value, 10))
                                        }
                                    >
                                        <FormControlLabel value="1" control={<Radio />} label="Sim" />
                                        <FormControlLabel value="0" control={<Radio />} label="Não" />
                                    </RadioGroup>
                                </Box>
                            ) : (
                                <TextField
                                    label="Valor"
                                    value={param.value || ""}
                                    onChange={(e) =>
                                        handleParamChange(param.pk, "value", e.target.value)
                                    }
                                    sx={{ minWidth: '45%' }}
                                    variant="outlined"
                                    size="medium"
                                />
                            )}

                            <TextField
                                label="Observações"
                                value={param.memo || ""}
                                onChange={(e) =>
                                    handleParamChange(param.pk, "memo", e.target.value)
                                }
                                fullWidth
                                variant="outlined"
                                size="medium"
                                multiline
                                rows={2}
                            />
                        </Box>
                    </Box>
                ))}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={onClose}
                    startIcon={<CancelIcon />}
                    color="inherit"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    startIcon={<SaveIcon />}
                    variant="contained"
                    color="primary"
                >
                    Guardar Alterações
                </Button>
            </DialogActions>
        </Dialog>
    );
});

export default ParametersTab;