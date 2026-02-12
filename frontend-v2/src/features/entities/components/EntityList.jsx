import React, { useEffect, useMemo } from 'react';
import { Box, Typography, Avatar, Chip, Link, Stack, Grid } from '@mui/material';
import { 
  Edit as EditIcon, 
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import DataTable from '@/shared/components/data/DataTable/DataTable';
import { useEntityStore } from '../store/entityStore';
import { EntityForm } from './EntityForm';

// Utility para ter uma cor consistente baseada no nome
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
  const { 
    entities, 
    loading, 
    fetchEntities, 
    openModal, 
    searchQuery,
    filters
  } = useEntityStore();
  
  // States para Ordenação
  const [order, setOrder] = React.useState('asc');
  const [orderBy, setOrderBy] = React.useState('name');

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Filtragem local
  const filteredData = useMemo(() => {
    let result = entities;

    // Filtro de Texto (Search Query)
    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        result = result.filter(entity => 
            entity.name?.toLowerCase().includes(lowerQuery) ||
            entity.nipc?.toString().includes(lowerQuery) ||
            entity.email?.toLowerCase().includes(lowerQuery)
        );
    }

    // Filtros Avançados
    if (filters.ident_type) {
        result = result.filter(e => e.ident_type === filters.ident_type);
    }
    if (filters.nut1) {
        result = result.filter(e => e.nut1?.toLowerCase().includes(filters.nut1.toLowerCase()));
    }
    if (filters.nut2) {
        result = result.filter(e => e.nut2?.toLowerCase().includes(filters.nut2.toLowerCase()));
    }
    if (filters.nut3) {
        result = result.filter(e => e.nut3?.toLowerCase().includes(filters.nut3.toLowerCase()));
    }
    if (filters.nut4) {
        result = result.filter(e => e.nut4?.toLowerCase().includes(filters.nut4.toLowerCase()));
    }
    
    // Filtro de Contacto
    if (filters.contact_status === 'with_email') {
        result = result.filter(e => e.email && e.email.length > 0);
    } else if (filters.contact_status === 'without_email') {
        result = result.filter(e => !e.email || e.email.length === 0);
    } else if (filters.contact_status === 'with_phone') {
        result = result.filter(e => e.phone && e.phone.length > 0);
    } else if (filters.contact_status === 'without_phone') {
        result = result.filter(e => !e.phone || e.phone.length === 0);
    }

    return result;
  }, [entities, searchQuery, filters]);

  // Dados Ordenados
  const sortedData = useMemo(() => {
      if (!orderBy) return filteredData;

      return [...filteredData].sort((a, b) => {
          const valueA = a[orderBy] ? String(a[orderBy]).toLowerCase() : '';
          const valueB = b[orderBy] ? String(b[orderBy]).toLowerCase() : '';

          if (valueB < valueA) {
              return order === 'asc' ? 1 : -1;
          }
          if (valueB > valueA) {
              return order === 'asc' ? -1 : 1;
          }
          return 0;
      });
  }, [filteredData, order, orderBy]);

  const handleSort = (property) => {
      const isAsc = orderBy === property && order === 'asc';
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(property);
  };

  // Definição das colunas com Rich UI
  const columns = [
    { 
      id: 'name', 
      label: 'Entidade', 
      minWidth: 250, 
      sortable: true,
      render: (value, row) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar 
            sx={{ 
              bgcolor: stringToColor(value || 'A'), 
              width: 32, 
              height: 32,
              fontSize: '0.875rem'
            }}
          >
            {(value?.[0] || 'A').toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight="600">
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.nut4 || 'Sem Região'}
            </Typography>
          </Box>
        </Stack>
      )
    },
    { 
      id: 'nipc', 
      label: 'NIPC', 
      minWidth: 120, 
      sortable: true,
      render: (value) => (
        <Chip 
          label={value} 
          size="small" 
          variant="outlined" 
          sx={{ fontFamily: 'monospace', fontWeight: 500 }}
        />
      )
    },
    { 
      id: 'contact_info', // Coluna virtual combinada
      label: 'Contactos', 
      minWidth: 200, 
      sortable: false,
      render: (_, row) => (
        <Stack spacing={0.5}>
          {row.email && (
            <Link 
              href={`mailto:${row.email}`} 
              variant="body2" 
              color="text.primary"
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <EmailIcon fontSize="inherit" color="action" />
              {row.email}
            </Link>
          )}
          {row.phone && (
            <Link 
              href={`tel:${row.phone}`} 
              variant="body2" 
              color="text.secondary" 
              underline="hover"
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <PhoneIcon fontSize="inherit" color="action" />
              {row.phone}
            </Link>
          )}
        </Stack>
      )
    }
  ];

  // Ações de linha
  const rowActions = [
    {
      label: 'Editar',
      icon: <EditIcon />,
      onClick: (row) => openModal(row)
    }
  ];

  // Conteúdo Expandido (Row Details) - UI melhorada
  const renderExpandedRow = (row) => (
    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon fontSize="small" /> Endereço Completo
          </Typography>
          <Typography variant="body2">
            {row.address}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {[
              row.postal, 
              row.door && `Porta ${row.door}`, 
              row.floor && `Piso ${row.floor}`
            ].filter(Boolean).join(' • ')}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="subtitle2" color="primary" gutterBottom>
            Observações
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: row.descr ? 'normal' : 'italic', color: row.descr ? 'text.primary' : 'text.disabled' }}>
            {row.descr || 'Sem observações registadas.'}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        paginationMode="client"
        rowsPerPageOptions={[10, 25, 50]}
        onRowClick={(row) => openModal(row)}
        rowActions={rowActions}
        expandable
        renderExpandedRow={renderExpandedRow}
        sx={{
          '& .MuiTableCell-root': { py: 1.5 } // Mais white-space para ar premium
        }}
      />
      <EntityForm />
    </>
  );
};
