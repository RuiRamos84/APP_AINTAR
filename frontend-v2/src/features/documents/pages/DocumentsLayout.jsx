import React, { useState } from 'react';
import { Box, Paper, Typography, Tab, Tabs, Button, useTheme, alpha } from '@mui/material';
import {
  Add as AddIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  ViewWeek as ViewWeekIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useDocumentsStore } from '../store/documentsStore';
import { SearchBar } from '@/shared/components/data';
import DocumentFilters from '../components/filters/DocumentFilters';
import DocumentStats from '../components/stats/DocumentStats';

/**
 * Main Layout for Documents Feature
 */
const DocumentsLayout = ({ children, onOpenCreate, onExport }) => {
  const theme = useTheme();
  const {
    activeTab, setActiveTab,
    viewMode, setViewMode,
    searchTerm, setSearchTerm
  } = useDocumentsStore();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Header Area */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
          backdropFilter: 'blur(20px)'
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight="700" color="text.primary">
            Pedidos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestão inteligente de documentos e processos
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchBar
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
          />
          <DocumentFilters
            open={filtersOpen}
            onToggle={() => setFiltersOpen((prev) => !prev)}
          />
          {onExport && (
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={onExport}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Exportar
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onOpenCreate}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: theme.shadows[4]
            }}
          >
            Novo Pedido
          </Button>
        </Box>
      </Paper>

      {/* Statistics Dashboard */}
      <DocumentStats />

      {/* Controls & Tabs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              minHeight: 40,
              mr: 1
            },
            '& .Mui-selected': {
              color: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.1)
            },
            '& .MuiTabs-indicator': {
              display: 'none'
            }
          }}
        >
          <Tab label="Todos os Pedidos" />
          <Tab label="A Meu Cargo" />
          <Tab label="Criados por Mim" />
          <Tab label="Em Atraso" sx={{ color: activeTab === 3 ? 'error.main' : 'text.secondary' }} />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 1, bgcolor: 'background.paper', p: 0.5, borderRadius: 2 }}>
           <Button
             size="small"
             variant={viewMode === 'list' ? 'contained' : 'text'}
             color={viewMode === 'list' ? 'primary' : 'inherit'}
             onClick={() => setViewMode('list')}
             sx={{ minWidth: 40, p: 1 }}
           >
             <ViewListIcon fontSize="small" />
           </Button>
           <Button
             size="small"
             variant={viewMode === 'grid' ? 'contained' : 'text'}
             color={viewMode === 'grid' ? 'primary' : 'inherit'}
             onClick={() => setViewMode('grid')}
             sx={{ minWidth: 40, p: 1 }}
           >
             <ViewModuleIcon fontSize="small" />
           </Button>
           <Button
             size="small"
             variant={viewMode === 'kanban' ? 'contained' : 'text'}
             color={viewMode === 'kanban' ? 'primary' : 'inherit'}
             onClick={() => setViewMode('kanban')}
             sx={{ minWidth: 40, p: 1 }}
           >
             <ViewWeekIcon fontSize="small" />
           </Button>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {children}
      </Box>
    </Box>
  );
};

export default DocumentsLayout;
