import React from 'react';
import { TableCell, TableSortLabel } from '@mui/material';

/**
 * Célula de cabeçalho de tabela com suporte a ordenação.
 * Props:
 *   label       - texto da coluna
 *   field       - chave para ordenar (corresponde à chave do objeto de dados)
 *   sortKey     - chave atualmente activa (de useSortable)
 *   sortDir     - direção activa ('asc' | 'desc')
 *   onSort      - callback (field) => void
 *   ...rest     - props do TableCell (align, sx, etc.)
 */
const SortableHeadCell = ({ label, field, sortKey, sortDir, onSort, ...rest }) => (
    <TableCell {...rest}>
        <TableSortLabel
            active={sortKey === field}
            direction={sortKey === field ? sortDir : 'asc'}
            onClick={() => onSort(field)}
        >
            {label}
        </TableSortLabel>
    </TableCell>
);

export default SortableHeadCell;
