// DetailsStep.js - Correcção para mostrar contagem de pedidos da entidade

import React, { useEffect, useState } from 'react';
import {
    Grid,
    Paper,
    Typography,
    Box,
    TextField,
    FormControlLabel,
    Checkbox,
    useTheme,
    MenuItem,
    Chip,
    Tooltip,
    IconButton,
    InputAdornment
} from '@mui/material';
import {
    Description as DocumentIcon,
    Info as InfoIcon,
    History as HistoryIcon,
    Business as BusinessIcon
} from '@mui/icons-material';
import { notifyWarning } from '../../../../../components/common/Toaster/ThemedToaster';

// Componente existente DocumentSuggestions...
const DocumentSuggestions = ({ previousDocuments, onSelectSuggestion }) => {
    const uniqueTypes = [];
    const uniqueDocs = previousDocuments
        .filter(doc => {
            if (doc.tt_type && !uniqueTypes.includes(doc.tt_type)) {
                uniqueTypes.push(doc.tt_type);
                return true;
            }
            return false;
        })
        .slice(0, 3);

    if (uniqueDocs.length === 0) return null;

    return (
        <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>
                <HistoryIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                Baseado em pedidos anteriores:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
                {uniqueDocs.map((doc, index) => (
                    <Tooltip
                        key={index}
                        title={`Pedido #${doc.regnumber || 'N/A'} - ${new Date(doc.createdAt).toLocaleDateString()}`}
                    >
                        <Chip
                            label={doc.typeText || doc.tt_type}
                            color="primary"
                            variant="outlined"
                            clickable
                            onClick={() => onSelectSuggestion(doc)}
                            size="small"
                        />
                    </Tooltip>
                ))}
            </Box>
        </Box>
    );
};

const DetailsStep = ({
    formData,
    handleChange,
    errors,
    metaData,
    isInternal,
    handleInternalSwitch,
    isInterProfile,
    selectedCountType,
    selectedTypeText,
    previousDocuments = [],
    entityData
}) => {
    const theme = useTheme();
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [previousAssociateValue, setPreviousAssociateValue] = useState('');

    // ✅ CORRECÇÃO: Obter contagem de tipos da entidade
    const [entityCountTypes, setEntityCountTypes] = useState([]);
    const [currentTypeCount, setCurrentTypeCount] = useState(null);

    // Encontrar o nome de AINTAR para exibição
    const getAintarName = () => {
        const aintar = metaData?.associates?.find(a => a.pk === 1 || a.pk === "1");
        return aintar ? aintar.name : "AINTAR";
    };

    // ✅ CORRECÇÃO: Actualizar entityCountTypes quando entityData mudar
    useEffect(() => {
        if (entityData?.entityCountTypes) {
            setEntityCountTypes(entityData.entityCountTypes);
            console.log('📊 EntityCountTypes actualizados:', entityData.entityCountTypes);
        }
    }, [entityData]);

    // ✅ CORRECÇÃO: Actualizar contagem quando tipo de documento mudar
    useEffect(() => {
        if (formData.tt_type && entityCountTypes.length > 0) {
            const selectedTypeName = metaData?.types?.find(
                type => type.tt_doctype_code === formData.tt_type
            )?.tt_doctype_value;

            console.log('🔍 Busca contagem:', {
                selectedCode: formData.tt_type,
                selectedName: selectedTypeName,
                availableTypes: entityCountTypes.map(ct => ct.tt_type)
            });

            if (selectedTypeName) {
                const countData = entityCountTypes.find(
                    ct => ct.tt_type === selectedTypeName
                );

                console.log('📊 Resultado busca:', countData);

                setCurrentTypeCount(countData || null);

                // ✅ CORRECÇÃO: Notificar apenas se há contagem > 0
                if (countData && countData.typecountall > 3) {
                    notifyWarning(
                        `Esta entidade já submeteu ${countData.typecountyear} pedido(s) do tipo "${selectedTypeName}". Verifique se não é duplicado.`
                    );
                }
            }
        } else {
            setCurrentTypeCount(null);
        }
    }, [formData.tt_type, entityCountTypes, metaData?.types]);

    // ✅ DEBUG: Logs para verificar dados
    useEffect(() => {
        console.log('🔍 DetailsStep DEBUG:', {
            'formData.tt_type': formData.tt_type,
            'entityCountTypes.length': entityCountTypes.length,
            'currentTypeCount': currentTypeCount,
            'entityData.name': entityData?.name
        });
    }, [formData.tt_type, entityCountTypes, currentTypeCount, entityData]);

    // Efeito para manipular o preenchimento automático do associado quando isInternal muda
    useEffect(() => {
        if (isInternal) {
            setPreviousAssociateValue(formData.ts_associate || '');
            const associateEvent = {
                target: { name: 'ts_associate', value: '1' }
            };
            handleChange(associateEvent);
        } else if (previousAssociateValue) {
            const associateEvent = {
                target: { name: 'ts_associate', value: previousAssociateValue }
            };
            handleChange(associateEvent);
        }
    }, [isInternal]); // eslint-disable-line react-hooks/exhaustive-deps

    // Handler para selecionar uma sugestão
    const handleSelectSuggestion = (doc) => {
        const syntheticEvent = {
            target: { name: 'tt_type', value: doc.tt_type }
        };
        handleChange(syntheticEvent);

        if (doc.ts_associate && !isInternal) {
            const associateEvent = {
                target: { name: 'ts_associate', value: doc.ts_associate }
            };
            handleChange(associateEvent);
        }

        if (doc.tt_presentation) {
            const presentationEvent = {
                target: { name: 'tt_presentation', value: doc.tt_presentation }
            };
            handleChange(presentationEvent);
        }
    };

    // Componente especial para renderizar quando é pedido interno
    const renderAssociateField = () => {
        if (isInternal) {
            return (
                <TextField
                    fullWidth
                    label="Associado"
                    value={getAintarName()}
                    disabled={true}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <BusinessIcon fontSize="small" color="primary" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                <Chip
                                    size="small"
                                    color="primary"
                                    label="Interno"
                                    variant="outlined"
                                />
                            </InputAdornment>
                        )
                    }}
                />
            );
        }

        return (
            <TextField
                select
                fullWidth
                label="Associado"
                name="ts_associate"
                value={formData.ts_associate || ''}
                onChange={handleChange}
                error={!!errors.ts_associate}
                helperText={errors.ts_associate}
                required={!isInternal}
                disabled={isInternal}
            >
                {metaData?.associates?.map((associate) => (
                    <MenuItem key={associate.pk} value={associate.pk}>
                        {associate.name}
                    </MenuItem>
                ))}
            </TextField>
        );
    };

    return (
        <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
                <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                        p: 2,
                        mb: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                    }}
                >
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                        <Box display="flex" alignItems="center">
                            <DocumentIcon color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h6">
                                Detalhes do Pedido
                            </Typography>
                        </Box>

                        {isInterProfile && (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isInternal}
                                        onChange={handleInternalSwitch}
                                    />
                                }
                                label="Pedido Interno"
                                sx={{ m: 0 }}
                                labelPlacement="start"
                            />
                        )}
                    </Box>

                    {showSuggestions && (
                        <DocumentSuggestions
                            previousDocuments={previousDocuments}
                            onSelectSuggestion={handleSelectSuggestion}
                        />
                    )}

                    <Grid container spacing={2} mt={1}>
                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                required
                                select
                                fullWidth
                                label="Tipo de Documento"
                                name="tt_type"
                                value={formData.tt_type || ''}
                                onChange={handleChange}
                                error={!!errors.tt_type}
                                helperText={errors.tt_type}
                            >
                                {metaData?.types
                                    ?.filter(type => {
                                        if (typeof type.intern === 'undefined') {
                                            return true;
                                        }
                                        return isInternal ? type.intern === 1 : type.intern === 0;
                                    })
                                    .map(type => (
                                        <MenuItem key={type.pk} value={type.tt_doctype_code}>
                                            {type.tt_doctype_value}
                                        </MenuItem>
                                    ))}
                            </TextField>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            {renderAssociateField()}
                        </Grid>

                        <Grid size={{ xs: 12, sm: 4 }}>
                            <TextField
                                required
                                select
                                fullWidth
                                label="Forma de Apresentação"
                                name="tt_presentation"
                                value={formData.tt_presentation || ''}
                                onChange={handleChange}
                                error={!!errors.tt_presentation}
                                helperText={errors.tt_presentation}
                            >
                                {metaData?.presentation?.map((presentation) => (
                                    <MenuItem key={presentation.pk} value={presentation.pk}>
                                        {presentation.value}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* ✅ CORRECÇÃO: Informação sobre histórico melhorada */}
                        {formData.tt_type && currentTypeCount && (
                            <Grid size={{ xs: 12 }}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        mt: 1,
                                        bgcolor: currentTypeCount.typecountall > 3
                                            ? theme.palette.warning.main
                                            : theme.palette.info.light,
                                        color: currentTypeCount.typecountall > 3
                                            ? theme.palette.common.white
                                            : theme.palette.info.dark,
                                        borderRadius: 1
                                    }}
                                >
                                    <Box display="flex" alignItems="center">
                                        <InfoIcon sx={{ mr: 1 }} />
                                        <Typography variant="body2">
                                            <strong>Histórico da entidade:</strong> {currentTypeCount.typecountyear}º pedido do tipo
                                            "{currentTypeCount.tt_type}" no ano corrente,
                                            e {currentTypeCount.typecountall} no total global.
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Grid>
                        )}

                        {/* ✅ Caso não haja histórico */}
                        {formData.tt_type && !currentTypeCount && entityData && (
                            <Grid size={{ xs: 12 }}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 1.5,
                                        mt: 1,
                                        bgcolor: theme.palette.success.light,
                                        color: theme.palette.success.dark,
                                        borderRadius: 1
                                    }}
                                >
                                    <Box display="flex" alignItems="center">
                                        <InfoIcon sx={{ mr: 1 }} />
                                        <Typography variant="body2">
                                            Primeiro pedido deste tipo para esta entidade.
                                        </Typography>
                                    </Box>
                                </Paper>
                            </Grid>
                        )}
                    </Grid>
                </Paper>
            </Grid>
        </Grid>
    );
};

export default DetailsStep;