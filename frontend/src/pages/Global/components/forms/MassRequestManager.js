// frontend/src/pages/Global/components/forms/MassRequestManager.js

import React, { useState } from 'react';
import {
    Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem,
    TextField, Button, Checkbox, FormControlLabel, Chip, Divider,
    InputAdornment, Tooltip
} from '@mui/material';
import { useMetaData } from '../../../../contexts/MetaDataContext';
import { createInternalRequest } from '../../../../services/InternalService';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';
import { REQUEST_CONFIGS } from '../../utils/constants';

const MassRequestManager = ({ areaId, requestType }) => {
    const { metaData } = useMetaData();
    const [selectedAssociate, setSelectedAssociate] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [commonMemo, setCommonMemo] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

    const config = REQUEST_CONFIGS[requestType];
    const entityLabel = areaId === 1 ? 'ETAR' : 'EE';

    // Obter entidades filtradas pelo associado
    const getFilteredEntities = () => {
        if (!selectedAssociate) return [];

        const associate = metaData?.associates?.find(a => a.pk === selectedAssociate);
        if (!associate) return [];

        // Extrair município (remover "Município de ")
        const municipioName = associate.name.replace('Município de ', '');
        const entities = areaId === 1 ? metaData?.etar : metaData?.ee;

        return entities?.filter(entity => entity.ts_entity === municipioName) || [];
    };

    // Toggle selecção entidade
    const handleEntityToggle = (entity) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(item => item.id === entity.pk);

            if (isSelected) {
                return prev.filter(item => item.id !== entity.pk);
            } else {
                return [...prev, {
                    id: entity.pk,
                    name: entity.nome,
                    subsistema: entity.subsistema,
                    tipo: entity.tt_tipoetar || 'EE',
                    memo: '',
                    associate: selectedAssociate
                }];
            }
        });
    };

    // Quando muda associado, limpa selecções
    const handleAssociateChange = (event) => {
        setSelectedAssociate(event.target.value);
        setSelectedItems([]);
    };

    // Aplicar memo comum
    const applyCommonMemo = () => {
        if (!commonMemo) return;

        setSelectedItems(prev =>
            prev.map(item => ({ ...item, memo: commonMemo }))
        );
        notifySuccess('Descrição aplicada a todos');
    };

    // Desfazer memo comum
    const undoCommonMemo = () => {
        setSelectedItems(prev =>
            prev.map(item => ({ ...item, memo: '' }))
        );
        notifySuccess('Descrição removida');
    };

    // Verificar se memo comum está aplicado
    const isCommonMemoApplied = () => {
        return commonMemo &&
            selectedItems.length > 0 &&
            selectedItems.every(item => item.memo === commonMemo);
    };

    // Validar formulário
    const areAllItemsValid = () => {
        return selectedItems.length > 0 &&
            selectedItems.every(item => item.memo && item.memo.trim() !== '');
    };

    // Actualizar memo individual
    const handleMemoChange = (entityId, value) => {
        setSelectedItems(prev =>
            prev.map(item =>
                item.id === entityId ? { ...item, memo: value } : item
            )
        );
    };

    // Submeter pedidos
    const handleSubmit = async () => {
        setHasAttemptedSubmit(true);

        if (!selectedAssociate) {
            notifyError('Seleccione um associado');
            return;
        }

        if (!areAllItemsValid()) {
            notifyError('Preencha descrição para todas as instalações');
            return;
        }

        setLoading(true);
        try {
            let successCount = 0;

            for (const item of selectedItems) {
                const payload = {
                    pnts_associate: selectedAssociate,
                    pnmemo: item.memo
                };

                if (areaId === 1) {
                    payload.pnpk_etar = item.id;
                    payload.pnpk_ee = null;
                } else {
                    payload.pnpk_etar = null;
                    payload.pnpk_ee = item.id;
                }

                await createInternalRequest(payload, requestType);
                successCount++;
            }

            notifySuccess(`${successCount} solicitações criadas`);
            setSelectedItems([]);
            setCommonMemo('');
        } catch (error) {
            notifyError('Erro ao criar solicitações');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {config?.title} - Selecção Múltipla
            </Typography>

            {/* Selector Município */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 3 }}>
                        <FormControl fullWidth>
                            <InputLabel>Município</InputLabel>
                            <Select
                                value={selectedAssociate}
                                onChange={handleAssociateChange}
                                label="Município"
                            >
                                <MenuItem value="">Seleccionar Município</MenuItem>
                                {metaData?.associates?.map(associate => (
                                    <MenuItem key={associate.pk} value={associate.pk}>
                                        {associate.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, md: 9 }}>
                        <TextField
                            label="Descrição Comum"
                            value={commonMemo}
                            onChange={(e) => setCommonMemo(e.target.value)}
                            multiline
                            rows={1.7}
                            fullWidth
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color={isCommonMemoApplied() ? "error" : "primary"}
                                            onClick={isCommonMemoApplied() ? undoCommonMemo : applyCommonMemo}
                                            disabled={selectedItems.length === 0 || (!isCommonMemoApplied() && !commonMemo)}
                                            sx={{ position: 'absolute', right: 8, top: 8, minWidth: 'auto', px: 2 }}
                                        >
                                            {isCommonMemoApplied() ? "Desfazer" : "Aplicar"}
                                        </Button>
                                    </InputAdornment>
                                )
                            }}
                            sx={{ '& .MuiInputBase-root': { paddingRight: '120px' } }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Lista Entidades */}
            {selectedAssociate && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            {entityLabel}s Disponíveis
                        </Typography>

                        {/* Legenda cores (só ETARs) */}
                        {areaId === 1 && (
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 16, height: 16, backgroundColor: '#1976d2', borderRadius: 1 }} />
                                    <Typography variant="caption">ETAR</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Box sx={{ width: 16, height: 16, backgroundColor: '#ff9800', borderRadius: 1 }} />
                                    <Typography variant="caption">Fossa Séptica</Typography>
                                </Box>
                            </Box>
                        )}

                        <Chip label={`${selectedItems.length} seleccionadas`} color="primary" variant="outlined" />
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {getFilteredEntities().length === 0 ? (
                        <Typography color="text.secondary" textAlign="center" py={4}>
                            Nenhuma instalação para este município
                        </Typography>
                    ) : (
                        <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <Grid container spacing={0.5}>
                                {getFilteredEntities().map(entity => (
                                    <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={entity.pk}>
                                        <Tooltip title={areaId === 1 ? `Tipo: ${entity.tt_tipoetar || 'N/A'}` : entity.nome} arrow>
                                            <Paper
                                                sx={{
                                                    p: 1,
                                                    border: '2px solid',
                                                    borderColor: selectedItems.some(item => item.id === entity.pk)
                                                        ? 'primary.main'
                                                        : areaId === 1
                                                            ? (entity.tt_tipoetar === 'ETAR' ? '#1976d2' : '#ff9800')
                                                            : 'divider',
                                                    backgroundColor: selectedItems.some(item => item.id === entity.pk)
                                                        ? 'primary.50'
                                                        : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        borderColor: 'primary.main',
                                                        backgroundColor: 'primary.50',
                                                        transform: 'translateY(-1px)',
                                                        boxShadow: 1
                                                    }
                                                }}
                                                onClick={() => handleEntityToggle(entity)}
                                            >
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            size="small"
                                                            checked={selectedItems.some(item => item.id === entity.pk)}
                                                            onChange={() => handleEntityToggle(entity)}
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
                                                            {entity.nome}
                                                        </Typography>
                                                    }
                                                    sx={{ m: 0, width: '100%', '& .MuiFormControlLabel-label': { width: '100%', overflow: 'hidden' } }}
                                                />
                                            </Paper>
                                        </Tooltip>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Botões selecção rápida */}
                    {getFilteredEntities().length > 0 && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    const allEntities = getFilteredEntities();
                                    setSelectedItems(allEntities.map(entity => ({
                                        id: entity.pk,
                                        name: entity.nome,
                                        tipo: entity.tt_tipoetar || 'EE',
                                        memo: '',
                                        associate: selectedAssociate
                                    })));
                                }}
                            >
                                Seleccionar Todas
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setSelectedItems([])}
                                disabled={selectedItems.length === 0}
                            >
                                Limpar
                            </Button>
                        </Box>
                    )}
                </Paper>
            )}

            {/* Detalhes Solicitações */}
            {selectedItems.length > 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Detalhes ({selectedItems.length})
                    </Typography>

                    {selectedItems.map((item, index) => (
                        <Paper key={item.id} sx={{ p: 2, mb: 2, border: '1px solid #e0e0e0' }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid size={{ xs: 12, md: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {index + 1}. {item.name}
                                    </Typography>
                                    {item.tipo && (
                                        <Chip size="small" label={item.tipo} color={item.tipo === 'ETAR' ? 'primary' : 'secondary'} />
                                    )}
                                </Grid>

                                <Grid size={{ xs: 12, md: 10 }}>
                                    <TextField
                                        label="Descrição"
                                        value={item.memo || ''}
                                        onChange={(e) => handleMemoChange(item.id, e.target.value)}
                                        fullWidth
                                        multiline
                                        required
                                        error={hasAttemptedSubmit && (!item.memo || item.memo.trim() === '')}
                                        helperText={hasAttemptedSubmit && (!item.memo || item.memo.trim() === '') ? 'Campo obrigatório' : ''}
                                    />
                                </Grid>
                            </Grid>
                        </Paper>
                    ))}

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmit}
                        disabled={!areAllItemsValid() || loading}
                    >
                        {loading ? 'A processar...' : `Criar ${selectedItems.length} Solicitações`}
                    </Button>
                </Paper>
            )}
        </Box>
    );
};

export default MassRequestManager;