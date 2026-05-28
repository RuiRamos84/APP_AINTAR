import React, { useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Link,
  Stack,
  Grid,
  Button,
  Card,
  CardContent,
  TablePagination,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Edit as EditIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Description as ContractIcon,
} from '@mui/icons-material';
import DataTable from '@/shared/components/data/DataTable/DataTable';
import { useDataTable } from '@/shared/components/data/DataTable/useDataTable';
import { useSearch } from '@/shared/hooks';
import { useEntityStore } from '../store/entityStore';
import { useEntities } from '../hooks/useEntities';
import { EntityForm } from './EntityForm';
import { ContractFormModal } from '@/features/payments/components/ContractFormModal';
import { usePermissions } from '@/core/contexts/PermissionContext';

const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
};

export const EntityList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const { openModal, searchQuery, filters } = useEntityStore();
  const { data: entities = [], isLoading: loading } = useEntities();
  const { hasPermission } = usePermissions();
  const [contractModalData, setContractModalData] = React.useState(null);

  const {
    page,
    rowsPerPage,
    orderBy,
    order,
    handlePageChange,
    handleRowsPerPageChange,
    handleSort,
  } = useDataTable({ defaultOrderBy: 'name', defaultOrder: 'asc' });

  // Pesquisa de texto
  const searchedEntities = useSearch(entities, searchQuery);

  // Filtros estruturais
  const filteredData = useMemo(() => {
    let result = searchedEntities;
    if (filters.ident_type) result = result.filter((e) => e.ident_type === filters.ident_type);
    if (filters.nut1)
      result = result.filter((e) => e.nut1?.toLowerCase().includes(filters.nut1.toLowerCase()));
    if (filters.nut2)
      result = result.filter((e) => e.nut2?.toLowerCase().includes(filters.nut2.toLowerCase()));
    if (filters.nut3)
      result = result.filter((e) => e.nut3?.toLowerCase().includes(filters.nut3.toLowerCase()));
    if (filters.nut4)
      result = result.filter((e) => e.nut4?.toLowerCase().includes(filters.nut4.toLowerCase()));
    if (filters.contact_status === 'with_email') result = result.filter((e) => e.email);
    else if (filters.contact_status === 'without_email') result = result.filter((e) => !e.email);
    else if (filters.contact_status === 'with_phone') result = result.filter((e) => e.phone);
    else if (filters.contact_status === 'without_phone') result = result.filter((e) => !e.phone);
    return result;
  }, [searchedEntities, filters]);

  // Ordenação client-side com suporte a caracteres acentuados (pt-PT)
  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    return [...filteredData].sort((a, b) => {
      const va = a[orderBy] != null ? String(a[orderBy]) : '';
      const vb = b[orderBy] != null ? String(b[orderBy]) : '';
      const cmp = va.localeCompare(vb, 'pt', { sensitivity: 'base' });
      return order === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, orderBy, order]);

  // Colunas — responsivas por breakpoint
  const columns = useMemo(
    () => [
      {
        id: 'name',
        label: 'Entidade',
        sortable: true,
        render: (value, row) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                bgcolor: stringToColor(value || 'A'),
                width: isMobile ? 28 : 34,
                height: isMobile ? 28 : 34,
                fontSize: '0.8rem',
                flexShrink: 0,
              }}
            >
              {(value?.[0] || 'A').toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600} noWrap>
                {value}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {row.nut4 && row.nut2
                  ? `${row.nut4} — ${row.nut2}`
                  : row.nut4 || row.nut2 || 'Sem região'}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      ...(!isMobile
        ? [
            {
              id: 'nipc',
              label: 'NIPC',
              sortable: true,
              render: (value) => (
                <Chip
                  label={value}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontWeight: 500 }}
                />
              ),
            },
          ]
        : []),
      ...(!isTablet
        ? [
            {
              id: 'contact_info',
              label: 'Contactos',
              sortable: false,
              render: (_, row) => (
                <Stack spacing={0.5}>
                  {row.email ? (
                    <Link
                      href={`mailto:${row.email}`}
                      variant="body2"
                      color="text.primary"
                      underline="hover"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EmailIcon fontSize="inherit" color="action" />
                      <Typography variant="body2" noWrap>
                        {row.email}
                      </Typography>
                    </Link>
                  ) : (
                    <Typography variant="caption" color="text.disabled" fontStyle="italic">
                      Sem email
                    </Typography>
                  )}
                  {row.phone && (
                    <Link
                      href={`tel:${row.phone}`}
                      variant="body2"
                      color="text.secondary"
                      underline="hover"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <PhoneIcon fontSize="inherit" color="action" />
                      {row.phone}
                    </Link>
                  )}
                </Stack>
              ),
            },
          ]
        : []),
    ],
    [isMobile, isTablet]
  );

  // Acções de linha
  const rowActions = useMemo(
    () => [{ label: 'Editar', icon: <EditIcon />, onClick: (row) => openModal(row) }],
    [openModal]
  );

  // Linha expandida
  const renderExpandedRow = useCallback(
    (row) => (
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography
              variant="subtitle2"
              color="primary"
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BusinessIcon fontSize="small" /> Endereço
            </Typography>
            <Typography variant="body2">{row.address || '—'}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {[row.postal, row.door && `Porta ${row.door}`, row.floor && `Piso ${row.floor}`]
                .filter(Boolean)
                .join(' • ') || '—'}
            </Typography>
          </Grid>

          {/* Contactos visíveis no expanded em tablet/mobile */}
          {isTablet && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="subtitle2" color="primary" gutterBottom>
                Contactos
              </Typography>
              {row.email ? (
                <Link
                  href={`mailto:${row.email}`}
                  variant="body2"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmailIcon fontSize="inherit" color="action" />
                  {row.email}
                </Link>
              ) : (
                <Typography variant="caption" color="text.disabled" fontStyle="italic">
                  Sem email
                </Typography>
              )}
              {row.phone && (
                <Link
                  href={`tel:${row.phone}`}
                  variant="body2"
                  color="text.secondary"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <PhoneIcon fontSize="inherit" color="action" />
                  {row.phone}
                </Link>
              )}
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Observações
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontStyle: row.descr ? 'normal' : 'italic',
                color: row.descr ? 'text.primary' : 'text.disabled',
              }}
            >
              {row.descr || 'Sem observações.'}
            </Typography>
          </Grid>
        </Grid>

        {hasPermission('payments.manage') && (
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: 2,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContractIcon />}
              onClick={(e) => {
                e.stopPropagation();
                setContractModalData(row);
              }}
            >
              Novo Contrato
            </Button>
          </Box>
        )}
      </Box>
    ),
    [isTablet, hasPermission, setContractModalData]
  );

  // Card para mobile
  const renderMobileCard = (row) => (
    <Card
      key={row.pk}
      sx={{
        mb: 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: theme.shadows[4] },
        '&:active': { transform: 'scale(0.98)' },
      }}
      onClick={() => openModal(row)}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{ bgcolor: stringToColor(row.name || 'A'), width: 40, height: 40, flexShrink: 0 }}
          >
            {(row.name?.[0] || 'A').toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={600} noWrap>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {row.nut4 && row.nut2
                ? `${row.nut4} — ${row.nut2}`
                : row.nut4 || row.nut2 || 'Sem região'}
            </Typography>
          </Box>
          <Chip
            label={row.nipc}
            size="small"
            variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
          />
        </Stack>
        {(row.email || row.phone) && (
          <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
            {row.email && (
              <Link
                href={`mailto:${row.email}`}
                variant="caption"
                color="text.secondary"
                underline="hover"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                onClick={(e) => e.stopPropagation()}
              >
                <EmailIcon sx={{ fontSize: 12 }} />
                <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                  {row.email}
                </Typography>
              </Link>
            )}
            {row.phone && (
              <Link
                href={`tel:${row.phone}`}
                variant="caption"
                color="text.secondary"
                underline="hover"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                onClick={(e) => e.stopPropagation()}
              >
                <PhoneIcon sx={{ fontSize: 12 }} />
                {row.phone}
              </Link>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      {isMobile ? (
        <Box sx={{ pb: 2 }}>
          {loading ? (
            <Stack spacing={1.5}>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      A carregar...
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          ) : sortedData.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Sem entidades
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Não foram encontradas entidades com os critérios actuais.
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <>
              {sortedData.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map(renderMobileCard)}
              <TablePagination
                component="div"
                count={sortedData.length}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={[10, 25, 50]}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                labelRowsPerPage="Por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
                sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 1 }}
              />
            </>
          )}
        </Box>
      ) : (
        <DataTable
          columns={columns}
          data={sortedData}
          loading={loading}
          paginationMode="client"
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50, 100]}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          orderBy={orderBy}
          order={order}
          onSort={handleSort}
          onRowClick={(row) => openModal(row)}
          rowActions={rowActions}
          expandable
          renderExpandedRow={renderExpandedRow}
          stickyHeader
          maxHeight="calc(100vh - 280px)"
          emptyMessage="Sem entidades registadas."
        />
      )}

      <EntityForm />
      <ContractFormModal
        open={Boolean(contractModalData)}
        onClose={() => setContractModalData(null)}
        defaultEntity={contractModalData}
      />
    </>
  );
};
