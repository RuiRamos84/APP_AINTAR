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
    DialogContentText,
    LinearProgress,
    Fade
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
    Warning as WarningIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';

import { addDocumentStep, addDocumentAnnex, checkVacationStatus } from '../../../services/documentService';
import { useSocket } from '../../../contexts/SocketContext';
import { useDocumentsContext } from '../context/DocumentsContext';
import { useAdvancedDocuments } from '../context/AdvancedDocumentsContext';
import { uxAnalytics } from '../utils/uxAnalytics';
import { notifySuccess, notifyError, notifyWarning } from "../../../components/common/Toaster/ThemedToaster.js";
import { FilePreviewItem, generateFilePreview } from '../utils/fileUtils';
import { getValidTransitions, getAvailableSteps, getAvailableUsersForStep, canStayInSameStep, getUsersForTransfer } from '../utils/workflowUtils';
import { DocumentEventManager, DOCUMENT_EVENTS } from '../utils/documentEventSystem';

// ===== FUNÇÃO AUXILIAR PARA PK = 0 =====
const isValidValue = (value) => {
    return value !== null && value !== undefined && value !== '';
};

const AddStepModal = ({ open, onClose, document, metaData, fetchDocuments }) => {
    const { emit, isConnected, refreshNotifications } = useSocket();
    const { smartUpdateDocument } = useDocumentsContext();
    const { enhancedUpdateDocument, trackOperation } = useAdvancedDocuments();

    // Estados
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

    // NOVO: Estados de UX melhorada
    const [submitProgress, setSubmitProgress] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // Validações workflow avançadas
    const [workflowValidation, setWorkflowValidation] = useState({
        isValid: true,
        message: '',
        type: 'info'
    });

    // Configurações
    const fileTypes = [
        { type: 'PDF', icon: <PdfIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'error' },
        { type: 'Imagens', icon: <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'success' },
        { type: 'Word', icon: <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' },
        { type: 'Excel', icon: <TableIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'primary' },
        { type: 'Email', icon: <EmailIcon fontSize="small" sx={{ mr: 0.5 }} />, color: 'info' }
    ];

    // Validações workflow completas
    const workflowData = useMemo(() => {
        if (!document || !metaData?.step_transitions) {
            return {
                hasWorkflow: false,
                availableSteps: metaData?.what || [],
                availableUsers: metaData?.who || [],
                canTransfer: false,
                validTransitions: []
            };
        }

        const validTransitions = getValidTransitions(document, metaData);
        const availableSteps = getAvailableSteps(document, metaData);
        const canTransfer = canStayInSameStep(document, metaData);

        return {
            hasWorkflow: validTransitions.length > 0,
            availableSteps,
            availableUsers: metaData?.who || [],
            canTransfer,
            validTransitions
        };
    }, [document, metaData]);

    // Utilizadores disponíveis baseados no passo selecionado
    const availableUsers = useMemo(() => {
        if (!isValidValue(stepData.what)) {
            return workflowData.availableUsers;
        }

        // Se é transferência no mesmo passo
        if (stepData.what === document?.what && workflowData.canTransfer) {
            return getUsersForTransfer(document, metaData);
        }

        // Utilizadores específicos para o passo
        return getAvailableUsersForStep(stepData.what, document, metaData);
    }, [stepData.what, document, metaData, workflowData]);

    // ===== VALIDAÇÃO EM TEMPO REAL (CORRIGIDA) =====
    useEffect(() => {
        if (!isValidValue(stepData.what) || !isValidValue(stepData.who) || !workflowData.hasWorkflow) {
            setWorkflowValidation({ isValid: true, message: '', type: 'info' });
            return;
        }

        const currentStep = document?.what;
        const targetStep = stepData.what;
        const targetUser = stepData.who;

        // Se é o mesmo passo = transferência (permitir qualquer utilizador)
        if (targetStep === currentStep) {
            const canTransferToUser = availableUsers.some(u => u.pk === parseInt(targetUser));

            setWorkflowValidation({
                isValid: canTransferToUser,
                message: canTransferToUser
                    ? 'Transferência válida no mesmo estado'
                    : 'Utilizador não disponível',
                type: canTransferToUser ? 'success' : 'error'
            });
            return;
        }

        // Se é passo diferente = transição (respeitar workflow)
        const isValidTransition = workflowData.validTransitions.some(t =>
            t.to_step_pk === targetStep &&
            (Array.isArray(t.client) ? t.client.includes(parseInt(targetUser)) : t.client === parseInt(targetUser))
        );

        setWorkflowValidation({
            isValid: isValidTransition,
            message: isValidTransition
                ? 'Transição válida conforme workflow'
                : 'Transição não permitida pelo workflow',
            type: isValidTransition ? 'success' : 'error'
        });
    }, [stepData.what, stepData.who, document, metaData, workflowData, availableUsers]);

    // Reset quando abrir
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

    // Auto-selecionar se só há uma opção
    useEffect(() => {
        if (workflowData.availableSteps.length === 1 && !isValidValue(stepData.what)) {
            setStepData(prev => ({ ...prev, what: workflowData.availableSteps[0].pk }));
        }
    }, [workflowData.availableSteps, stepData.what]);

    // ===== AUTO-SELECT UTILIZADOR (CORRIGIDO) =====
    useEffect(() => {
        if (availableUsers.length === 1 &&
            isValidValue(stepData.what) &&
            !isValidValue(stepData.who)) {
            setStepData(prev => ({
                ...prev,
                who: availableUsers[0].pk,
                whoName: `${availableUsers[0].name} (${availableUsers[0].username})`
            }));
        }
    }, [availableUsers, stepData.what, stepData.who]);

    // Dropzone
    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length + files.length > 5) {
            setErrors(prev => ({
                ...prev,
                files: 'Máximo 5 ficheiros'
            }));
            return;
        }

        const newFiles = await Promise.all(
            acceptedFiles.map(async (file) => {
                const preview = await generateFilePreview(file);
                return { file, preview, description: '' };
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
            'application/vnd.ms-outlook': ['.msg']
        },
        maxFiles: 5,
        multiple: true
    });

    // Handler principal
    const handleChange = async (e) => {
        const { name, value } = e.target;

        if (name === 'who') {
            const selectedUser = metaData?.who?.find(user => user.pk.toString() === value.toString());

            setStepData(prev => ({
                ...prev,
                [name]: value,
                whoName: selectedUser ? `${selectedUser.name} (${selectedUser.username})` : ''
            }));

            // Verificação férias melhorada
            try {
                const vacationStatus = await checkVacationStatus(value);
                if (vacationStatus === 1) {
                    setVacationAlert(true);
                }
            } catch (error) {
                console.error("Erro verificação férias:", error);
            }
        } else if (name === 'what') {
            setStepData(prev => ({
                ...prev,
                [name]: value,
                who: '',
                whoName: ''
            }));
        } else {
            setStepData(prev => ({ ...prev, [name]: value }));
        }

        setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Handlers ficheiros
    const handleFileRemove = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileDescriptionChange = (index, value) => {
        setFiles(prev => {
            const updated = [...prev];
            updated[index].description = value;
            return updated;
        });
    };

    // ===== VALIDAÇÃO COMPLETA (CORRIGIDA) =====
    const validateForm = () => {
        const newErrors = {};

        if (!isValidValue(stepData.what)) newErrors.what = 'Estado obrigatório';
        if (!isValidValue(stepData.who)) newErrors.who = 'Destinatário obrigatório';
        if (!stepData.memo) newErrors.memo = 'Observações obrigatórias';

        // Validar workflow se activo
        if (workflowData.hasWorkflow && !workflowValidation.isValid) {
            newErrors.workflow = workflowValidation.message;
        }

        // Validar ficheiros
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                if (!files[i].description.trim()) {
                    newErrors.files = 'Todos os ficheiros precisam descrição';
                    break;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ===== SUBMIT MELHORADO com UX otimizada =====
    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);
        setSubmitProgress(10);

        const startTime = Date.now();

        try {
            // Progresso: Anexos
            if (files.length > 0) {
                setSubmitProgress(25);
                const formData = new FormData();
                formData.append('tb_document', document.pk);
                files.forEach((fileItem) => {
                    formData.append('files', fileItem.file);
                    formData.append('descr', fileItem.description);
                });
                await addDocumentAnnex(formData);
            }

            // Progresso: Preparando passo
            setSubmitProgress(50);

            // Dados otimistas para update imediato
            const optimisticDoc = {
                ...document,
                what: stepData.what,
                who: stepData.who,
                memo: stepData.memo,
                last_update: new Date().toISOString(),
                _optimistic: true
            };

            // Passo com smart update
            const stepDataObj = {
                tb_document: document.pk,
                what: stepData.what,
                who: stepData.who,
                memo: stepData.memo
            };

            setSubmitProgress(75);

            // USAR ENHANCED UPDATE para melhor tracking de performance
            const stepPromise = addDocumentStep(document.pk, stepDataObj);
            const stepResponse = await enhancedUpdateDocument(document.pk, optimisticDoc, stepPromise);

            // Socket & eventos
            setSubmitProgress(90);

            if (isConnected) {
                emit("new_step_added", {
                    orderId: document.regnumber,
                    userId: stepData.who,
                    documentId: document.pk
                });
                refreshNotifications();
            }

            // Eventos para outros componentes - melhorado para workflow
            const eventData = {
                type: 'step-added',
                newStep: stepDataObj,
                originalDocumentId: document.pk,
                transferredDocument: true // Indica que documento foi transferido
            };

            if (stepResponse?.document?.pk && stepResponse.document.pk !== document.pk) {
                eventData.newDocumentData = stepResponse.document;
                eventData.newDocumentId = stepResponse.document.pk;
            }

            // Disparar APENAS o evento de transferência para evitar conflitos
            window.dispatchEvent(new CustomEvent('document-transferred', {
                detail: {
                    documentId: document.pk,
                    type: 'step-added',
                    message: 'Documento transferido com sucesso',
                    ...eventData
                }
            }));

            // Não disparar o evento document-updated para evitar tentativas de refresh
            console.log('📤 Evento document-transferred disparado - evitando document-updated');

            // Progresso completo e animação de sucesso
            setSubmitProgress(100);
            setShowSuccess(true);

            // Performance tracking
            const duration = Date.now() - startTime;
            trackOperation('add_step', duration, true);

            // UX Analytics tracking
            uxAnalytics.trackAction('add_step', 'document_management', {
                documentId: document.pk,
                stepType: stepData.what,
                assignedTo: stepData.who,
                hasFiles: files.length > 0,
                fileCount: files.length,
                duration
            })(true, { success: true });

            // Fechar após mostrar sucesso
            setTimeout(() => {
                notifySuccess("✅ Passo adicionado! Lista atualizada.");
                onClose(true);
            }, 1200);

        } catch (error) {
            console.error('Erro:', error);

            // Performance tracking para erros
            const duration = Date.now() - startTime;
            trackOperation('add_step', duration, false);

            // UX Analytics tracking para erro
            uxAnalytics.trackAction('add_step', 'document_management', {
                documentId: document.pk,
                stepType: stepData.what,
                assignedTo: stepData.who,
                hasFiles: files.length > 0,
                fileCount: files.length,
                duration
            })(false, { error: error.message, status: error.response?.status });

            uxAnalytics.trackError(error, 'add_step_error', {
                documentId: document.pk,
                stepType: stepData.what
            });

            let errorMessage = "Erro ao adicionar passo";
            if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            }
            notifyError(errorMessage);
            setErrors(prev => ({ ...prev, submit: errorMessage }));
            setSubmitProgress(0);
        } finally {
            if (!showSuccess) {
                setLoading(false);
            }
        }
    };

    // Fechar
    const handleModalClose = () => {
        if (stepData.who || stepData.what || stepData.memo || files.length > 0) {
            setConfirmClose(true);
        } else {
            onClose(false);
        }
    };

    return (
        <>
            <Dialog open={open} onClose={handleModalClose} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <Box display="flex" alignItems="center">
                            {showSuccess ? (
                                <Fade in={true}>
                                    <CheckIcon sx={{ mr: 1, color: 'success.main' }} />
                                </Fade>
                            ) : (
                                <SendIcon sx={{ mr: 1 }} />
                            )}
                            <Typography variant="h6">
                                {showSuccess ? 'Passo adicionado com sucesso!' : `Novo movimento: ${document?.regnumber}`}
                            </Typography>
                        </Box>
                        <IconButton onClick={handleModalClose} disabled={loading}>
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Progress bar durante submit */}
                    {loading && (
                        <LinearProgress
                            variant="determinate"
                            value={submitProgress}
                            sx={{
                                mt: 1,
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: showSuccess ? 'success.main' : 'primary.main'
                                }
                            }}
                        />
                    )}
                </DialogTitle>

                <DialogContent dividers>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                Adicione um novo passo para encaminhar este pedido.
                            </Alert>
                        </Grid>

                        {/* Alerta workflow */}
                        {!workflowData.hasWorkflow && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    <Box display="flex" alignItems="center">
                                        <WarningIcon sx={{ mr: 1 }} />
                                        <Typography variant="body2">
                                            Workflow não configurado. Todos os passos disponíveis.
                                        </Typography>
                                    </Box>
                                </Alert>
                            </Grid>
                        )}

                        {/* Validação workflow */}
                        {workflowData.hasWorkflow && workflowValidation.message && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity={workflowValidation.type} sx={{ mb: 2 }}>
                                    {workflowValidation.message}
                                </Alert>
                            </Grid>
                        )}

                        {/* Estado */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required error={!!errors.what}>
                                <InputLabel>Estado</InputLabel>
                                <Select
                                    name="what"
                                    value={stepData.what}
                                    onChange={handleChange}
                                    label="Estado"
                                    disabled={loading}
                                >
                                    {workflowData.availableSteps.map(status => (
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
                            </FormControl>
                        </Grid>

                        {/* Utilizador */}
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <FormControl fullWidth required error={!!errors.who}>
                                <InputLabel>Para quem</InputLabel>
                                <Select
                                    name="who"
                                    value={stepData.who}
                                    onChange={handleChange}
                                    label="Para quem"
                                    disabled={loading || !isValidValue(stepData.what)}
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
                                {/* ===== MENSAGEM UTILIZADORES DISPONÍVEIS (CORRIGIDA) ===== */}
                                {isValidValue(stepData.what) && availableUsers.length === 0 && (
                                    <Typography variant="caption" color="warning.main">
                                        Nenhum utilizador disponível
                                    </Typography>
                                )}
                            </FormControl>
                        </Grid>

                        {/* Observações */}
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

                        {/* Anexos */}
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
                                            : 'Arraste, largue, cole ou clique'
                                        }
                                    </Typography>

                                    <Typography variant="body2" color="text.secondary">
                                        PDF, imagens, documentos Office e emails
                                    </Typography>

                                    {errors.files && (
                                        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                            {errors.files}
                                        </Typography>
                                    )}
                                </Box>
                            ) : (
                                <Typography variant="subtitle1" color="error" textAlign="center" mt={2}>
                                    Número máximo de anexos atingido.
                                </Typography>
                            )}
                        </Grid>

                        {/* Lista ficheiros */}
                        {files.length > 0 && (
                            <Grid size={{ xs: 12 }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Ficheiros ({files.length})
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

                        {/* Erros */}
                        {errors.submit && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {errors.submit}
                                </Alert>
                            </Grid>
                        )}

                        {errors.workflow && (
                            <Grid size={{ xs: 12 }}>
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {errors.workflow}
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={handleModalClose} disabled={loading}>
                        Cancelar
                    </Button>
                    {/* ===== BOTÃO SUBMIT MELHORADO ===== */}
                    <Button
                        variant="contained"
                        color={showSuccess ? "success" : "primary"}
                        onClick={handleSubmit}
                        disabled={
                            loading ||
                            !isValidValue(stepData.what) ||
                            !isValidValue(stepData.who) ||
                            !workflowValidation.isValid
                        }
                        startIcon={
                            loading ?
                                <CircularProgress size={20} color="inherit" /> :
                                (showSuccess ? <CheckIcon /> : <SendIcon />)
                        }
                        sx={{
                            minWidth: 160,
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {loading ?
                            `Processando... ${submitProgress}%` :
                            (showSuccess ? '✅ Concluído!' : 'Guardar e Enviar')
                        }
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Alerta férias */}
            <Dialog open={vacationAlert} onClose={() => setVacationAlert(false)}>
                <DialogTitle>Alerta de Férias</DialogTitle>
                <DialogContent>
                    <Typography>
                        A pessoa para quem está a enviar encontra-se de férias e
                        pode não ver o pedido em tempo útil!
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setVacationAlert(false)} color="primary" autoFocus>
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmação fechar */}
            <Dialog open={confirmClose} onClose={() => setConfirmClose(false)}>
                <DialogTitle>Descartar Alterações?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Existem alterações não guardadas. Deseja sair sem guardar?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmClose(false)} color="primary" autoFocus>
                        Não
                    </Button>
                    <Button
                        onClick={() => {
                            setConfirmClose(false);
                            onClose(false);
                        }}
                        color="primary"
                    >
                        Sim
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default AddStepModal;