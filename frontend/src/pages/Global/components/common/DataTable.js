// frontend/src/pages/Global/components/common/DataTable.js

import React from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    CircularProgress,
    Box,
    Alert
} from '@mui/material';
import { formatDate, formatCurrency, formatNumber } from '../../utils/helpers';

const DataTable = ({
    title,
    columns,
    records = [],
    loading = false,
    error = null,
    formatters = {},
    emptyMessage = 'Nenhum registo encontrado'
}) => {
    const defaultFormatters = {
        data: formatDate,
        valor: formatCurrency,
        volume: (value) => formatNumber(value, 3),
        currency: formatCurrency,
        number: formatNumber
    };

    const getFormattedValue = (value, columnId, fieldName) => {
        if (value === null || value === undefined) return '-';

        // Usar formatter customizado se existir
        if (formatters[columnId]) {
            return formatters[columnId](value);
        }

        // Usar formatters padrão baseado no nome do campo
        if (fieldName?.includes('data')) return defaultFormatters.data(value);
        if (fieldName?.includes('valor')) return defaultFormatters.valor(value);

        return value;
    };

    if (loading) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                    A carregar registos...
                </Typography>
            </Paper>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Paper sx={{ mt: 2 }}>
            {title && (
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="h6">{title}</Typography>
                </Box>
            )}

            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            {columns.map((column) => (
                                <TableCell key={column.id} sx={{ fontWeight: 'bold' }}>
                                    {column.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        {emptyMessage}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((record, index) => (
                                <TableRow key={index} hover>
                                    {columns.map((column) => (
                                        <TableCell key={`${index}-${column.id}`}>
                                            {getFormattedValue(
                                                record[column.field],
                                                column.id,
                                                column.field
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default DataTable;