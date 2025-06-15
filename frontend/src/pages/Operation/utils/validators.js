// frontend/src/pages/Operation/utils/validation.js
import { z } from 'zod';
import DOMPurify from 'dompurify';

// === SCHEMAS ===
export const OperationSchema = z.object({
    regnumber: z.string().min(1, 'Número obrigatório'),
    ts_entity: z.string().min(2, 'Entidade obrigatória'),
    phone: z.string()
        .regex(/^[239]\d{8}$/, 'Telefone inválido')
        .optional()
        .or(z.literal('')),
    address: z.string().min(5, 'Morada obrigatória'),
    urgency: z.enum(['0', '1']).optional()
});

export const CompletionSchema = z.object({
    note: z.string()
        .min(10, 'Nota deve ter pelo menos 10 caracteres')
        .max(500, 'Nota não pode exceder 500 caracteres'),
    documentId: z.number().positive('ID de documento inválido')
});

export const ParameterSchema = z.object({
    pk: z.number().positive(),
    value: z.string().max(255, 'Valor muito longo'),
    memo: z.string().max(500, 'Observação muito longa').optional()
});

// === SANITIZAÇÃO ===
export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input.trim());
};

export const sanitizeOperationData = (data) => ({
    ...data,
    ts_entity: sanitizeInput(data.ts_entity),
    address: sanitizeInput(data.address),
    memo: data.memo ? sanitizeInput(data.memo) : null,
    phone: data.phone?.replace(/\D/g, '') || null
});

// === VALIDADORES ESPECÍFICOS ===
export const validators = {
    phone: (phone) => {
        if (!phone) return { valid: true };

        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 9) {
            return { valid: false, error: 'Telefone deve ter 9 dígitos' };
        }

        if (!/^[239]\d{8}$/.test(cleaned)) {
            return { valid: false, error: 'Formato inválido (deve começar por 2, 3 ou 9)' };
        }

        return { valid: true };
    },

    note: (note) => {
        if (!note || note.trim().length < 10) {
            return { valid: false, error: 'Nota deve ter pelo menos 10 caracteres' };
        }

        if (note.length > 500) {
            return { valid: false, error: 'Nota não pode exceder 500 caracteres' };
        }

        return { valid: true };
    },

    required: (value, fieldName) => {
        if (!value || (typeof value === 'string' && !value.trim())) {
            return { valid: false, error: `${fieldName} é obrigatório` };
        }
        return { valid: true };
    }
};

// === HOOK DE VALIDAÇÃO ===
export const useValidation = (schema) => {
    const validate = (data) => {
        try {
            const sanitized = typeof data === 'object' ?
                Object.fromEntries(
                    Object.entries(data).map(([key, value]) => [
                        key,
                        typeof value === 'string' ? sanitizeInput(value) : value
                    ])
                ) : data;

            schema.parse(sanitized);
            return { valid: true, data: sanitized };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    valid: false,
                    errors: error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                };
            }
            return { valid: false, errors: [{ field: 'unknown', message: 'Erro de validação' }] };
        }
    };

    return { validate };
};

// frontend/src/pages/Operation/components/forms/ValidatedTextField.js
import React, { useState, useCallback } from 'react';
import { TextField } from '@mui/material';
import { sanitizeInput, validators } from '../../utils/validation';

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

        // Sanitizar se necessário
        if (sanitize) {
            newValue = sanitizeInput(newValue);
        }

        // Validar se fornecido
        if (validation) {
            const result = validators[validation]?.(newValue) || { valid: true };
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