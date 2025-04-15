import React, { useState } from 'react';
import {
    TextField,
    InputAdornment,
    CircularProgress,
    Tooltip,
    Box,
    Typography,
    Fade,
    useTheme,
    Chip,
    Paper
} from '@mui/material';
import {
    Business as BusinessIcon,
    CheckCircle as CheckCircleIcon,
    Search as SearchIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    LocationOn as LocationIcon
} from '@mui/icons-material';
import { getEntityByNIF } from '../../../../../services/entityService';

const EntitySearchField = ({
    value,
    onChange,
    onEntityFound,
    entityData,
    error,
    helperText,
    inputProps,
    ...rest
}) => {
    const theme = useTheme();
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const handleNifChange = (e) => {
        const newValue = e.target.value;
        if (newValue === '' || /^\d+$/.test(newValue)) {
            if (newValue.length <= 9) {
                onChange(e);
                if (newValue.length === 9) {
                    searchEntity(newValue);
                }
            }
        }
    };

    const searchEntity = async (nif) => {
        setSearching(true);
        setSearchError(null);
        try {
            const response = await getEntityByNIF(nif);
            if (response && response.entity) {
                onEntityFound && onEntityFound(response.entity);
            } else {
                setSearchError('Entidade não encontrada');
                onEntityFound && onEntityFound(null);
            }
        } catch (error) {
            console.error('Erro ao buscar entidade:', error);
            setSearchError('Erro ao buscar entidade');
            onEntityFound && onEntityFound(null);
        } finally {
            setSearching(false);
        }
    };

    const formatAddress = (entity) => {
        if (!entity) return '';
        const parts = [];
        if (entity.address) parts.push(entity.address);
        if (entity.door) parts.push(`Nº ${entity.door}`);
        return parts.join(', ');
    };

    return (
        <Box>
            <TextField
                fullWidth
                label="NIPC / NIF da Entidade"
                value={value}
                onChange={handleNifChange}
                error={error}
                helperText={helperText || searchError}
                required
                inputProps={{
                    maxLength: 9,
                    inputMode: 'numeric',
                    ...inputProps
                }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <BusinessIcon fontSize="small" />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            {searching && <CircularProgress size={20} />}
                            {entityData && !searching && (
                                <Tooltip title="Entidade encontrada">
                                    <CheckCircleIcon color="success" />
                                </Tooltip>
                            )}
                            {!entityData && !searching && value.length === 9 && (
                                <Tooltip title="Entidade não encontrada">
                                    <SearchIcon color="action" />
                                </Tooltip>
                            )}
                        </InputAdornment>
                    )
                }}
                {...rest}
            />

            {entityData && (
                <Fade in={!!entityData}>
                    <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                            mt: 2,
                            p: 1.5,
                            bgcolor: 'success.light',
                            borderColor: 'success.main',
                            borderLeft: `3px solid ${theme.palette.success.main}`
                        }}
                    >
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box display="flex" alignItems="center">
                                <BusinessIcon fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="body1" fontWeight="medium" noWrap>
                                    {entityData.name}
                                </Typography>
                            </Box>

                            <Box display="flex" alignItems="center">
                                <LocationIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" noWrap>
                                    {formatAddress(entityData)}
                                </Typography>
                            </Box>

                            <Box display="flex" alignItems="center" flexWrap="wrap" gap={1}>
                                {entityData.email && (
                                    <Chip
                                        size="small"
                                        icon={<EmailIcon fontSize="small" />}
                                        label={entityData.email}
                                        variant="outlined"
                                        color="default"
                                        sx={{ maxWidth: '100%', '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }}
                                    />
                                )}

                                {entityData.phone && (
                                    <Chip
                                        size="small"
                                        icon={<PhoneIcon fontSize="small" />}
                                        label={entityData.phone}
                                        variant="outlined"
                                        color="default"
                                    />
                                )}
                            </Box>
                        </Box>
                    </Paper>
                </Fade>
            )}
        </Box>
    );
};

export default EntitySearchField;