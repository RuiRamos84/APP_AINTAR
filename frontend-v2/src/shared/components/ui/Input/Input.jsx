/**
 * Input Component - Atómico
 * Campo de texto reutilizável com validação e acessibilidade
 */

import { TextField } from '@mui/material';
import { forwardRef } from 'react';
import PropTypes from 'prop-types';

/**
 * Input customizado baseado em Material-UI TextField
 * - Acessível (ARIA, labels)
 * - Suporte a erros
 * - Responsivo
 * - Touch-friendly
 */
export const Input = forwardRef(({
  label,
  error,
  helperText,
  required = false,
  fullWidth = true,
  size = 'medium',
  type = 'text',
  disabled = false,
  placeholder,
  multiline = false,
  rows = 4,
  value,
  onChange,
  onBlur,
  ...props
}, ref) => {
  return (
    <TextField
      ref={ref}
      label={label}
      type={type}
      error={!!error}
      helperText={error || helperText}
      required={required}
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      placeholder={placeholder}
      multiline={multiline}
      rows={multiline ? rows : undefined}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      InputLabelProps={{
        shrink: true, // Label sempre visível em cima
      }}
      inputProps={{
        'aria-required': required,
        'aria-invalid': !!error,
        'aria-describedby': error ? `${props.id || 'input'}-error` : undefined,
      }}
      FormHelperTextProps={{
        id: error ? `${props.id || 'input'}-error` : undefined,
        role: error ? 'alert' : undefined,
      }}
      sx={{
        // Mobile-first styling
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
        },
        '& .MuiInputBase-input': {
          // Touch-friendly input height
          minHeight: size === 'small' ? 36 : 44,
        },
        ...props.sx,
      }}
      {...props}
    />
  );
});

Input.displayName = 'Input';

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  fullWidth: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium']),
  type: PropTypes.string,
  disabled: PropTypes.bool,
  placeholder: PropTypes.string,
  multiline: PropTypes.bool,
  rows: PropTypes.number,
  value: PropTypes.any,
  onChange: PropTypes.func,
  onBlur: PropTypes.func,
  id: PropTypes.string,
  sx: PropTypes.object,
};
