/**
 * TableSkeleton Component
 * Skeleton loader para tabelas com paginação
 * Usado enquanto dados estão a carregar
 *
 * Props:
 * - rows: número de linhas a mostrar (default: 10)
 * - columns: número de colunas (default: 6)
 * - showPagination: mostrar skeleton de paginação (default: true)
 */

import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';

export const TableSkeleton = ({
  rows = 10,
  columns = 6,
  showPagination = true
}) => {
  return (
    <Paper>
      <TableContainer>
        <Table>
          {/* Header */}
          <TableHead>
            <TableRow>
              {Array.from({ length: columns }).map((_, index) => (
                <TableCell key={index}>
                  <Skeleton variant="text" width="80%" height={24} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          {/* Body */}
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    {colIndex === 0 ? (
                      // Primeira coluna - normalmente ID (mais estreito)
                      <Skeleton variant="text" width={40} height={20} />
                    ) : colIndex === columns - 1 ? (
                      // Última coluna - normalmente ações (ícones)
                      <Skeleton variant="circular" width={32} height={32} />
                    ) : colIndex === columns - 2 ? (
                      // Penúltima coluna - normalmente chips/status
                      <Skeleton variant="rounded" width={80} height={24} />
                    ) : (
                      // Colunas normais
                      <Skeleton variant="text" width="90%" height={20} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {showPagination && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <Skeleton variant="text" width={120} height={24} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="text" width={80} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default TableSkeleton;
