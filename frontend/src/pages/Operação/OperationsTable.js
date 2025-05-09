import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, Paper, Box, Collapse, IconButton, useMediaQuery, useTheme
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
    renderCell,
    onRowClick,
    sx = {}
}) => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <TableContainer
            component={Paper}
            sx={{
                maxHeight: isTablet ? "calc(100vh - 340px)" : "calc(100vh - 300px)",
                overflow: "auto",
                ...sx
            }}
        >
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell
                            sx={{
                                width: '48px',
                                padding: isTablet ? '8px 4px' : '16px 8px'
                            }}
                        />
                        {columns.map((column) => (
                            <TableCell
                                key={column.id || column}
                                sx={{
                                    padding: isTablet ? '12px 8px' : '16px',
                                    fontWeight: 'bold',
                                    fontSize: isTablet ? '0.875rem' : '1rem'
                                }}
                            >
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
                            <TableRow
                                hover
                                onClick={() => onRowClick ? onRowClick(row) : null}
                                sx={{
                                    cursor: onRowClick ? 'pointer' : 'default',
                                    '&:hover': {
                                        backgroundColor: onRowClick ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                                    }
                                }}
                            >
                                <TableCell
                                    sx={{
                                        padding: isTablet ? '8px 4px' : '16px 8px',
                                        borderLeft: isRamaisView ?
                                            `4px solid ${getRemainingDaysColor(row.restdays)}` :
                                            'none'
                                    }}
                                >
                                    <IconButton
                                        size={isTablet ? "small" : "medium"}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Evitar ativar onRowClick
                                            toggleRowExpand(rowIndex);
                                        }}
                                    >
                                        {expandedRows[rowIndex] ? (
                                            <ExpandLess />
                                        ) : (
                                            <ExpandMore />
                                        )}
                                    </IconButton>
                                </TableCell>
                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id || column}
                                        sx={{
                                            padding: isTablet ? '12px 8px' : '16px',
                                            fontSize: isTablet ? '0.875rem' : '1rem',
                                            height: isTablet ? '60px' : 'auto' // Altura mínima para toque
                                        }}
                                    >
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
                                            isTablet={isTablet}
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