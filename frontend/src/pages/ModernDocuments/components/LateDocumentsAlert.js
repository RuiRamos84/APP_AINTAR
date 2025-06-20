import React from 'react';
import { Alert, AlertTitle, Box, Chip, Typography } from '@mui/material';
import { AccessTime as ClockIcon, Warning as WarningIcon } from '@mui/icons-material';

const LateDocumentsAlert = ({ documents, onShowDetails }) => {
    if (!documents || documents.length === 0) {
        return (
            <Alert severity="success" sx={{ mb: 2 }}>
                <AlertTitle>Excelente!</AlertTitle>
                Não há documentos em atraso no momento.
            </Alert>
        );
    }

    // Calcular estatísticas de atraso
    const averageDays = documents.reduce((sum, doc) => sum + (doc.days || 0), 0) / documents.length;
    const maxDays = Math.max(...documents.map(doc => doc.days || 0));
    const urgentCount = documents.filter(doc => (doc.days || 0) > 60).length;

    return (
        <Box sx={{ mb: 3 }}>
            <Alert
                severity="warning"
                icon={<WarningIcon />}
                sx={{ mb: 2 }}
            >
                <AlertTitle>
                    <Box display="flex" alignItems="center" gap={1}>
                        <ClockIcon fontSize="small" />
                        Documentos em Atraso Detectados
                    </Box>
                </AlertTitle>

                <Typography variant="body2" sx={{ mb: 2 }}>
                    Foram encontrados <strong>{documents.length}</strong> documentos com mais de 30 dias.
                </Typography>

                <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                        label={`Média: ${Math.round(averageDays)} dias`}
                        size="small"
                        color="warning"
                        variant="outlined"
                    />
                    <Chip
                        label={`Máximo: ${maxDays} dias`}
                        size="small"
                        color="error"
                        variant="outlined"
                    />
                    {urgentCount > 0 && (
                        <Chip
                            label={`${urgentCount} urgentes (>60 dias)`}
                            size="small"
                            color="error"
                        />
                    )}
                </Box>
            </Alert>
        </Box>
    );
};

export default LateDocumentsAlert;