/**
 * useDataTable - Hook para facilitar o uso do DataTable
 *
 * Gerencia estado de paginação, ordenação, seleção e filtros
 *
 * @example
 * const {
 *   page,
 *   rowsPerPage,
 *   orderBy,
 *   order,
 *   selected,
 *   handlePageChange,
 *   handleSort,
 *   handleSelectionChange,
 *   resetTable,
 * } = useDataTable({
 *   defaultOrderBy: 'created_at',
 *   defaultOrder: 'desc',
 * });
 */

import { useState, useCallback } from 'react';

export const useDataTable = ({
  defaultPage = 0,
  defaultRowsPerPage = 10,
  defaultOrderBy = '',
  defaultOrder = 'asc',
  defaultSelected = [],
} = {}) => {
  // Paginação
  const [page, setPage] = useState(defaultPage);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  // Ordenação
  const [orderBy, setOrderBy] = useState(defaultOrderBy);
  const [order, setOrder] = useState(defaultOrder);

  // Seleção
  const [selected, setSelected] = useState(defaultSelected);

  // Handlers
  const handlePageChange = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  const handleSort = useCallback((columnId, newOrder) => {
    setOrderBy(columnId);
    setOrder(newOrder);
    setPage(0); // Reset to first page on sort
  }, []);

  const handleSelectionChange = useCallback((newSelected) => {
    setSelected(newSelected);
  }, []);

  const handleSelectAll = useCallback((data) => {
    if (selected.length === data.length) {
      setSelected([]);
    } else {
      setSelected(data.map(item => item.id));
    }
  }, [selected.length]);

  const handleSelectOne = useCallback((id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(selectedId => selectedId !== id));
    } else {
      setSelected([...selected, id]);
    }
  }, [selected]);

  const resetTable = useCallback(() => {
    setPage(defaultPage);
    setRowsPerPage(defaultRowsPerPage);
    setOrderBy(defaultOrderBy);
    setOrder(defaultOrder);
    setSelected(defaultSelected);
  }, [defaultPage, defaultRowsPerPage, defaultOrderBy, defaultOrder, defaultSelected]);

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  return {
    // Estado
    page,
    rowsPerPage,
    orderBy,
    order,
    selected,

    // Setters diretos (se precisar)
    setPage,
    setRowsPerPage,
    setOrderBy,
    setOrder,
    setSelected,

    // Handlers
    handlePageChange,
    handleRowsPerPageChange,
    handleSort,
    handleSelectionChange,
    handleSelectAll,
    handleSelectOne,

    // Utilitários
    resetTable,
    clearSelection,

    // Estado computado
    hasSelection: selected.length > 0,
    selectedCount: selected.length,
  };
};

export default useDataTable;
