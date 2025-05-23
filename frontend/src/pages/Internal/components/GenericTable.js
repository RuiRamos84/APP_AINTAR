// /components/GenericTable.js
import React from "react";
import {
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Box,
    Paper,
    TableContainer,
    Alert
} from "@mui/material";

const GenericTable = ({
    title,
    columns,
    records = [],
    loading,
    error,
    renderForm,
    formatters = {}
}) => {
    return (
        <Box>
            {title && (
                <Typography variant="h6" gutterBottom>
                    {title}
                </Typography>
            )}

            {renderForm && renderForm()}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            ) : (
                <Paper sx={{ mt: 3 }}>
                    <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid #eee' }}>
                        Registos
                    </Typography>

                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    {columns.map((column) => (
                                        <TableCell key={column.id}>{column.label}</TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {records.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} align="center">
                                            Nenhum registo encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    records.map((record, index) => (
                                        <TableRow key={index} hover>
                                            {columns.map((column) => (
                                                <TableCell key={`${index}-${column.id}`}>
                                                    {formatters[column.id]
                                                        ? formatters[column.id](record[column.field])
                                                        : record[column.field] || "-"}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            )}
        </Box>
    );
};

export default GenericTable;