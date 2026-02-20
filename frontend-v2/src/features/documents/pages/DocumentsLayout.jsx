import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tab,
  Tabs,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import {
  Add as AddIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useDocumentsStore } from '../store/documentsStore';
import { SearchBar } from '@/shared/components/data';
import DocumentFilters, { FilterToggleButton } from '../components/filters/DocumentFilters';
import DocumentStats from '../components/stats/DocumentStats';

/**
 * Main Layout for Documents Feature - Fully Responsive
 */
const DocumentsLayout = ({ children, onOpenCreate, onExport }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const {
    activeTab, setActiveTab,
    viewMode, setViewMode,
    searchTerm, setSearchTerm
  } = useDocumentsStore();

  const [filtersOpen, setFiltersOpen] = useState(false);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const toggleFilters = () => setFiltersOpen((prev) => !prev);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5, md: 2 } }}>
      {/* Header Area */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: { xs: 2, md: 3 },
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Row 1: Title (left) | Search + FilterToggle + Export + NovoPedido (right) */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: { xs: 1, md: 2 },
        }}>
          {/* Title */}
          <Box sx={{ minWidth: 0, flexShrink: 0 }}>
            <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="700" color="text.primary" noWrap>
              Pedidos
            </Typography>
            {!isMobile && (
              <Typography variant="body2" color="text.secondary" noWrap>
                Gestão inteligente de documentos e processos
              </Typography>
            )}
          </Box>

          {/* Actions - all on same line */}
          <Box sx={{
            display: 'flex',
            gap: { xs: 0.5, sm: 1 },
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <SearchBar
              searchTerm={searchTerm}
              onSearch={setSearchTerm}
            />
            <FilterToggleButton
              open={filtersOpen}
              onToggle={toggleFilters}
            />
            {onExport && (
              isMobile ? (
                <Tooltip title="Exportar">
                  <IconButton onClick={onExport} size="small" sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                    <ExportIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<ExportIcon />}
                  onClick={onExport}
                  size={isTablet ? 'small' : 'medium'}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Exportar
                </Button>
              )
            )}
            <Button
              variant="contained"
              startIcon={!isMobile && <AddIcon />}
              onClick={onOpenCreate}
              size={isMobile || isTablet ? 'small' : 'medium'}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: theme.shadows[4],
                whiteSpace: 'nowrap',
                minWidth: isMobile ? 40 : undefined,
                px: isMobile ? 1.5 : undefined,
              }}
            >
              {isMobile ? <AddIcon /> : 'Novo Pedido'}
            </Button>
          </Box>
        </Box>

        {/* Row 2: Filter Panel (collapsible, full width below row 1) */}
        <DocumentFilters
          open={filtersOpen}
          onToggle={toggleFilters}
        />
      </Paper>

      {/* Statistics Dashboard */}
      <DocumentStats />

      {/* Controls & Tabs */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
      }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 36, sm: 40 },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              minHeight: { xs: 36, sm: 40 },
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              px: { xs: 1.5, sm: 2 },
              mr: 0.5,
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
          <Tab label={isMobile ? 'Todos' : 'Todos os Pedidos'} />
          <Tab label={isMobile ? 'Meu Cargo' : 'A Meu Cargo'} />
          <Tab label={isMobile ? 'Criados' : 'Criados por Mim'} />
          <Tab label={isMobile ? 'Atraso' : 'Em Atraso'} sx={{ color: activeTab === 3 ? 'error.main' : 'text.secondary' }} />
        </Tabs>

        <Box sx={{ display: 'flex', gap: 0.5, bgcolor: 'background.paper', p: 0.5, borderRadius: 2 }}>
          <IconButton
            size="small"
            color={viewMode === 'list' ? 'primary' : 'default'}
            onClick={() => setViewMode('list')}
            sx={{
              borderRadius: 1.5,
              bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
            }}
          >
            <ViewListIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color={viewMode === 'grid' ? 'primary' : 'default'}
            onClick={() => setViewMode('grid')}
            sx={{
              borderRadius: 1.5,
              bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
            }}
          >
            <ViewModuleIcon fontSize="small" />
          </IconButton>
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
