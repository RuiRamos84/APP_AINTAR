/**
 * DataTable - Componente de tabela reutilizável e poderoso
 *
 * Funcionalidades:
 * - Paginação server-side e client-side
 * - Ordenação por colunas
 * - Filtragem avançada
 * - Seleção de linhas (single/multi)
 * - Ações em massa
 * - Export Excel/CSV
 * - Responsivo (mobile-first)
 * - Skeleton loading
 * - Empty states
 * - Acessibilidade completa
 *
 * @example
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   loading={isLoading}
 *   totalCount={totalCount}
 *   onPageChange={handlePageChange}
 *   onSort={handleSort}
 *   selectable
 *   onSelectionChange={handleSelection}
 * />
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Paper,
  IconButton,
  Toolbar,
  Typography,
  Tooltip,
  Box,
  Chip,
  useMediaQuery,
  useTheme,
  Collapse,
  alpha,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  FilterList as FilterIcon,
  ViewColumn as ColumnIcon,
  MoreVert as MoreIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { TableSkeleton } from '@/shared/components/feedback';
import { EmptyState } from '@/shared/components/feedback';
import PropTypes from 'prop-types';

/**
 * Componente DataTable principal
 */
export const DataTable = ({
  // Dados
  columns = [],
  data = [],
  loading = false,
  error = null,
  emptyMessage = 'Sem dados para apresentar',
  emptyDescription = 'Não foram encontrados registos.',

  // Paginação
  page = 0,
  rowsPerPage = 10,
  totalCount = 0,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25, 50, 100],
  paginationMode = 'server', // 'server' | 'client'

  // Ordenação
  orderBy = '',
  order = 'asc',
  onSort,

  // Seleção
  selectable = false,
  selected = [],
  onSelectionChange,
  selectAllEnabled = true,

  // Ações
  bulkActions = [],
  rowActions = [],
  onRowClick,

  // Expansão de linhas
  expandable = false,
  renderExpandedRow,

  // Customização
  dense = false,
  stickyHeader = false,
  maxHeight,
  minHeight,
  striped = true,
  hover = true,

  // Export
  exportable = false,
  exportFileName = 'export',
  onExport,

  // Filters
  filterable = false,
  onFilterClick,

  // Column visibility
  columnVisibility = {},
  onColumnVisibilityChange,

  // Mobile
  mobileBreakpoint = 'md',
  mobileCardRenderer,

  // Customização avançada
  sx = {},
  tableProps = {},
  paperProps = {},

  // Callbacks
  onRefresh,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(mobileBreakpoint));

  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Estado interno para paginação (Client-Side) quando não controlado
  const [internalPage, setInternalPage] = useState(page);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(rowsPerPage);

  // Determinar se estamos em modo controlado ou não
  const isControlled = typeof onPageChange === 'function';
  const currentPage = isControlled ? page : internalPage;
  const currentRowsPerPage = isControlled ? rowsPerPage : internalRowsPerPage;

  // Reset paginação quando dados mudam (Pesquisa/Filtros)
  React.useEffect(() => {
      if (!isControlled && paginationMode === 'client') {
          setInternalPage(0);
      }
  }, [data, isControlled, paginationMode]);

  // Handlers
  const handlePageChange = useCallback((event, newPage) => {
    if (isControlled) {
       onPageChange(event, newPage);
    } else {
       setInternalPage(newPage);
    }
  }, [isControlled, onPageChange]);

  const handleRowsPerPageChange = useCallback((event) => {
    const newRows = parseInt(event.target.value, 10);
    if (onRowsPerPageChange) {
        onRowsPerPageChange(event);
    } else {
        setInternalRowsPerPage(newRows);
        setInternalPage(0); // Reset para primeira página
    }
  }, [onRowsPerPageChange]);

  // Colunas visíveis
  const visibleColumns = useMemo(() => {
    return columns.filter(col => columnVisibility[col.id] !== false);
  }, [columns, columnVisibility]);

  // Dados paginados (client-side)
  const paginatedData = useMemo(() => {
    if (paginationMode === 'server') return data;

    const startIndex = currentPage * currentRowsPerPage;
    const endIndex = startIndex + currentRowsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, currentRowsPerPage, paginationMode]);

  // Total count
  const dataCount = paginationMode === 'server' ? totalCount : data.length;

  // Seleção
  const isAllSelected = selected.length > 0 && selected.length === paginatedData.length;
  const isSomeSelected = selected.length > 0 && selected.length < paginatedData.length;

  const handleSelectAll = useCallback((event) => {
    if (event.target.checked) {
      const allIds = paginatedData.map(row => row.id);
      onSelectionChange?.(allIds);
    } else {
      onSelectionChange?.([]);
    }
  }, [paginatedData, onSelectionChange]);

  const handleSelectRow = useCallback((event, id) => {
    event.stopPropagation();

    if (selected.includes(id)) {
      onSelectionChange?.(selected.filter(selectedId => selectedId !== id));
    } else {
      onSelectionChange?.([...selected, id]);
    }
  }, [selected, onSelectionChange]);

  // Ordenação
  const handleSort = useCallback((columnId) => {
    const isAsc = orderBy === columnId && order === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    onSort?.(columnId, newOrder);
  }, [orderBy, order, onSort]);

  // Expansão
  const handleToggleExpand = useCallback((rowId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Export
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport(selected.length > 0 ? selected : null);
    }
  }, [onExport, selected]);

  // Loading state
  if (loading && data.length === 0) {
    return (
      <Paper {...paperProps}>
        <TableSkeleton rows={currentRowsPerPage} columns={visibleColumns.length} />
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper {...paperProps}>
        <Box p={4}>
          <EmptyState
            title="Erro ao carregar dados"
            description={error.message || 'Ocorreu um erro inesperado.'}
            icon="error"
          />
        </Box>
      </Paper>
    );
  }

  // Empty state
  if (!loading && paginatedData.length === 0) {
    return (
      <Paper {...paperProps}>
        <Box p={4}>
          <EmptyState
            title={emptyMessage}
            description={emptyDescription}
          />
        </Box>
      </Paper>
    );
  }

  // Mobile Card View
  if (isMobile && mobileCardRenderer) {
    return (
      <Box sx={sx}>
        {paginatedData.map((row, index) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            {mobileCardRenderer(row, index)}
          </motion.div>
        ))}

        <TablePagination
          component="div"
          count={dataCount}
          page={page}
          onPageChange={onPageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </Box>
    );
  }

  return (
    <Paper {...paperProps} sx={{ width: '100%', overflow: 'hidden', ...sx }}>
      {/* Toolbar com ações */}
      {(selectable && selected.length > 0) || exportable || filterable ? (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            ...(selected.length > 0 && {
              bgcolor: (theme) =>
                alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
            }),
          }}
        >
          {selected.length > 0 ? (
            <>
              <Typography
                sx={{ flex: '1 1 100%' }}
                color="inherit"
                variant="subtitle1"
                component="div"
              >
                {selected.length} selecionado{selected.length > 1 ? 's' : ''}
              </Typography>

              {bulkActions.map((action, index) => (
                <Tooltip key={index} title={action.label}>
                  <IconButton
                    onClick={() => action.onClick(selected)}
                    color={action.color || 'default'}
                  >
                    {action.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </>
          ) : (
            <>
              <Typography
                sx={{ flex: '1 1 100%' }}
                variant="h6"
                component="div"
              >
                {/* Título opcional */}
              </Typography>

              {filterable && (
                <Tooltip title="Filtrar">
                  <IconButton onClick={onFilterClick}>
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
              )}

              {exportable && (
                <Tooltip title="Exportar">
                  <IconButton onClick={handleExport}>
                    <ExportIcon />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Toolbar>
      ) : null}

      {/* Tabela */}
      <TableContainer
        sx={{
          maxHeight: maxHeight,
          minHeight: minHeight,
        }}
      >
        <Table
          stickyHeader={stickyHeader}
          size={dense ? 'small' : 'medium'}
          {...tableProps}
        >
          <TableHead>
            <TableRow>
              {/* Coluna de seleção */}
              {selectable && (
                <TableCell padding="checkbox">
                  {selectAllEnabled && (
                    <Checkbox
                      color="primary"
                      indeterminate={isSomeSelected}
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      inputProps={{
                        'aria-label': 'Selecionar todas as linhas',
                      }}
                    />
                  )}
                </TableCell>
              )}

              {/* Coluna de expansão */}
              {expandable && <TableCell padding="checkbox" />}

              {/* Colunas de dados */}
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  padding={column.disablePadding ? 'none' : 'normal'}
                  sortDirection={orderBy === column.id ? order : false}
                  sx={{
                    minWidth: column.minWidth,
                    width: column.width,
                    fontWeight: 600,
                  }}
                >
                  {column.sortable !== false && onSort ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}

              {/* Coluna de ações */}
              {rowActions.length > 0 && (
                <TableCell align="right" padding="checkbox">
                  Ações
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            <AnimatePresence>
              {paginatedData.map((row, index) => {
                const rowKey = row.id || row.pk || index;
                const isSelected = selected.includes(rowKey);
                const isExpanded = expandedRows.has(rowKey);

                return (
                  // Usamos Fragment para suportar a linha expandida adjacente
                  <React.Fragment key={rowKey}>
                    <TableRow
                      component={motion.tr}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      hover={hover}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={-1}
                      selected={isSelected}
                      sx={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        ...(striped && index % 2 !== 0 && {
                          bgcolor: (theme) => alpha(theme.palette.action.hover, 0.04),
                        }),
                      }}
                    >
                      {/* Seleção */}
                      {selectable && (
                        <TableCell padding="checkbox">
                          <Checkbox
                            color="primary"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(e, rowKey)}
                            inputProps={{
                              'aria-labelledby': `table-checkbox-${index}`,
                            }}
                          />
                        </TableCell>
                      )}

                      {/* Expansão */}
                      {expandable && (
                        <TableCell padding="checkbox">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpand(rowKey);
                            }}
                          >
                            {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                          </IconButton>
                        </TableCell>
                      )}

                      {/* Dados */}
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          align={column.align || 'left'}
                        >
                          {column.render
                            ? column.render(row[column.id], row, index)
                            : row[column.id]}
                        </TableCell>
                      ))}

                      {/* Ações */}
                      {rowActions.length > 0 && (
                        <TableCell align="right" padding="checkbox">
                          <IconButton size="small">
                            <MoreIcon />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Linha expandida */}
                    {expandable && (
                      <TableRow>
                        <TableCell
                          style={{ paddingBottom: 0, paddingTop: 0 }}
                          colSpan={
                            visibleColumns.length +
                            (selectable ? 1 : 0) +
                            (expandable ? 1 : 0) +
                            (rowActions.length > 0 ? 1 : 0)
                          }
                        >
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 2 }}>
                              {renderExpandedRow?.(row)}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      <TablePagination
        rowsPerPageOptions={rowsPerPageOptions}
        component="div"
        count={dataCount}
        rowsPerPage={currentRowsPerPage}
        page={currentPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
        }
      />
    </Paper>
  );
};

DataTable.propTypes = {
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      minWidth: PropTypes.number,
      width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      align: PropTypes.oneOf(['left', 'center', 'right']),
      sortable: PropTypes.bool,
      render: PropTypes.func,
      disablePadding: PropTypes.bool,
    })
  ).isRequired,
  data: PropTypes.array,
  loading: PropTypes.bool,
  error: PropTypes.object,
  emptyMessage: PropTypes.string,
  emptyDescription: PropTypes.string,
  page: PropTypes.number,
  rowsPerPage: PropTypes.number,
  totalCount: PropTypes.number,
  onPageChange: PropTypes.func,
  onRowsPerPageChange: PropTypes.func,
  rowsPerPageOptions: PropTypes.array,
  paginationMode: PropTypes.oneOf(['server', 'client']),
  orderBy: PropTypes.string,
  order: PropTypes.oneOf(['asc', 'desc']),
  onSort: PropTypes.func,
  selectable: PropTypes.bool,
  selected: PropTypes.array,
  onSelectionChange: PropTypes.func,
  selectAllEnabled: PropTypes.bool,
  bulkActions: PropTypes.array,
  rowActions: PropTypes.array,
  onRowClick: PropTypes.func,
  expandable: PropTypes.bool,
  renderExpandedRow: PropTypes.func,
  dense: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  maxHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  minHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  striped: PropTypes.bool,
  hover: PropTypes.bool,
  exportable: PropTypes.bool,
  exportFileName: PropTypes.string,
  onExport: PropTypes.func,
  filterable: PropTypes.bool,
  onFilterClick: PropTypes.func,
  columnVisibility: PropTypes.object,
  onColumnVisibilityChange: PropTypes.func,
  mobileBreakpoint: PropTypes.string,
  mobileCardRenderer: PropTypes.func,
  sx: PropTypes.object,
  tableProps: PropTypes.object,
  paperProps: PropTypes.object,
  onRefresh: PropTypes.func,
};

export default DataTable;
