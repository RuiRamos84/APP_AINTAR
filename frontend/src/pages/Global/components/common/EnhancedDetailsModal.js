// frontend/src/pages/Global/components/common/EnhancedDetailsModal.js

import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton,
    Tabs, Tab, Box, Grid, TextField, FormControlLabel, Switch,
    Typography, Paper, Chip, Alert, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import BoltIcon from '@mui/icons-material/Bolt';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import DescriptionIcon from '@mui/icons-material/Description';
import { formatDate, formatCurrency } from '../../utils/helpers';

const FIELD_LABELS = {
    nome: 'Nome',
    ener_cpe: 'CPE',
    ener_potencia: 'Potência (kW)',
    ener_val: 'Valor Anual',
    ener_entidade: 'Fornecedor',
    ener_consumo: 'Consumo Anual',
    agua_contrato: 'Nº Contrato',
    agua_entidade: 'Fornecedor',
    agua_tratada: 'Água Tratada',
    apa_licenca: 'Licença APA',
    apa_data_ini: 'Início',
    apa_data_fim: 'Validade',
    coord_m: 'Coordenada M',
    coord_p: 'Coordenada P',
    tt_freguesia: 'Freguesia',
    subsistema: 'Subsistema',
    pop_dimen: 'População Dimensionada',
    pop_servida: 'População Servida',
    capacidade: 'Capacidade',
    caudal_max: 'Caudal Máximo',
    tt_tipoetar: 'Tipo ETAR',
    tt_niveltratamento: 'Nível Tratamento',
    tt_linhatratamento: 'Linha Tratamento',
    data_inicio: 'Data Início Funcionamento',
    data_horizonte: 'Horizonte Projecto',
    memo: 'Observações',
    ativa: 'Activa'
};

const ENTITIES_MAP = {
    102: 'EDP Comercial',
    103: 'Águas do Planalto'
};

const EDITABLE_FIELDS = [
    'nome', 'coord_m', 'coord_p', 'apa_licenca', 'apa_data_ini', 'apa_data_fim',
    'ener_entidade', 'ener_cpe', 'ener_potencia', 'ener_val'
];

const EnhancedDetailsModal = ({ open, onClose, details = {}, entityType, onSave, loading = false }) => {
    const [editMode, setEditMode] = useState(false);
    const [editableValues, setEditableValues] = useState(details);
    const [selectedTab, setSelectedTab] = useState(0);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    React.useEffect(() => {
        setEditableValues(details);
    }, [details]);

    const validateField = (field, value) => {
        if (['coord_m', 'coord_p', 'ener_potencia'].includes(field) && value && isNaN(parseFloat(value))) {
            return 'Valor numérico inválido';
        }
        if (['ener_entidade', 'ener_val'].includes(field) && value && !/^\d+$/.test(value)) {
            return 'Valor inteiro inválido';
        }
        return null;
    };

    const handleFieldChange = (field, value) => {
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
        setEditableValues(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (Object.values(errors).some(error => error)) return;

        setSaving(true);
        try {
            await onSave(editableValues);
            setEditMode(false);
        } finally {
            setSaving(false);
        }
    };

    const renderGeneralTab = () => (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h5">{details?.nome || 'N/D'}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {entityType === 1 ? 'ETAR' : 'Estação Elevatória'}
                                {details?.subsistema && ` • ${details.subsistema}`}
                            </Typography>
                            {details?.tt_tipoetar && (
                                <Chip
                                    size="small"
                                    label={details.tt_tipoetar === 1 ? 'ETAR' : 'Fossa Séptica'}
                                    color={details.tt_tipoetar === 1 ? 'primary' : 'secondary'}
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>
                        <Chip
                            label={details?.ativa ? "Activa" : "Inactiva"}
                            color={details?.ativa ? "success" : "default"}
                        />
                    </Box>
                </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
                <MetricCard
                    title="Localização"
                    value={details?.tt_freguesia || 'N/D'}
                    icon={<InfoIcon />}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <MetricCard
                    title="População Dimensionada"
                    value={details?.pop_dimen ? `${details.pop_dimen} hab` : 'N/D'}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <MetricCard
                    title="Caudal Máximo"
                    value={details?.caudal_max ? `${details.caudal_max} m³/dia` : 'N/D'}
                />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <MetricCard
                    title="Capacidade"
                    value={details?.capacidade ? `${details.capacidade}` : 'N/D'}
                />
            </Grid>

            {/* Coordenadas */}
            {(details?.coord_m || details?.coord_p) && (
                <Grid size={{ xs: 12 }}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="caption" color="text.secondary">Coordenadas</Typography>
                        <Typography variant="body1">
                            M: {details?.coord_m || 'N/D'} | P: {details?.coord_p || 'N/D'}
                        </Typography>
                    </Paper>
                </Grid>
            )}

            {/* Observações */}
            {details?.memo && (
                <Grid size={{ xs: 12 }}>
                    <Alert severity="info">
                        <Typography variant="subtitle2">Observações</Typography>
                        <Typography variant="body2">{details.memo}</Typography>
                    </Alert>
                </Grid>
            )}
        </Grid>
    );

    const renderEnergyTab = () => (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <InfoBar
                    label="Fornecedor"
                    value={ENTITIES_MAP[details?.ener_entidade] || (details?.ener_entidade ? `Entidade ${details.ener_entidade}` : 'N/D')}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
                {renderField('ener_cpe', 'CPE')}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                {renderField('ener_potencia', 'Potência (kW)', 'number')}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
                {renderField('ener_val', 'Valor Anual (€)', 'number')}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                {renderField('ener_consumo', 'Consumo Anual (kWh)', 'number')}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={!!details?.ener_transf}
                            onChange={(e) => editMode && handleFieldChange('ener_transf', e.target.checked ? 1 : 0)}
                            disabled={!editMode}
                        />
                    }
                    label="Contrato Transferido"
                />
            </Grid>
        </Grid>
    );

    const renderWaterTab = () => (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <InfoBar
                    label="Fornecedor"
                    value={ENTITIES_MAP[details?.agua_entidade] || (details?.agua_entidade ? `Entidade ${details.agua_entidade}` : 'N/D')}
                />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
                {renderField('agua_contrato', 'Nº Contrato')}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={details?.agua_tratada === '1' || details?.agua_tratada === 1}
                            disabled
                        />
                    }
                    label="Água Tratada"
                />
            </Grid>

            {details?.agua_observ && (
                <Grid size={{ xs: 12 }}>
                    <Alert severity="info">
                        <Typography variant="subtitle2">Observações</Typography>
                        <Typography variant="body2">{details.agua_observ}</Typography>
                    </Alert>
                </Grid>
            )}
        </Grid>
    );

    const renderLicensingTab = () => (
        <Box>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Licença APA</Typography>

                <Grid container spacing={2}>
                    <Grid size={{ xs: 12 }}>
                        {renderField('apa_licenca', 'Licença')}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        {renderField('apa_data_ini', 'Data Início', 'date')}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        {renderField('apa_data_fim', 'Data Validade', 'date')}
                    </Grid>
                </Grid>
            </Paper>

            {details?.apa_data_fim && (
                <Alert severity={new Date(details.apa_data_fim) > new Date() ? "success" : "error"}>
                    Licença {new Date(details.apa_data_fim) > new Date() ? "válida" : "expirada"}
                </Alert>
            )}
        </Box>
    );

    const renderField = (field, label, type = 'text') => {
        const value = editableValues[field] || '';
        const isEditable = EDITABLE_FIELDS.includes(field);

        if (type === 'switch') {
            return (
                <FormControlLabel
                    control={
                        <Switch
                            checked={!!value}
                            onChange={(e) => editMode && isEditable && handleFieldChange(field, e.target.checked ? 1 : 0)}
                            disabled={!editMode || !isEditable}
                        />
                    }
                    label={label}
                />
            );
        }

        // Para campos de data, não formatar se estiver em modo edição
        let displayValue = value;
        if (type === 'date') {
            if (editMode && isEditable) {
                // Em modo edição, manter formato original se válido
                displayValue = value && value !== 'null' ? value : '';
            } else {
                // Em modo visualização, formatar para display
                displayValue = formatDate(value);
            }
        }

        return (
            <TextField
                label={label}
                value={displayValue}
                onChange={(e) => editMode && isEditable && handleFieldChange(field, e.target.value)}
                type={editMode && type === 'date' ? 'date' : 'text'}
                fullWidth
                error={!!errors[field]}
                helperText={errors[field]}
                InputProps={{ readOnly: !editMode || !isEditable }}
                InputLabelProps={editMode && type === 'date' ? { shrink: true } : undefined}
                sx={{ backgroundColor: editMode && isEditable ? '#e8f5e9' : 'transparent' }}
            />
        );
    };

    const tabs = [
        { label: 'Geral', icon: <InfoIcon />, content: renderGeneralTab },
        { label: 'Energia', icon: <BoltIcon />, content: renderEnergyTab },
        { label: 'Água', icon: <WaterDropIcon />, content: renderWaterTab },
        { label: 'Licenciamento', icon: <DescriptionIcon />, content: renderLicensingTab }
    ];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Detalhes {entityType === 1 ? 'ETAR' : 'EE'}
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
                    <>
                        <Tabs value={selectedTab} onChange={(e, v) => setSelectedTab(v)} variant="fullWidth">
                            {tabs.map((tab, i) => (
                                <Tab key={i} label={tab.label} icon={tab.icon} iconPosition="start" />
                            ))}
                        </Tabs>

                        <Box sx={{ mt: 3 }}>
                            {tabs[selectedTab]?.content()}
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions>
                {!editMode ? (
                    <Button onClick={() => setEditMode(true)} variant="contained" startIcon={<EditIcon />}>
                        Editar
                    </Button>
                ) : (
                    <>
                        <Button onClick={() => setEditMode(false)} variant="outlined">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            disabled={saving || Object.values(errors).some(e => e)}
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

// Componentes auxiliares
const MetricCard = ({ title, value, icon }) => (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
        {icon && <Box sx={{ mr: 2, color: 'primary.main' }}>{icon}</Box>}
        <Box>
            <Typography variant="caption" color="text.secondary">{title}</Typography>
            <Typography variant="h6">{value || 'N/D'}</Typography>
        </Box>
    </Paper>
);

const InfoBar = ({ label, value }) => (
    <Paper sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body1">{value}</Typography>
    </Paper>
);

export default EnhancedDetailsModal;