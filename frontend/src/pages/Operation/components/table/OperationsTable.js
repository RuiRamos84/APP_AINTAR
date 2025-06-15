// frontend/src/pages/Operation/components/table/OperationsTable.js - MEMOIZADO
import React, { memo, useMemo } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, Paper, Box, Collapse, IconButton, Checkbox,
    useMediaQuery, useTheme
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import TableDetails from './TableDetails';

const OperationsTable = memo(({
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
    selectable = false,
    selectedItems = [],
    onSelectionChange,
    sx = {}
}) => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));

    // Memoizar handlers para evitar re-renders
    const handleSelectAll = useMemo(() => (event) => {
        if (event.target.checked) {
            const allIds = data.map(row => row.pk);
            onSelectionChange?.(allIds);
        } else {
            onSelectionChange?.([]);
        }
    }, [data, onSelectionChange]);

    const handleSelect = useMemo(() => (event, pk) => {
        event.stopPropagation();
        if (selectedItems.includes(pk)) {
            onSelectionChange?.(selectedItems.filter(id => id !== pk));
        } else {
            onSelectionChange?.([...selectedItems, pk]);
        }
    }, [selectedItems, onSelectionChange]);

    const allSelected = useMemo(() =>
        selectable && data.length > 0 && data.every(row => selectedItems.includes(row.pk)),
        [selectable, data, selectedItems]
    );

    const scrollStyles = useMemo(() => ({
        maxHeight: isTablet ? "calc(100vh - 340px)" : "calc(100vh - 300px)",
        overflow: "auto",
        ...sx,
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        '&::-webkit-scrollbar': {
            width: isTablet ? '8px' : '12px',
            height: isTablet ? '8px' : '12px'
        },
        '&::-webkit-scrollbar-track': {
            background: theme.palette.background.default
        },
        '&::-webkit-scrollbar-thumb': {
            background: theme.palette.action.disabled,
            borderRadius: '4px'
        }
    }), [isTablet, theme, sx]);

    return (
        <TableContainer component={Paper} sx={scrollStyles}>
            <Table stickyHeader sx={{
                '& .MuiTableCell-root': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    minHeight: isTablet ? 60 : 48,
                    lineHeight: isTablet ? 1.6 : 1.5,
                }
            }}>
                <TableHead>
                    <TableRow>
                        {selectable && (
                            <TableCell sx={{
                                width: '48px',
                                padding: isTablet ? '8px 4px' : '8px',
                                background: theme.palette.background.paper
                            }}>
                                <Checkbox
                                    indeterminate={selectedItems.length > 0 && !allSelected}
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    size="small"
                                />
                            </TableCell>
                        )}

                        <TableCell sx={{
                            width: '48px',
                            padding: isTablet ? '8px 4px' : '16px 8px',
                            background: theme.palette.background.paper
                        }} />

                        {columns.map((column) => (
                            <TableCell
                                key={column.id || column}
                                sx={{
                                    padding: isTablet ? '12px 8px' : '16px',
                                    fontWeight: 'bold',
                                    fontSize: isTablet ? '0.9rem' : '1rem',
                                    background: theme.palette.background.paper,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1
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
                        <React.Fragment key={row.pk || rowIndex}>
                            <TableRow
                                hover
                                onClick={() => onRowClick?.(row)}
                                sx={{
                                    cursor: onRowClick ? 'pointer' : 'default',
                                    '&:hover': {
                                        backgroundColor: onRowClick ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
                                    },
                                    height: isTablet ? 70 : 60,
                                    borderLeft: isRamaisView && row.restdays !== undefined ?
                                        `4px solid ${getRemainingDaysColor(row.restdays)}` :
                                        'none',
                                    ...(selectable && selectedItems.includes(row.pk) && {
                                        backgroundColor: 'action.selected',
                                        '&:hover': { backgroundColor: 'action.hover' }
                                    })
                                }}
                            >
                                {selectable && (
                                    <TableCell sx={{ padding: isTablet ? '8px 4px' : '8px' }}>
                                        <Checkbox
                                            checked={selectedItems.includes(row.pk)}
                                            onChange={(e) => handleSelect(e, row.pk)}
                                            size="small"
                                        />
                                    </TableCell>
                                )}

                                <TableCell sx={{ padding: isTablet ? '8px 4px' : '16px 8px' }}>
                                    <IconButton
                                        size={isTablet ? "small" : "medium"}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRowExpand(rowIndex);
                                        }}
                                        sx={{
                                            padding: isTablet ? '6px' : '8px'
                                        }}
                                    >
                                        {expandedRows[rowIndex] ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                </TableCell>

                                {columns.map((column) => (
                                    <TableCell
                                        key={column.id || column}
                                        sx={{
                                            padding: isTablet ? '12px 8px' : '16px',
                                            fontSize: isTablet ? '0.9rem' : '1rem',
                                            minHeight: isTablet ? 60 : 48,
                                            verticalAlign: 'middle'
                                        }}
                                    >
                                        {renderCell(column, row)}
                                    </TableCell>
                                ))}
                            </TableRow>

                            <TableRow>
                                <TableCell
                                    style={{ paddingBottom: 0, paddingTop: 0, border: 0 }}
                                    colSpan={columns.length + (selectable ? 2 : 1)}
                                >
                                    <Collapse in={expandedRows[rowIndex]} timeout="auto" unmountOnExit>
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
}, (prevProps, nextProps) => {
    // Comparação optimizada
    return (
        prevProps.data.length === nextProps.data.length &&
        prevProps.orderBy === nextProps.orderBy &&
        prevProps.order === nextProps.order &&
        JSON.stringify(prevProps.expandedRows) === JSON.stringify(nextProps.expandedRows) &&
        JSON.stringify(prevProps.selectedItems) === JSON.stringify(nextProps.selectedItems)
    );
});

OperationsTable.displayName = 'OperationsTable';

export default OperationsTable;