// frontend/src/pages/Global/components/common/DetailsModal.js

import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Grid,
    Typography,
    IconButton,
    Box,
    FormControlLabel,
    Switch,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatDate } from '../../utils/helpers';

const FIELD_LABELS = {
    nome: 'Nome',
    ener_cpe: 'CPE de Energia',
    ener_consumo: 'Consumo Anual',
    ener_entidade: 'Entidade Responsável',
    ener_potencia: 'Potência Contratada',
    ener_transf: 'Contrato Transferido',
    ener_val: 'Valor de Energia',
    agua_contrato: 'Contrato de Água',
    agua_entidade: 'Entidade de Água',
    agua_observ: 'Observações de Água',
    apa_licenca: 'Licença APA',
    apa_data_ini: 'Data de Início',
    apa_data_fim: 'Data de Fim',
    coord_m: 'Coordenada M',
    coord_p: 'Coordenada P',
    tt_freguesia: 'Freguesia',
    subsistema: 'Subsistema',
    pop_dimen: 'População Dimensionada',
    pop_servida: 'População Servida',
    memo: 'Notas',
    ativa: 'Estado Activo',
    tt_niveltratamento: 'Nível de Tratamento',
    tt_linhatratamento: 'Linha de Tratamento',
    capacidade: 'Capacidade',
    agua_tratada: 'Água Tratada'
};

const FIELD_GROUPS = {
    Energia: ['ener_transf', 'ener_cpe', 'ener_consumo', 'ener_entidade', 'ener_potencia', 'ener_val'],
    Água: ['agua_contrato', 'agua_entidade', 'agua_observ'],
    Licenciamento: ['apa_licenca', 'apa_data_ini', 'apa_data_fim'],
    Localização: ['coord_m', 'coord_p', 'tt_freguesia', 'subsistema'],
    População: ['pop_dimen', 'pop_servida', 'capacidade', 'agua_tratada'],
    Outros: ['ativa', 'memo', 'tt_niveltratamento', 'tt_linhatratamento']
};

const EDITABLE_FIELDS = [
    'nome', 'coord_m', 'coord_p', 'apa_licenca', 'apa_data_ini', 'apa_data_fim',
    'ener_entidade', 'ener_cpe', 'ener_potencia', 'ener_val'
];

const DetailsModal = ({
    open,
    onClose,
    details = {},
    entityType,
    onSave,
    loading = false
}) => {
    const [editMode, setEditMode] = useState(false);
    const [editableValues, setEditableValues] = useState(details);
    const [saving, setSaving] = useState(false);

    React.useEffect(() => {
        setEditableValues(details);
    }, [details]);

    const handleFieldChange = (field, value) => {
        setEditableValues(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(editableValues);
            setEditMode(false);
        } catch (error) {
            console.error('Erro ao guardar:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditableValues(details);
        setEditMode(false);
    };

    const renderField = (field) => {
        const value = (editableValues && editableValues[field]) || '';
        const isEditable = EDITABLE_FIELDS.includes(field);

        if (['ativa', 'ener_transf'].includes(field)) {
            return (
                <FormControlLabel
                    control={
                        <Switch
                            checked={!!value}
                            onChange={(e) =>
                                editMode && isEditable &&
                                handleFieldChange(field, e.target.checked ? 1 : 0)
                            }
                            disabled={!editMode || !isEditable}
                        />
                    }
                    label={FIELD_LABELS[field] || field}
                />
            );
        }

        return (
            <TextField
                label={FIELD_LABELS[field] || field}
                value={field.includes('data') ? formatDate(value) : value}
                onChange={(e) =>
                    editMode && isEditable &&
                    handleFieldChange(field, e.target.value)
                }
                fullWidth
                InputProps={{
                    readOnly: !editMode || !isEditable
                }}
                sx={{
                    backgroundColor: editMode && isEditable ? '#e8f5e9' : 'transparent'
                }}
            />
        );
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Detalhes da {entityType === 1 ? 'ETAR' : 'EE'}
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
                        <Box key={groupName} mb={3}>
                            <Typography variant="h6" gutterBottom>
                                {groupName}
                            </Typography>
                            <Grid container spacing={2}>
                                {fields.map(field => (
                                    <Grid key={field} size={{ xs: 12, sm: 6, md: 4 }}>
                                        {renderField(field)}
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))
                )}
            </DialogContent>

            <DialogActions>
                {!editMode ? (
                    <Button onClick={() => setEditMode(true)} variant="contained">
                        Editar
                    </Button>
                ) : (
                    <>
                        <Button onClick={handleCancel} variant="outlined">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={20} /> : null}
                        >
                            {saving ? 'A guardar...' : 'Guardar'}
                        </Button>
                    </>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default DetailsModal;