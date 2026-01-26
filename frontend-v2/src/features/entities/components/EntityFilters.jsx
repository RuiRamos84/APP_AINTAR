import React from 'react';
import { 
  Box, 
  Grid, 
  TextField, 
  MenuItem, 
  Button,
  Typography,
  InputAdornment,
  Divider
} from '@mui/material';
import { 
    Clear as ClearIcon, 
    LocationOn, 
    Badge, 
    Email,
    FilterAlt as FilterIcon
} from '@mui/icons-material';
import { useEntityStore } from '../store/entityStore';
import { useMetaData } from '@/core/hooks/useMetaData';

export const EntityFilters = () => {
  const { 
    filters,
    setFilter,
    clearFilters
  } = useEntityStore();
  
  const { data: metaData } = useMetaData();
  const identTypes = metaData?.ident_types || [];

  const handleClear = () => {
      clearFilters();
  };

  const hasActiveFilters = 
    filters.ident_type || 
    filters.nut1 || 
    filters.nut2 || 
    filters.nut3 || 
    filters.nut4 || 
    filters.contact_status !== 'all';

  return (
    <Box sx={{ p: 2.5, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon color="primary" fontSize="small" />
            <Typography variant="subtitle2" fontWeight="bold" color="text.primary">
                Filtragem Avançada
            </Typography>
        </Box>
        {hasActiveFilters && (
            <Button 
                size="small" 
                color="error"
                startIcon={<ClearIcon />} 
                onClick={handleClear}
                sx={{ textTransform: 'none' }}
            >
                Limpar Filtros
            </Button>
        )}
      </Box>

      <Grid container spacing={2}>
        {/* Tipo de Identificação */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            label="Tipo de Entidade"
            size="small"
            fullWidth
            value={filters.ident_type || ''}
            onChange={(e) => setFilter('ident_type', e.target.value)}
            InputProps={{
                startAdornment: (
                    <InputAdornment position="start">
                        <Badge fontSize="small" color="action" />
                    </InputAdornment>
                ),
            }}
          >
             <MenuItem value=""><em>Todas</em></MenuItem>
             {identTypes.map(t => (
                 <MenuItem key={t.pk} value={t.pk}>{t.value}</MenuItem>
             ))}
          </TextField>
        </Grid>

        {/* Estado do Contacto */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
                select
                label="Estado de Contacto"
                size="small"
                fullWidth
                value={filters.contact_status}
                onChange={(e) => setFilter('contact_status', e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <Email fontSize="small" color="action" />
                        </InputAdornment>
                    ),
                }}
            >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="with_email">Com Email</MenuItem>
                <MenuItem value="without_email">Sem Email</MenuItem>
                <MenuItem value="with_phone">Com Telefone</MenuItem>
                <MenuItem value="without_phone">Sem Telefone</MenuItem>
            </TextField>
        </Grid>

        <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

        {/* Localização */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            label="Distrito (NUT1)"
            size="small"
            fullWidth
            placeholder="Ex: Lisboa..."
            value={filters.nut1 || ''}
            onChange={(e) => setFilter('nut1', e.target.value)}
            InputProps={{
                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            label="Concelho (NUT2)"
            size="small"
            fullWidth
            placeholder="Ex: Cascais..."
            value={filters.nut2 || ''}
            onChange={(e) => setFilter('nut2', e.target.value)}
            InputProps={{
                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            label="Freguesia (NUT3)"
            size="small"
            fullWidth
            placeholder="Ex: Estoril..."
            value={filters.nut3 || ''}
            onChange={(e) => setFilter('nut3', e.target.value)}
            InputProps={{
                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            label="Localidade (NUT4)"
            size="small"
            fullWidth
            placeholder="Ex: Bairro..."
            value={filters.nut4 || ''}
            onChange={(e) => setFilter('nut4', e.target.value)}
            InputProps={{
                startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" color="action" /></InputAdornment>
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};
