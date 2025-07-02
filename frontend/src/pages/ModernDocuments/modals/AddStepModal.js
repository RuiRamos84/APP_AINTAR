import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    IconButton,
    Grid,
    CircularProgress,
    Alert,
    Chip,
    Stack,
    List,
    DialogContentText
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import {
    Close as CloseIcon,
    CloudUpload as UploadIcon,
    Send as SendIcon,
    Description as DescriptionIcon,
    PictureAsPdf as PdfIcon,
    Image as ImageIcon,
    TableChart as TableIcon,
    Email as EmailIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

import { addDocumentStep, addDocumentAnnex, checkVacationStatus } from '../../../services/documentService';
import { useSocket } from '../../../contexts/SocketContext';
import { notifySuccess, notifyError, notifyWarning } from "../../../components/common/Toaster/ThemedToaster.js";
import { FilePreviewItem, generateFilePreview } from '../utils/fileUtils';
import { getValidTransitions, getAvailableSteps, getAvailableUsersForStep, canStayInSameStep, getUsersForTransfer } from '../utils/workflowUtils';
import { DocumentEventManager, DOCUMENT_EVENTS } from '../utils/documentEventSystem';

const AddStepModal = ({ open, onClose, document, metaData, fetchDocuments }) => {
    const { emit, isConnected, refreshNotifications } = useSocket();

    // ===== ESTADOS =====
    const [stepData, setStepData] = useState({
        pk: null,
        what: '',
        who: '',
        memo: '',
        tb_document: document ? document.pk : null,
    });

    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [vacationAlert, setVacationAlert] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);

    // ===== CONFIGURAÇÕES =====
    const fileTypes = [
        { type: 'PDF', icon: <PdfIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'error' },
        { type: 'Imagens', icon: <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'success' },
        { type: 'Word', icon: <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' },
        { type: 'Excel', icon: <TableIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'primary' },
        { type: 'Email', icon: <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' }
    ];

    // ===== COMPUTED VALUES =====
    // Calcular passos disponíveis com base no workflow
    const availableSteps = useMemo(() => {
        if (!document || !metaData?.step_transitions) {
            // Fallback para todos os passos se não há workflow definido
            return metaData?.what || [];
        }
        return getAvailableSteps(document, metaData);
    }, [document, metaData]);

    // Calcular utilizadores disponíveis para o passo selecionado
    const availableUsers = useMemo(() => {
        // ✅ CORREÇÃO: Verificar explicitamente se stepData.what é null/undefined/empty, mas PERMITIR 0
        if (stepData.what === null || stepData.what === undefined || stepData.what === '' || !document || !metaData?.step_transitions) {
            return metaData?.who || [];
        }
        // ✅ IMPORTANTE: getAvailableUsersForStep deve receber o valor original (incluindo 0)
        return getAvailableUsersForStep(stepData.what, document, metaData);
    }, [stepData.what, document, metaData]);

    // Verificar se há transições válidas configuradas
    const hasValidWorkflow = useMemo(() => {
        if (!document || !metaData?.step_transitions) return false;
        const validTransitions = getValidTransitions(document, metaData);
        return validTransitions.length > 0;
    }, [document, metaData]);

    // ===== EFFECTS =====
    // Reset do formulário quando abrir o modal
    useEffect(() => {
        if (open) {
            setStepData({
                what: '',
                who: '',
                memo: '',
                tb_document: document ? document.pk : null,
            });
            setFiles([]);
            setErrors({});
            setVacationAlert(false);
        }
    }, [open, document]);

    // Auto-selecionar estado se só há uma opção
    useEffect(() => {
        if (availableSteps.length === 1 && (stepData.what !== 0 && !stepData.what)) {
            setStepData(prev => ({ ...prev, what: availableSteps[0].pk }));
        }
    }, [availableSteps, stepData.what]);

    // Auto-selecionar utilizador se só há uma opção
    useEffect(() => {
        // ✅ CORREÇÃO: Permite auto-seleção quando what=0
        if (availableUsers.length === 1 && (stepData.what === 0 || stepData.what) && (stepData.who !== 0 && !stepData.who)) {
            setStepData(prev => ({
                ...prev,
                who: availableUsers[0].pk,
                whoName: `${availableUsers[0].name} (${availableUsers[0].username})`
            }));
        }
    }, [availableUsers, stepData.what, stepData.who]);

    // ===== DROPZONE CONFIGURATION =====
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + files.length > 5) {
            setErrors(prev => ({
                ...prev,
                files: 'Pode adicionar no máximo 5 ficheiros por vez.'
            }));
            return;
        }

        const newFiles = await Promise.all(
            acceptedFiles.map(async (file) => {
                const preview = await generateFilePreview(file);
                return {
                    file,
                    preview,
                    description: '',
                };
            })
        );

        setFiles(prev => [...prev, ...newFiles]);
        setErrors(prev => ({ ...prev, files: '' }));
    }, [files.length]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'message/rfc822': ['.eml'],
            'application/vnd.ms-outlook': ['.msg'],
            'application/vnd.ms-officetheme': ['.oft']
        },
        maxFiles: 5,
        multiple: true
    });

    // Suporte ao colar arquivos
    const onPaste = useCallback((event) => {
        const clipboardItems = event.clipboardData.items;
        const pastedFiles = [];
        for (const item of clipboardItems) {
            if (item.kind === "file") {
                const file = item.getAsFile();
                pastedFiles.push(file);
            }
        }
        if (pastedFiles.length > 0) {
            event.preventDefault();
            onDrop(pastedFiles);
        }
    }, [onDrop]);

    // ===== EVENT HANDLERS =====
    // Handler principal para mudanças no formulário
    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === 'who') {
            // ✅ CORREÇÃO: Converter value para string para comparação
            const selectedUser = metaData?.who?.find(user => user.pk.toString() === value.toString());

            setStepData(prev => ({
                ...prev,
                [name]: value,
                whoName: selectedUser ? `${selectedUser.name} (${selectedUser.username})` : ''
            }));

            // Verificar status de férias
            try {
                const vacationStatus = await checkVacationStatus(value);
                if (vacationStatus === 1) {
                    setVacationAlert(true);
                }
            } catch (error) {
                console.error("Erro ao verificar status de férias:", error);
            }
        } else if (name === 'what') {
            // Reset do utilizador quando mudar de passo
            setStepData(prev => ({
                ...prev,
                [name]: value,
                who: '', // Reset do utilizador
                whoName: ''
            }));
        } else {
            setStepData(prev => ({ ...prev, [name]: value }));
        }

        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Handlers para ficheiros
    const handleFileRemove = (index) => {
        const updatedFiles = [...files];
        updatedFiles.splice(index, 1);
        setFiles(updatedFiles);
    };

    const handleFileDescriptionChange = (index, value) => {
        const updatedFiles = [...files];
        updatedFiles[index].description = value;
        setFiles(updatedFiles);
    };

    // ===== VALIDATION =====
    const validateForm = () => {
        const newErrors = {};

        // ✅ CORREÇÃO: Permitir 0 como valor válido
        if (stepData.what !== 0 && !stepData.what) newErrors.what = 'Estado é obrigatório';
        if (stepData.who !== 0 && !stepData.who) newErrors.who = 'Destinatário é obrigatório';
        if (!stepData.memo) newErrors.memo = 'Observações são obrigatórias';

        // Validação para arquivos
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                if (!files[i].description.trim()) {
                    newErrors.files = 'Todos os ficheiros devem ter uma descrição';
                    break;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ===== MODAL HANDLERS =====
    // Manipulação de fechamento
    const handleModalClose = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        if (stepData.who || stepData.what || stepData.memo || files.length > 0) {
            setConfirmClose(true);
        } else {
            onClose(false);
        }
    };

    // ===== SUBMIT HANDLER =====
    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);

        try {
            // Anexos primeiro
            if (files.length > 0) {
                const formData = new FormData();
                formData.append('tb_document', document.pk);
                files.forEach((fileItem) => {
                    formData.append('files', fileItem.file);
                    formData.append('descr', fileItem.description);
                });
                await addDocumentAnnex(formData);
            }

            // Adicionar passo
            const stepDataObj = {
                tb_document: document.pk,
                what: stepData.what === 0 ? "0" : stepData.what,
                who: stepData.who,
                memo: stepData.memo
            };

            // Capturar resposta do passo para obter novo ID
            const stepResponse = await addDocumentStep(document.pk, stepDataObj);

            // Socket
            if (isConnected) {
                emit("new_step_added", {
                    orderId: document.regnumber,
                    userId: stepData.who,
                    documentId: document.pk
                });
                refreshNotifications();
            }

            if (typeof fetchDocuments === "function") {
                await fetchDocuments();
            }

            // Emitir evento com informação do novo documento
            const eventData = {
                type: 'step-added',
                newStep: stepDataObj,
                originalDocumentId: document.pk
            };

            // Se a resposta contém novo ID, incluir
            if (stepResponse?.document?.pk && stepResponse.document.pk !== document.pk) {
                eventData.newDocumentData = stepResponse.document;
                eventData.newDocumentId = stepResponse.document.pk;
            }

            DocumentEventManager.emit(DOCUMENT_EVENTS.STEP_ADDED, document.pk, eventData);

            // Compatibilidade
            window.dispatchEvent(new CustomEvent('document-updated', {
                detail: {
                    documentId: document.pk,
                    type: 'step-added',
                    ...eventData
                }
            }));

            notifySuccess("Passo adicionado com sucesso");
            onClose(true);
        } catch (error) {
            console.error('Erro ao adicionar passo:', error);

            let errorMessage = "Erro ao adicionar passo";
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }

            notifyError(errorMessage);
            setErrors(prev => ({ ...prev, submit: errorMessage }));
        } finally {
            setLoading(false);
        }
    };

    // ===== RENDER =====
    return (
        <>
            <Dialog
                open={open}
                onClose={handleModalClose}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                            <SendIcon sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                Novo movimento e anexos no Pedido: {document?.regnumber}
                            </Typography>
                        </Box>
                        <IconButton
                            edge="end"
                            color="inherit"
                            onClick={handleModalClose}
                            aria-label="close"
                            disabled={loading}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent dividers onPaste={onPaste}>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Adicione um novo passo para encaminhar ou avançar este pedido no fluxo de trabalho.
                                Também pode adicionar anexos ao pedido.
                            </Alert>
                        </Grid>

                        {/* Alerta se não há workflow configurado */}
                        {!hasValidWorkflow && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    <Box display="flex" alignItems="center">
                                        <WarningIcon sx={{ mr: 1 }} />
                                        <Typography variant="body2">
                                            Workflow não configurado para este tipo de documento.
                                            Todos os passos e utilizadores estão disponíveis.
                                        </Typography>
                                    </Box>
                                </Alert>
                            </Grid>
                        )}

                        {/* ===== SELECT ESTADO ===== */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required error={!!errors.what}>
                                <InputLabel id="step-state-label">Estado</InputLabel>
                                <Select
                                    labelId="step-state-label"
                                    name="what"
                                    value={stepData.what}
                                    onChange={handleChange}
                                    label="Estado"
                                    disabled={loading}
                                    renderValue={(selected) => {
                                        // ✅ CORREÇÃO: Encontrar o step pelo pk, tratando 0 corretamente
                                        const selectedStep = availableSteps.find(step => step.pk === selected);
                                        return selectedStep ? selectedStep.step : '';
                                    }}
                                >
                                    {availableSteps.map(status => (
                                        <MenuItem key={status.pk} value={status.pk}>
                                            {status.step}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.what && (
                                    <Typography variant="caption" color="error">
                                        {errors.what}
                                    </Typography>
                                )}
                                {hasValidWorkflow && availableSteps.length === 0 && (
                                    <Typography variant="caption" color="warning.main">
                                        Nenhum passo disponível para o estado actual
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        {/* ===== SELECT UTILIZADOR ===== */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required error={!!errors.who}>
                                <InputLabel id="step-who-label">Para quem</InputLabel>
                                <Select
                                    labelId="step-who-label"
                                    name="who"
                                    value={stepData.who}
                                    onChange={handleChange}
                                    label="Para quem"
                                    disabled={loading || (stepData.what !== 0 && !stepData.what)}
                                    renderValue={(selected) => {
                                        // ✅ CORREÇÃO: Encontrar o user pelo pk, tratando 0 corretamente
                                        const selectedUser = availableUsers.find(user => user.pk === selected);
                                        return selectedUser ? selectedUser.name : '';
                                    }}
                                >
                                    {availableUsers.map(user => (
                                        <MenuItem key={user.pk} value={user.pk}>
                                            {user.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                {errors.who && (
                                    <Typography variant="caption" color="error">
                                        {errors.who}
                                    </Typography>
                                )}
                                {/* ✅ CORREÇÃO: Mostrar warning quando há estado selecionado mas nenhum utilizador */}
                                {(stepData.what === 0 || stepData.what) && availableUsers.length === 0 && (
                                    <Typography variant="caption" color="warning.main">
                                        Nenhum utilizador disponível para este passo
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        {/* ===== OBSERVAÇÕES ===== */}
                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="Observações"
                                name="memo"
                                multiline
                                rows={4}
                                value={stepData.memo}
                                onChange={handleChange}
                                error={!!errors.memo}
                                helperText={errors.memo}
                                required
                                disabled={loading}
                            />
                        </Grid>

                        {/* ===== ANEXOS ===== */}
                        <Grid size={{ xs: 12 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Anexos (opcional)
                            </Typography>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" fontSize="0.875rem" color="text.secondary" gutterBottom>
                                    Formatos aceites:
                                </Typography>
                                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                                    {fileTypes.map((type, index) => (
                                        <Chip
                                            key={index}
                                            icon={type.icon}
                                            label={type.type}
                                            size="small"
                                            color={type.color}
                                            variant="outlined"
                                        />
                                    ))}
                                </Stack>
                            </Box>

                            {files.length < 5 ? (
                                <Box
                                    {...getRootProps()}
                                    sx={{
                                        border: isDragActive
                                            ? `2px dashed #1976d2`
                                            : `2px dashed #e0e0e0`,
                                        borderRadius: 1,
                                        p: 3,
                                        textAlign: 'center',
                                        bgcolor: isDragActive
                                            ? 'rgba(25, 118, 210, 0.04)'
                                            : 'background.paper',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: 'rgba(0, 0, 0, 0.04)',
                                        }
                                    }}
                                >
                                    <input {...getInputProps()} disabled={loading} />
                                    <UploadIcon
                                        sx={{
                                            fontSize: 40,
                                            mb: 1,
                                            color: isDragActive
                                                ? '#1976d2'
                                                : 'text.secondary'
                                        }}
                                    />

                                    <Typography variant="body1" gutterBottom>
                                        {isDragActive
                                            ? 'Largue os ficheiros aqui...'
                                            : 'Arraste e largue ficheiros aqui, cole ou clique para seleccionar'
                                        }
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        Suporta PDF, imagens, documentos Office e emails
                                    </Typography>

                                    {errors.files && (
                                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                            {errors.files}
                                        </Typography>
                                    )}
                                </Box>
                            ) : (
                                <Typography variant="subtitle1" color="error" textAlign="center" mt={2}>
                                    Está a submeter o número máximo de anexos por movimento.
                                </Typography>
                            )}
                        </Grid>

                        {/* ===== LISTA DE FICHEIROS ===== */}
                        {files.length > 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Ficheiros seleccionados ({files.length})
                                </Typography>
                                <List>
                                    {files.map((fileItem, index) => (
                                        <FilePreviewItem
                                            key={`${fileItem.file.name}-${index}`}
                                            file={fileItem.file}
                                            description={fileItem.description}
                                            onDescriptionChange={(value) => handleFileDescriptionChange(index, value)}
                                            onRemove={() => handleFileRemove(index)}
                                            disabled={loading}
                                            previewUrl={fileItem.preview}
                                        />
                                    ))}
                                </List>
                            </Grid>
                        )}

                        {/* ===== ERROS DE SUBMISSÃO ===== */}
                        {errors.submit && (
                            <Grid size={{ xs: 12 }}>
                                <Alert
                                    severity={errors.submitType === "validation" ? "warning" : "error"}
                                    sx={{ mb: 2 }}
                                >
                                    {errors.submit}
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                {/* ===== AÇÕES DO DIÁLOGO ===== */}
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={handleModalClose}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={loading || (stepData.what !== 0 && !stepData.what) || (stepData.who !== 0 && !stepData.who)}
                        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                    >
                        {loading ? 'A enviar...' : 'Guardar e Enviar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ===== ALERTA DE FÉRIAS ===== */}
            <Dialog open={vacationAlert} onClose={() => setVacationAlert(false)}>
                <DialogTitle>Alerta de Férias</DialogTitle>
                <DialogContent>
                    <Typography>
                        A pessoa para quem está a enviar o pedido encontra-se de férias e
                        pode não ver o pedido em tempo útil!
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVacationAlert(false)} color="primary" autoFocus>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ===== DIÁLOGO DE CONFIRMAÇÃO DE FECHAMENTO ===== */}
            <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
                <DialogTitle>Descartar Alterações?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Existem alterações não guardadas. Deseja realmente sair sem guardar?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClose(false)} color="primary" autoFocus>
                        Não
                    </Button>
                    <Button
                        onClick={() => {
                            setConfirmClose(false);
                            if (document.activeElement instanceof HTMLElement) {
                                document.activeElement.blur();
                            }
                            onClose(false);
                        }}
                        color="primary"
                        autoFocus
                    >
                        Sim
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AddStepModal;