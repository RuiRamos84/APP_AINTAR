import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Stack,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  alpha,
  useTheme,
} from '@mui/material';
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { PortalPageHeader } from '@/shared/components/layout/PortalPageHeader';
import { useMeusPedidos } from '../hooks/useMeusPedidos';
import { useSearch } from '@/shared/hooks';
import { SearchBar } from '@/shared/components/data';
import PedidoCard from '../components/PedidoCard';
import { parseDate } from '@/features/documents/utils/documentUtils';

const PAGE_SIZE_OPTIONS = [10, 15, 20];

const PortalPedidosPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, refetch, isFetching } = useMeusPedidos();

  /* Todos os pedidos do utilizador ordenados do mais recente */
  const allSorted = useMemo(() => {
    const raw = Array.isArray(data) ? data : (data?.document_owner ?? []);
    return [...raw].sort(
      (a, b) => (parseDate(b.submission) ?? 0) - (parseDate(a.submission) ?? 0)
    );
  }, [data]);

  /* Pesquisa client-side */
  const filtered = useSearch(allSorted, searchTerm);

  /* Reset página quando muda pesquisa ou pageSize */
  React.useEffect(() => { setPage(1); }, [searchTerm, pageSize]);

  /* Slice da página atual */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Box sx={{
              display: 'flex', alignItems: 'center', flexShrink: 0,
              borderRadius: '10px', overflow: 'hidden',
              boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
              '&:hover': { boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.35)}` },
              transition: 'box-shadow 0.2s',
            }}>
              <SearchBar
                searchTerm={searchTerm}
                onSearch={setSearchTerm}
                placeholder="Pesquisar..."
              />
            </Box>
            <Button
              variant="text"
              onClick={() => refetch()}
              disabled={isFetching}
              sx={{
                borderRadius: '12px', minWidth: 40, width: 40, height: 40, p: 0, flexShrink: 0,
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                '&:hover': { boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.35)}` },
              }}
            >
              <RefreshIcon fontSize="small" />
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/novo-pedido')}
              sx={{
                borderRadius: '12px', px: 3, py: 1, flexShrink: 0,
                boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.25)}`,
                '&:hover': { boxShadow: `0 12px 20px ${alpha(theme.palette.primary.main, 0.35)}` },
              }}
            >
              Novo Pedido
            </Button>
          </Stack>
        }
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Lista */}
        {pageItems.length > 0 ? (
          <Grid container spacing={3}>
            {pageItems.map((pedido) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pedido.pk}>
                <PedidoCard
                  pedido={pedido}
                  onClick={(p) => navigate(`/pedidos/${p.pk}`)}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{
            py: 10, textAlign: 'center',
            bgcolor: alpha(theme.palette.divider, 0.03),
            borderRadius: 6, border: '2px dashed', borderColor: 'divider',
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {searchTerm ? 'Nenhum pedido encontrado para esta pesquisa.' : 'Ainda não tem pedidos submetidos.'}
            </Typography>
            {!searchTerm && (
              <Button variant="text" startIcon={<AddIcon />} onClick={() => navigate('/novo-pedido')} sx={{ mt: 1 }}>
                Submeter o meu primeiro pedido
              </Button>
            )}
          </Box>
        )}

        {/* Paginação */}
        {filtered.length > 0 && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 4, flexWrap: 'wrap', gap: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">
                Pedidos por página:
              </Typography>
              <FormControl size="small">
                <Select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  sx={{ borderRadius: 2, fontSize: '0.875rem' }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <MenuItem key={n} value={n}>{n}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="body2" color="text.disabled">
                ({filtered.length} no total)
              </Typography>
            </Stack>

            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(_, p) => setPage(p)}
              color="primary"
              shape="rounded"
              showFirstButton
              showLastButton
            />
          </Stack>
        )}
      </Container>
    </>
  );
};

export default PortalPedidosPage;
