// frontend/src/pages/Operation/components/common/OperationErrorFallback.js
import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Warning } from '@mui/icons-material';

const OperationErrorFallback = ({ onRetry, message = "Algo correu mal" }) => (
    <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        minHeight: 200
    }}>
        <Warning sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
            {message}
        </Typography>
        <Button variant="outlined" onClick={onRetry} sx={{ mt: 2 }}>
            Tentar Novamente
        </Button>
    </Box>
);

export default OperationErrorFallback;