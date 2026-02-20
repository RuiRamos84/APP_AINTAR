// /components/GenericTable.js
import { useState, useMemo } from "react";
import {
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
    Box,
    Paper,
    TableContainer,
    Alert
} from "@mui/material";

const getSortValue = (record, column) => {
    const val = record[column.field];
    if (val === null || val === undefined) return "";
    // Tentar converter para número puro
    const num = Number(val);
    if (!isNaN(num) && val !== "") return num;
    // Tentar converter para data (ex: "Sun, 30 Apr 2023 00:00:00 GMT", "2024-01-15")
    const ts = Date.parse(val);
    if (!isNaN(ts)) return ts;
    return String(val).toLowerCase();
};

const sortRecords = (records, orderBy, order, columns) => {
    if (!orderBy) return records;
    const column = columns.find(c => c.id === orderBy);
    if (!column || !column.field) return records;

    return [...records].sort((a, b) => {
        const aVal = getSortValue(a, column);
        const bVal = getSortValue(b, column);
        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
    });
};

const GenericTable = ({
    title,
    columns,
    records = [],
    loading,
    error,
    renderForm,
    formatters = {}
}) => {
    const [orderBy, setOrderBy] = useState(null);
    const [order, setOrder] = useState("asc");

    const handleSort = (columnId) => {
        if (orderBy === columnId) {
            setOrder(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setOrderBy(columnId);
            setOrder("asc");
        }
    };

    const sortedRecords = useMemo(
        () => sortRecords(records, orderBy, order, columns),
        [records, orderBy, order, columns]
    );

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
                                    {columns.map((column) => {
                                        const sortable = !!column.field;
                                        return (
                                            <TableCell
                                                key={column.id}
                                                sortDirection={orderBy === column.id ? order : false}
                                            >
                                                {sortable ? (
                                                    <TableSortLabel
                                                        active={orderBy === column.id}
                                                        direction={orderBy === column.id ? order : "asc"}
                                                        onClick={() => handleSort(column.id)}
                                                    >
                                                        {column.label}
                                                    </TableSortLabel>
                                                ) : (
                                                    column.label
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} align="center">
                                            Nenhum registo encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedRecords.map((record, index) => (
                                        <TableRow key={index} hover>
                                            {columns.map((column) => {
                                                const formatter = formatters[column.field] || formatters[column.id];
                                                return (
                                                    <TableCell key={`${index}-${column.id}`}>
                                                        {column.render
                                                            ? column.render(record)
                                                            : formatter
                                                                ? formatter(record[column.field])
                                                                : record[column.field] ?? "-"}
                                                    </TableCell>
                                                );
                                            })}
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
