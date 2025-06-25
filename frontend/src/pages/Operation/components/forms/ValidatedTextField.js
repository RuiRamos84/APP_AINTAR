// frontend/src/pages/Operation/components/forms/ValidatedTextField.js
import React, { useState, useCallback } from 'react';
import { TextField } from '@mui/material';

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const validators = {
    note: (note) => {
        if (!note || note.trim().length < 10) {
            return { valid: false, error: 'Nota deve ter pelo menos 10 caracteres' };
        }
        if (note.length > 500) {
            return { valid: false, error: 'Nota não pode exceder 500 caracteres' };
        }
        return { valid: true };
    },

    phone: (phone) => {
        if (!phone) return { valid: true };
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 9) {
            return { valid: false, error: 'Telefone deve ter 9 dígitos' };
        }
        if (!/^[239]\d{8}$/.test(cleaned)) {
            return { valid: false, error: 'Formato inválido' };
        }
        return { valid: true };
    }
};

const ValidatedTextField = ({
    validation = null,
    sanitize = true,
    onChange,
    value,
    ...props
}) => {
    const [error, setError] = useState('');

    const handleChange = useCallback((event) => {
        let newValue = event.target.value;

        if (sanitize) {
            newValue = sanitizeInput(newValue);
        }

        if (validation && validators[validation]) {
            const result = validators[validation](newValue);
            setError(result.valid ? '' : result.error);
        }

        onChange?.(event, newValue);
    }, [validation, sanitize, onChange]);

    return (
        <TextField
            {...props}
            value={value}
            onChange={handleChange}
            error={!!error}
            helperText={error || props.helperText}
        />
    );
};

export default ValidatedTextField;