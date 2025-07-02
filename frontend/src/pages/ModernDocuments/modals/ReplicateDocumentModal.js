import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Alert,
    useTheme,
    Divider,
    Paper,
    Grid,
    Chip,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import {
    Close as CloseIcon,
    FileCopy as FileCopyIcon,
    Description as DescriptionIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

import { replicateDocument } from '../../../services/documentService';
import { findMetaValue, getStatusColor } from '../utils/documentUtils';
import { notification } from '../../../components/common/Toaster/ThemedToaster'

const ReplicateDocumentModal = ({ open, onClose, document, metaData }) => {
    const theme = useTheme();

    // Estados
    const [selectedType, setSelectedType] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showInternalOnly, setShowInternalOnly] = useState(false);
    const [filteredTypes, setFilteredTypes] = useState([]);

    // Reset quando o modal abre
    useEffect(() => {
        if (open) {
            setSelectedType('');
            setError('');
            setShowInternalOnly(false);
        }
    }, [open]);

    // Filtra os tipos de documentos com base na seleção do checkbox
    useEffect(() => {
        if (metaData?.types) {
            const filtered = showInternalOnly
                ? metaData.types.filter(type => type.intern === 1)
                : metaData.types.filter(type => type.intern === 0);
            setFilteredTypes(filtered);
        }
    }, [metaData?.types, showInternalOnly]);

    // Handler para mudança de tipo de documento
    const handleTypeChange = (event) => {
        setSelectedType(event.target.value);
        setError('');
    };

    // Handler para o checkbox de tipos internos
    const handleInternalFilterChange = (event) => {
        setShowInternalOnly(event.target.checked);
        setSelectedType(''); // Reset selection when filter changes
    };

    // Envio do formulário
    const handleSubmit = async () => {
        if (!selectedType) {
            setError('Selecione um tipo de documento');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await replicateDocument(document.pk, selectedType);

            if (response.success) {
                onClose(true, {
                    id: response.newDocumentId,
                    regnumber: response.regnumber
                });
                notification.success(response.message);
                // Disparar evento para atualizar o modal principal
                const documentUpdateEvent = new CustomEvent('document-updated', {
                    detail: {
                        documentId: document.pk,
                        type: 'document-replicated'
                    }
                });
                window.dispatchEvent(documentUpdateEvent);
            }
        } catch (error) {
            console.error('Erro ao replicar documento:', error);
            setError(error.message);
            notification.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={() => !loading && onClose(false)}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                        <FileCopyIcon sx={{ mr: 1 }} />
                        <Typography variant="h6">
                            Replicar Pedido: {document?.regnumber}
                        </Typography>
                    </Box>
                    <IconButton
                        edge="end"
                        color="inherit"
                        onClick={() => !loading && onClose(false)}
                        aria-label="close"
                        disabled={loading}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent dividers>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            A replicação criará um novo pedido com os mesmos dados da entidade, mas com um novo tipo de documento.
                        </Alert>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Documento Original
                            </Typography>
                            <Box display="flex" alignItems="center" mt={1}>
                                <DescriptionIcon color="primary" sx={{ mr: 1, fontSize: 20 }} />
                                <Typography variant="body1" fontWeight="medium">
                                    {document?.regnumber}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary" mt={1}>
                                <strong>Tipo:</strong> {document?.tt_type}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <strong>Entidade:</strong> {document?.ts_entity}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <strong>NIPC:</strong> {document?.nipc || 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                <strong>Associado:</strong> {findMetaValue(metaData?.associates, 'name', document?.ts_associate) || 'N/A'}
                            </Typography>
                        </Paper>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                        <Paper elevation={0} variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                Selecione o novo Tipo de Pedido
                            </Typography>

                            <Box sx={{ mt: 1, mb: 2 }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={showInternalOnly}
                                            onChange={handleInternalFilterChange}
                                            color="primary"
                                            disabled={loading}
                                        />
                                    }
                                    label="Pedidos internos"
                                />
                            </Box>

                            <FormControl fullWidth sx={{ mt: 1 }} error={!!error}>
                                <InputLabel id="replicate-type-label">Tipo de Documento</InputLabel>
                                <Select
                                    labelId="replicate-type-label"
                                    value={selectedType}
                                    onChange={handleTypeChange}
                                    label="Tipo de Documento"
                                    disabled={loading}
                                >
                                    {filteredTypes.length > 0 ? (
                                        filteredTypes.map(type => (
                                            <MenuItem
                                                key={type.pk}
                                                value={type.tt_doctype_code}
                                                disabled={type.tt_doctype_code === document?.tt_type_code}
                                            >
                                                {type.tt_doctype_value}
                                                {type.intern === 1 && (
                                                    <Chip
                                                        label="Interno"
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ ml: 1, height: 20 }}
                                                    />
                                                )}
                                            </MenuItem>
                                        ))
                                    ) : (
                                        <MenuItem disabled>
                                            {showInternalOnly
                                                ? "Não existem tipos de pedidos internos disponíveis"
                                                : "Não existem tipos de pedidos standard disponíveis"}
                                        </MenuItem>
                                    )}
                                </Select>
                                {error && (
                                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                                        {error}
                                    </Typography>
                                )}
                            </FormControl>

                            <Box mt={2}>
                                <Alert
                                    severity="warning"
                                    icon={<WarningIcon />}
                                    sx={{ mt: 2 }}
                                >
                                    Revise os dados cuidadosamente antes de criar o novo pedido.
                                </Alert>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={() => onClose(false)}
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={loading || !selectedType}
                    startIcon={loading ? <CircularProgress size={20} /> : <FileCopyIcon />}
                >
                    {loading ? 'Replicando...' : 'Replicar Documento'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReplicateDocumentModal;