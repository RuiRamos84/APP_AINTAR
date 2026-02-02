import React, { useState, useEffect } from 'react';
import { TextField, CircularProgress, InputAdornment } from '@mui/material';
import { Search as SearchIcon, CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import { entitiesService } from '../../api/entitiesService';

const EntitySearchField = ({ 
    value, 
    onChange, 
    onEntityFound, 
    error, 
    helperText, 
    name, 
    label = "NIF / NIPC",
    required = true,
    onSearchStatusChange,
    searchTrigger = 0 // Counter to force re-search
}) => {
    const [loading, setLoading] = useState(false);
    const [searchStatus, setSearchStatus] = useState(null); // 'success', 'error', null

    // Debounce or check on length? Legacy checks on length >= 9 inside handleChange.
    // Here we will listen to value changes from parent.

    useEffect(() => {
        const checkEntity = async () => {
             // Basic NIPC validation
            if (!value || value.length < 9) {
                setSearchStatus(null);
                if (onSearchStatusChange) onSearchStatusChange(null);
                return;
            }

            console.log('[EntitySearchField] Starting search for NIF:', value, 'Trigger:', searchTrigger);

            setLoading(true);
            if (onSearchStatusChange) onSearchStatusChange('loading');
            try {
                const response = await entitiesService.getEntityByNipc(value);
                console.log('[EntitySearchField] API Response:', response);
                
                // Determine if response is the entity itself or contains it
                const entity = response?.entity || (response?.pk || response?.nipc ? response : null);
                console.log('[EntitySearchField] Extracted entity:', entity);

                if (entity) {
                    console.log('[EntitySearchField] Entity found successfully');
                    setSearchStatus('success');
                    if (onSearchStatusChange) onSearchStatusChange('success');
                    if (onEntityFound) {
                        console.log('[EntitySearchField] Calling onEntityFound with entity:', entity.name);
                        onEntityFound(entity);
                    }
                } else {
                    console.warn('[EntitySearchField] Entity response invalid:', response);
                    setSearchStatus('not_found'); // Treat invalid response as not found
                    if (onSearchStatusChange) onSearchStatusChange('not_found');
                    if (onEntityFound) {
                        console.log('[EntitySearchField] Calling onEntityFound with null (not found)');
                        onEntityFound(null); // Not found
                    }
                }
            } catch (err) {
                console.error('[EntitySearchField] Search error:', err);
                // Check for 404 specifically
                const isNotFound = err.response?.status === 404;
                const status = isNotFound ? 'not_found' : 'error';
                
                setSearchStatus(status);
                if (onSearchStatusChange) onSearchStatusChange(status);
                if (onEntityFound) onEntityFound(null);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(() => {
            if (value && value.length >= 9) {
                checkEntity();
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [value, onSearchStatusChange, searchTrigger]); // Added searchTrigger

    return (
        <TextField
            name={name}
            label={label}
            value={value || ''}
            onChange={onChange}
            fullWidth
            required={required}
            error={error || searchStatus === 'error'}
            helperText={helperText || (searchStatus === 'error' ? 'Entidade não encontrada' : '')}
            InputProps={{
                endAdornment: (
                    <InputAdornment position="end">
                        {loading ? (
                            <CircularProgress size={20} />
                        ) : searchStatus === 'success' ? (
                            <CheckIcon color="success" />
                        ) : searchStatus === 'error' ? (
                            <ErrorIcon color="error" />
                        ) : (
                            <SearchIcon color="action" />
                        )}
                    </InputAdornment>
                ),
            }}
        />
    );
};

export default EntitySearchField;
