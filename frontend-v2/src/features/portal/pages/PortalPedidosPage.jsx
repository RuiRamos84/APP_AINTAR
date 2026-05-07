import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  CircularProgress, 
  Button,
  Stack,
  alpha,
  useTheme,
  TablePagination
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
import { useMeusPedidos } from '../hooks/useMeusPedidos';
import { useDebounce } from '@/shared/hooks';
import { SearchBar } from '@/shared/components/data';
import PedidoCard from '../components/PedidoCard';

/**
 * PortalPedidosPage
 * Página principal do Portal do Cliente - Listagem de Pedidos.
 */
const PortalPedidosPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);

  // Fetch data with pagination
  const { data, isLoading, refetch, isFetching } = useMeusPedidos({
    limit: rowsPerPage,
    offset: page * rowsPerPage,
    search: debouncedSearch,
    sort_by: 'submission',
    sort_order: 'desc'
  });

  // Reset page when search changes
  React.useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // Extract results and total from response
  // Backend often returns { document_owner: [], total: 100 } for paginated requests
  const rawResults = Array.isArray(data) ? data : (data?.document_owner || []);
  const totalCount = data?.total || (Array.isArray(data) ? data.length : 0);

  // Safeguard: Sort results locally by date (most recent first) 
  // Note: Only effective for the current page if server-side pagination is active
  const results = [...rawResults].sort((a, b) => {
    return new Date(b.submission) - new Date(a.submission);
  });

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 20 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <>
      <PortalPageHeader
        title="Os Meus Pedidos"
        subtitle="Acompanhe o estado e histórico dos seus requerimentos."
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/novo-pedido')}
            sx={{
              borderRadius: '12px', px: 3, py: 1,
              boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
              '&:hover': { boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.35)}` },
            }}
          >
            Novo Pedido
          </Button>
        }
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Barra de Ferramentas: Pesquisa e Refresh */}
      <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
        <Box sx={{ flexGrow: 1 }}>
          <SearchBar 
            searchTerm={searchTerm} 
            onSearch={setSearchTerm} 
            placeholder="Pesquisar por nº de registo ou tipo..."
          />
        </Box>
        <Button 
          variant="outlined" 
          onClick={() => refetch()}
          disabled={isFetching}
          sx={{ borderRadius: '12px', minWidth: '48px', p: 0 }}
        >
          <RefreshIcon className={isFetching ? 'animate-spin' : ''} />
        </Button>
      </Stack>

      {/* Lista de Resultados */}
      {results.length > 0 ? (
        <Grid container spacing={3}>
          {results.map((pedido) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pedido.pk}>
              <PedidoCard 
                pedido={pedido} 
                onClick={(p) => navigate(`/pedidos/${p.pk}`)} 
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box 
          sx={{ 
            py: 10, 
            textAlign: 'center', 
            bgcolor: alpha(theme.palette.divider, 0.03),
            borderRadius: 6,
            border: '2px dashed',
            borderColor: 'divider'
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'Nenhum pedido encontrado para esta pesquisa.' : 'Ainda não tem pedidos submetidos.'}
          </Typography>
          {!searchTerm && (
            <Button 
              variant="text" 
              startIcon={<AddIcon />}
              onClick={() => navigate('/novo-pedido')}
              sx={{ mt: 1 }}
            >
              Submeter o meu primeiro pedido
            </Button>
          )}
        </Box>
      )}

      {results.length > 0 && (
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[6, 12, 24]}
            labelRowsPerPage="Pedidos por página:"
            sx={{
              border: 'none',
              '& .MuiTablePagination-toolbar': {
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                borderRadius: '12px',
              }
            }}
          />
        </Box>
      )}
    </Container>
    </>
  );
};

export default PortalPedidosPage;
