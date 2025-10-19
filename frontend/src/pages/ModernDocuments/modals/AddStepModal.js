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
import { useAdvancedDocuments } from '../context/AdvancedDocumentsContext';
import { notifySuccess, notifyError, notifyWarning } from "../../../components/common/Toaster/ThemedToaster.js";
import { FilePreviewItem, generateFilePreview } from '../utils/fileUtils';
import { getValidTransitions, getAvailableSteps, getAvailableUsersForStep, canStayInSameStep, getUsersForTransfer } from '../utils/workflowUtils';

// ===== FUNÇÃO AUXILIAR PARA PK = 0 (CORRIGIDA PARA ACEITAR 0) =====
const isValidValue = (value) => {
    // Aceitar explicitamente 0 (para utilizadores externos)
    if (value === 0 || value === '0') return true;
    return value !== null && value !== undefined && value !== '';
};

const AddStepModal = ({ open, onClose, document, metaData, fetchDocuments }) => {
    const { emit, isConnected } = useSocket();
    const { trackOperation } = useAdvancedDocuments();

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
            // Aceitar pk=0 explicitamente para utilizadores externos
            const targetUserInt = parseInt(targetUser);
            const canTransferToUser = availableUsers.some(u => u.pk === targetUserInt);

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
        const targetUserInt = parseInt(targetUser);
        const isValidTransition = workflowData.validTransitions.some(t => {
            const toStepMatch = t.to_step_pk === targetStep;

            // CORRIGIDO: Comparação robusta para aceitar pk=0
            const clientMatch = Array.isArray(t.client)
                ? t.client.some(c => parseInt(c) === targetUserInt)
                : parseInt(t.client) === targetUserInt;

            // console.log('🔍 Validação transição:', {
            //     transition_id: t.pk,
            //     to_step: t.to_step_pk,
            //     client: t.client,
            //     targetUser: targetUserInt,
            //     toStepMatch,
            //     clientMatch,
            //     isValid: toStepMatch && clientMatch
            // });

            return toStepMatch && clientMatch;
        });

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

    // ===== SUBMIT OTIMIZADO - Performance melhorada =====
    const handleSubmit = async () => {
        if (!validateForm()) return;
        setLoading(true);

        const startTime = Date.now();

        try {
            // 1. Anexos (se existirem)
            if (files.length > 0) {
                const formData = new FormData();
                formData.append('tb_document', document.pk);
                files.forEach((fileItem) => {
                    formData.append('files', fileItem.file);
                    formData.append('descr', fileItem.description);
                });
                await addDocumentAnnex(formData);
            }

            // 2. Adicionar passo (operação principal)
            const stepDataObj = {
                tb_document: document.pk,
                what: stepData.what,
                who: stepData.who,
                memo: stepData.memo
            };

            const stepResponse = await addDocumentStep(document.pk, stepDataObj);

            // 3. Notificação Socket APENAS (evento simplificado)
            if (isConnected) {
                emit("new_step_added", {
                    orderId: document.regnumber,
                    userId: stepData.who,
                    documentId: document.pk
                });
            }

            // 4. Evento de transferência para remover documento das listas
            window.dispatchEvent(new CustomEvent('document-transferred', {
                detail: {
                    documentId: document.pk,
                    type: 'step-added'
                }
            }));

            // 5. Performance tracking (silencioso)
            const duration = Date.now() - startTime;
            trackOperation('add_step', duration, true);

            // 6. Fechar modal e mostrar mensagem ÚNICA
            notifySuccess("✅ Passo adicionado com sucesso!");

            // Reset rápido dos estados
            setStepData({
                what: '',
                who: '',
                memo: '',
                tb_document: null,
            });
            setFiles([]);
            setErrors({});
            setVacationAlert(false);
            setLoading(false);
            setWorkflowValidation({
                isValid: true,
                message: '',
                type: 'info'
            });

            // Fechar imediatamente (sem setTimeout)
            onClose(true);

        } catch (error) {
            console.error('Erro ao adicionar passo:', error);

            // Performance tracking silencioso
            const duration = Date.now() - startTime;
            trackOperation('add_step', duration, false);

            // Mensagem de erro ÚNICA e clara
            const errorMessage = error.response?.data?.error || "Erro ao adicionar passo";
            notifyError(errorMessage);

            setErrors(prev => ({ ...prev, submit: errorMessage }));
            setLoading(false);
        }
    };

    // Fechar
    const handleModalClose = () => {
        if (isValidValue(stepData.who) || isValidValue(stepData.what) || stepData.memo || files.length > 0) {
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
                            <SendIcon sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                Novo movimento: {document?.regnumber}
                            </Typography>
                        </Box>
                        <IconButton onClick={handleModalClose} disabled={loading}>
                            <CloseIcon />
                        </IconButton>
                    </Box>
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
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSubmit}
                        disabled={
                            loading ||
                            !isValidValue(stepData.what) ||
                            !isValidValue(stepData.who) ||
                            !workflowValidation.isValid
                        }
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                    >
                        {loading ? 'A processar...' : 'Guardar e Enviar'}
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