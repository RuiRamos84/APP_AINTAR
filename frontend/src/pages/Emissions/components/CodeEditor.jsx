import React from 'react';
import { TextField, Box } from '@mui/material';

/**
 * Editor de código melhorado para templates HTML/Jinja2
 */
const CodeEditor = ({
  label,
  value,
  onChange,
  rows = 10,
  error = false,
  helperText = '',
  required = false,
  placeholder = ''
}) => {
  return (
    <Box>
      <TextField
        fullWidth
        multiline
        rows={rows}
        value={value}
        onChange={onChange}
        error={error}
        helperText={helperText}
        placeholder={placeholder}
        label={label}
        required={required}
        sx={{
          '& .MuiInputBase-input': {
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: '13px',
            lineHeight: 1.8,
            tabSize: 2
          },
          '& .MuiInputBase-root': {
            backgroundColor: 'grey.50'
          }
        }}
        InputLabelProps={{
          shrink: true
        }}
      />
    </Box>
  );
};

export default CodeEditor;
