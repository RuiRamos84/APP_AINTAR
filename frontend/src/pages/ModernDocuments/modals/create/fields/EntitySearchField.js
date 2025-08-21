import React, { useState } from 'react';
import {
    TextField,
    InputAdornment,
    CircularProgress,
    Tooltip,
} from '@mui/material';
import {
    Business as BusinessIcon,
    CheckCircle as CheckCircleIcon,
    Search as SearchIcon,
    Error as ErrorIcon
} from '@mui/icons-material';
import { getEntityByNIF } from '../../../../../services/entityService';

const EntitySearchField = ({
    value,
    onChange,
    onEntityFound,
    entityData, // Ignorado - card agora é externo
    error,
    helperText,
    inputProps,
    ...rest
}) => {
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [nifValidation, setNifValidation] = useState(null);

    const isValidNIF = (nif) => {
        if (!nif || nif.length !== 9) return false;

        const validFirstDigits = [1, 2, 3, 5, 6, 8, 9];
        if (!validFirstDigits.includes(parseInt(nif[0]))) return false;

        let total = 0;
        for (let i = 0; i < 8; i++) {
            total += parseInt(nif[i]) * (9 - i);
        }

        const checkDigit = total % 11;
        const expectedDigit = checkDigit < 2 ? 0 : 11 - checkDigit;

        return parseInt(nif[8]) === expectedDigit;
    };

    const handleNifChange = (e) => {
        const newValue = e.target.value;

        if (newValue === '' || /^\d+$/.test(newValue)) {
            if (newValue.length <= 9) {
                onChange(e);
                setSearchError(null);
                setNifValidation(null);
                onEntityFound && onEntityFound(null);

                if (newValue.length === 9) {
                    if (isValidNIF(newValue)) {
                        setNifValidation('valid');
                        searchEntity(newValue);
                    } else {
                        setNifValidation('invalid');
                        setSearchError('NIF inválido - verifique os dígitos');
                        onEntityFound && onEntityFound(null);
                    }
                } else if (newValue.length > 0 && newValue.length < 9) {
                    setNifValidation('incomplete');
                } else if (newValue.length === 0) {
                    setNifValidation(null);
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
                setSearchError(null);
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

    const getValidationIcon = () => {
        if (searching) return <CircularProgress size={20} />;

        switch (nifValidation) {
            case 'valid':
                return (
                    <Tooltip title="NIF válido">
                        <CheckCircleIcon color="success" />
                    </Tooltip>
                );
            case 'invalid':
                return (
                    <Tooltip title="NIF inválido">
                        <ErrorIcon color="error" />
                    </Tooltip>
                );
            case 'incomplete':
                return (
                    <Tooltip title="NIF incompleto">
                        <SearchIcon color="action" />
                    </Tooltip>
                );
            default:
                return null;
        }
    };

    const hasError = error || nifValidation === 'invalid';
    const currentHelperText = helperText || searchError ||
        (nifValidation === 'invalid' ? 'NIF inválido' : '');

    return (
        <TextField
            fullWidth
            label="NIPC / NIF da Entidade"
            value={value}
            onChange={handleNifChange}
            error={hasError}
            helperText={currentHelperText}
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
                        {getValidationIcon()}
                    </InputAdornment>
                )
            }}
            {...rest}
        />
    );
};

export default EntitySearchField;