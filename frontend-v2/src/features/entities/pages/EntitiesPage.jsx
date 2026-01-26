import React, { useState } from 'react';
import { Box, Button, Typography, Stack, Collapse, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon, FilterList as FilterIcon } from '@mui/icons-material';
import { EntityList } from '../components/EntityList';
import { useEntityStore } from '../store/entityStore';
import { EntityFilters } from '../components/EntityFilters';
import { SearchBar } from '@/shared/components/data/SearchBar/SearchBar';

const EntitiesPage = () => {
  const { openCreateModal, setSearchQuery, searchQuery, clearFilters } = useEntityStore();
  const [showFilters, setShowFilters] = useState(false);

  return (
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header & Actions */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" gap={2}>
        <Typography variant="h4" fontWeight="bold">
          Entidades
        </Typography>
        
        <Stack direction="row" alignItems="center" gap={2}>
            {/* Search Bar Legacy Style */}
            <SearchBar 
                searchTerm={searchQuery} 
                onSearch={setSearchQuery} 
            />
            
            {/* Toggle Filtros */}
            <Tooltip title="Filtros Avançados">
                <IconButton 
                    onClick={() => setShowFilters(!showFilters)} 
                    color={showFilters ? 'primary' : 'default'}
                    sx={{ bgcolor: showFilters ? 'action.selected' : 'transparent' }}
                >
                    <FilterIcon />
                </IconButton>
            </Tooltip>

            {/* Novo Botão */}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateModal}
            >
              Nova Entidade
            </Button>
        </Stack>
      </Stack>

      {/* Area de Filtros Expansível */}
      <Collapse in={showFilters}>
          <EntityFilters />
      </Collapse>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1 }}>
        <EntityList />
      </Box>
    </Box>
  );
};

export default EntitiesPage;
