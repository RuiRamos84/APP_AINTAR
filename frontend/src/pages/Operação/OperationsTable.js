import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, Paper, Box, Collapse, IconButton
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import TableDetails from './TableDetails';

const OperationsTable = ({
    data,
    columns,
    orderBy,
    order,
    onRequestSort,
    expandedRows,
    toggleRowExpand,
    isRamaisView,
    getRemainingDaysColor,
    getAddressString,
    renderCell
}) => {
    return (
        <TableContainer
            component={Paper}
            sx={{ maxHeight: "calc(100vh - 300px)", overflow: "auto" }}
        >
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell />
                        {columns.map((column) => (
                            <TableCell key={column.id || column}>
                                <TableSortLabel
                                    active={orderBy === (column.id || column)}
                                    direction={orderBy === (column.id || column) ? order : "asc"}
                                    onClick={() => onRequestSort(column.id || column)}
                                >
                                    {column.label}
                                </TableSortLabel>
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            <TableRow>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={() => toggleRowExpand(rowIndex)}
                                    >
                                        {expandedRows[rowIndex] ? (
                                            <ExpandLess />
                                        ) : (
                                            <ExpandMore />
                                        )}
                                    </IconButton>
                                </TableCell>
                                {columns.map((column) => (
                                    <TableCell key={column.id || column}>
                                        {renderCell(column, row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                            <TableRow>
                                <TableCell
                                    style={{ paddingBottom: 0, paddingTop: 0 }}
                                    colSpan={columns.length + 1}
                                >
                                    <Collapse
                                        in={expandedRows[rowIndex]}
                                        timeout="auto"
                                        unmountOnExit
                                    >
                                        <TableDetails
                                            row={row}
                                            isRamaisView={isRamaisView}
                                            getAddressString={getAddressString}
                                        />
                                    </Collapse>
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};

export default OperationsTable;