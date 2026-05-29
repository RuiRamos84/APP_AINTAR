import React, { useState } from 'react';
import {
  Button,
  Stack,
  Tooltip,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add as AddIcon, FilterList as FilterIcon, Business } from '@mui/icons-material';
import ModulePage from '@/shared/components/layout/ModulePage';
import { EntityList } from '../components/EntityList';
import { useEntityStore } from '../store/entityStore';
import { EntityFilters } from '../components/EntityFilters';
import { SearchBar } from '@/shared/components/data/SearchBar/SearchBar';

const EntitiesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { openCreateModal, setSearchQuery, searchQuery } = useEntityStore();
  const [showFilters, setShowFilters] = useState(false);

  return (
    <ModulePage
      title="Entidades"
      subtitle="Gestão de clientes e entidades do sistema"
      icon={Business}
      color="#1565c0"
      breadcrumbs={[{ label: 'Entidades' }]}
      actions={
        <Stack direction="row" alignItems="center" gap={{ xs: 0.5, sm: 1 }}>
          <SearchBar searchTerm={searchQuery} onSearch={setSearchQuery} />

          <Tooltip title={showFilters ? 'Ocultar filtros' : 'Filtros avançados'}>
            <IconButton
              size={isMobile ? 'small' : 'medium'}
              onClick={() => setShowFilters(!showFilters)}
              color={showFilters ? 'primary' : 'default'}
              sx={{ bgcolor: showFilters ? 'action.selected' : 'transparent' }}
            >
              <FilterIcon fontSize={isMobile ? 'small' : 'medium'} />
            </IconButton>
          </Tooltip>

          <Tooltip title={isMobile ? 'Nova Entidade' : ''}>
            <Button
              variant="contained"
              size={isMobile ? 'small' : 'medium'}
              onClick={openCreateModal}
              startIcon={!isMobile ? <AddIcon /> : undefined}
              sx={{
                minWidth: isMobile ? 32 : undefined,
                px: isMobile ? 1 : undefined,
              }}
            >
              {isMobile ? <AddIcon fontSize="small" /> : 'Nova Entidade'}
            </Button>
          </Tooltip>
        </Stack>
      }
    >
      <Collapse in={showFilters} sx={{ mb: showFilters ? 2 : 0 }}>
        <EntityFilters />
      </Collapse>
      <EntityList />
    </ModulePage>
  );
};

export default EntitiesPage;
