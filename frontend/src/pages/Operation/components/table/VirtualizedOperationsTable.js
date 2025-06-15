// frontend/src/pages/Operation/components/table/VirtualizedOperationsTable.js
import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Paper, Table, TableHead, TableRow, TableCell, Box } from '@mui/material';

const ROW_HEIGHT = 70;

const VirtualRow = memo(({ index, style, data }) => {
    const { items, columns, renderCell, onRowClick } = data;
    const row = items[index];

    return (
        <div style={style}>
            <TableRow
                hover
                onClick={() => onRowClick?.(row)}
                sx={{
                    cursor: 'pointer',
                    height: ROW_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    px: 2
                }}
            >
                {columns.map((column) => (
                    <TableCell
                        key={column.id}
                        sx={{
                            flex: 1,
                            borderBottom: 'none',
                            py: 1
                        }}
                    >
                        {renderCell(column, row)}
                    </TableCell>
                ))}
            </TableRow>
        </div>
    );
});

const VirtualizedOperationsTable = memo(({
    data,
    columns,
    renderCell,
    onRowClick,
    maxHeight = '70vh'
}) => {
    const listData = useMemo(() => ({
        items: data,
        columns,
        renderCell,
        onRowClick
    }), [data, columns, renderCell, onRowClick]);

    if (data.length === 0) {
        return (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                Sem dados
            </Box>
        );
    }

    return (
        <Paper sx={{ borderRadius: 3 }}>
            <Table stickyHeader>
                <TableHead>
                    <TableRow>
                        {columns.map((column) => (
                            <TableCell
                                key={column.id}
                                sx={{
                                    fontWeight: 'bold',
                                    bgcolor: 'background.paper'
                                }}
                            >
                                {column.label}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
            </Table>

            <List
                height={Math.min(data.length * ROW_HEIGHT, parseInt(maxHeight))}
                itemCount={data.length}
                itemSize={ROW_HEIGHT}
                itemData={listData}
                overscanCount={5}
            >
                {VirtualRow}
            </List>
        </Paper>
    );
});

VirtualizedOperationsTable.displayName = 'VirtualizedOperationsTable';

export default VirtualizedOperationsTable;