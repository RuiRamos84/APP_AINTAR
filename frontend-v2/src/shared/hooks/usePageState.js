/**
 * usePageState
 *
 * Encapsula os três estados universais de uma página com dados:
 * loading → error → empty → content
 *
 * @example
 * const { isLoading, isError, isEmpty, errorMessage } = usePageState(query, data);
 *
 * if (isLoading) return <TableSkeleton />;
 * if (isError)   return <EmptyState variant="error" title="Erro" message={errorMessage} />;
 * if (isEmpty)   return <EmptyList onAdd={handleCreate} />;
 * return <MyList data={data} />;
 */

/**
 * @param {object} query   - Objecto React Query: { isLoading, isFetching, isError, error }
 * @param {Array}  [data]  - Array de dados — para calcular isEmpty
 * @returns {{ isLoading, isError, isEmpty, isRefreshing, errorMessage }}
 */
export function usePageState(query, data) {
  const { isLoading = false, isFetching = false, isError = false, error = null } = query ?? {};

  const isRefreshing = !isLoading && isFetching;

  const isEmpty = !isLoading && !isError && Array.isArray(data) && data.length === 0;

  const errorMessage =
    error?.response?.data?.message ||
    error?.message ||
    'Ocorreu um erro ao carregar os dados. Tente novamente.';

  return { isLoading, isError, isEmpty, isRefreshing, errorMessage };
}
