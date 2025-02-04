// ReplicateDocumentModal.js
import React, { useState } from 'react';
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
    Typography,
    Alert
} from '@mui/material';
import { replicateDocument } from '../../../services/documentService';
import { useMetaData } from '../../../contexts/MetaDataContext';

const ReplicateDocumentModal = ({ open, onClose, document, onSuccess }) => {
    const [newType, setNewType] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { metaData } = useMetaData();


    const handleSubmit = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('metadados', metaData);
            console.log('document:', document.pk, newType);
            const result = await replicateDocument(document.pk, newType);

            if (result && result.message) {
                onSuccess(result.message);
                onClose();
            }
        } catch (err) {
            setError(err.message || 'Erro ao replicar documento');
        } finally {
            setLoading(false);
        }
    };

    // Encontra o nome do tipo atual do documento
    const currentTypeName = metaData?.types?.find(
        type => type.pk === document?.tt_type
    )?.tt_doctype_value || document?.tt_type;

    // console.log('currentTypeName:', metaData, currentTypeName);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Replicar Documento</DialogTitle>
            <DialogContent>
                <Typography variant="body1" gutterBottom>
                    Documento Original: {document?.regnumber}
                </Typography>

                <Typography variant="body2" color="textSecondary" gutterBottom>
                    Tipo Atual: {currentTypeName}
                </Typography>

                <FormControl fullWidth margin="normal">
                    <InputLabel>Novo Tipo de Documento</InputLabel>
                    <Select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        label="Novo Tipo de Documento"
                    >
                        {metaData?.types?.map((type) => (
                            <MenuItem
                                key={type.tt_doctype_code}
                                value={type.tt_doctype_code}
                                disabled={type.pk === document?.tt_type}
                            >
                                {type.tt_doctype_value}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={!newType || loading}
                >
                    {loading ? 'Replicando...' : 'Replicar'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ReplicateDocumentModal;