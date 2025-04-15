import React, { useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TableSortLabel, Paper, Typography, Select, MenuItem,
  FormControl, InputLabel, Chip
} from '@mui/material';
import { formatNumber, formatPercent } from '../utils/formatters';

/**
 * Visualização em formato de tabela aprimorada com ordenação, paginação e filtros
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para a tabela
 * @param {string} props.viewName - Nome da view
 * @returns {React.ReactElement}
 */
const TableView = ({ data, viewName }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('val');
  const [order, setOrder] = useState('desc');
  const [yearFilter, setYearFilter] = useState('all');

  // Se não tiver dados, mostrar mensagem
  if (!data || data.length === 0) {
    return (
      <Box sx={{
        height: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          Sem dados para exibir
        </Typography>
      </Box>
    );
  }

  // Extrair anos disponíveis para filtrar
  const availableYears = [...new Set(data.map(item => item.year))].sort();

  // Filtrar dados por ano se necessário
  const yearFilteredData = yearFilter === 'all'
    ? data
    : data.filter(item => item.year === yearFilter);

  // Determinar a coluna principal com base na view
  const mainColumn = viewName.includes('003') ? 'par1' : 'par';

  // Verificar se temos dados de município
  const hasMunicipio = data.some(item => item.par1 && item.par1.startsWith('Município'));

  // Processar dados - limpar nomes de municípios
  const processedData = hasMunicipio
    ? yearFilteredData.map(item => ({
      ...item,
      displayPar: item.par1 ? item.par1.replace('Município de ', '') : item.par
    }))
    : yearFilteredData.map(item => ({
      ...item,
      displayPar: item.par
    }));

  // Calcular total para percentuais
  const totalCount = processedData.reduce((sum, item) => sum + (item.val || (item.val1 || 0)), 0);

  // Handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Ordenar dados
  const sortedData = [...processedData].sort((a, b) => {
    let aValue = a[orderBy];
    let bValue = b[orderBy];

    // Se for ordenação por string
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (order === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    }

    // Se for ordenação por número
    if (order === 'asc') {
      return (aValue || 0) - (bValue || 0);
    } else {
      return (bValue || 0) - (aValue || 0);
    }
  });

  // Colunas da tabela com base na view
  const getColumns = () => {
    const hasMultiValues = data.length > 0 &&
      (data[0].val1 !== undefined || data[0].val2 !== undefined);

    if (viewName.includes('003')) {
      return [
        { id: 'displayPar', label: 'Município', numeric: false },
        { id: 'par2', label: 'Tipo', numeric: false },
        { id: 'year', label: 'Ano', numeric: true },
        { id: 'val', label: 'Quantidade', numeric: true },
        { id: 'percent', label: '% do Total', numeric: true }
      ];
    } else if (hasMultiValues) {
      return [
        { id: 'displayPar', label: 'Descrição', numeric: false },
        { id: 'year', label: 'Ano', numeric: true },
        { id: 'val1', label: 'Quantidade', numeric: true },
        { id: 'val2', label: 'Mínimo (horas)', numeric: true },
        { id: 'val3', label: 'Máximo (horas)', numeric: true },
        { id: 'val4', label: 'Média (horas)', numeric: true }
      ];
    } else {
      return [
        { id: 'displayPar', label: 'Descrição', numeric: false },
        { id: 'year', label: 'Ano', numeric: true },
        { id: 'val', label: 'Quantidade', numeric: true },
        { id: 'percent', label: '% do Total', numeric: true }
      ];
    }
  };

  const columns = getColumns();

  // Renderizar valor da célula com base no tipo de coluna
  const renderCellValue = (row, column) => {
    if (column.id === 'percent') {
      const value = row.val || (row.val1 || 0);
      return formatPercent(value / totalCount);
    }

    if (column.numeric && column.id !== 'year') {
      return formatNumber(row[column.id] || 0);
    }

    return row[column.id] || '';
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filtro de ano se houver múltiplos anos */}
      {availableYears.length > 1 && (
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ width: 120 }}>
            <InputLabel id="year-filter-label-table">Ano</InputLabel>
            <Select
              labelId="year-filter-label-table"
              value={yearFilter}
              label="Ano"
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(0); // Reset to first page on filter change
              }}
            >
              <MenuItem value="all">Todos</MenuItem>
              {availableYears.map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total de registros: <Chip label={sortedData.length} size="small" color="primary" />
            </Typography>
          </Box>
        </Box>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden', flex: 1 }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.numeric ? 'right' : 'left'}
                    sortDirection={orderBy === column.id ? order : false}
                    sx={{ fontWeight: 'bold', backgroundColor: theme => theme.palette.background.default }}
                  >
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleRequestSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <TableRow key={index} hover sx={{
                    '&:nth-of-type(odd)': {
                      backgroundColor: theme => theme.palette.action.hover,
                    },
                  }}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.numeric ? 'right' : 'left'}
                      >
                        {renderCellValue(row, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          count={sortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>
    </Box>
  );
};

export default TableView;