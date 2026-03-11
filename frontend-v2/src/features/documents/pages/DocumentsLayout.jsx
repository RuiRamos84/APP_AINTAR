import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useDocumentsStore } from '../store/documentsStore';
import { SearchBar } from '@/shared/components/data';
import DocumentFilters, { FilterToggleButton } from '../components/filters/DocumentFilters';
import DocumentStats from '../components/stats/DocumentStats';

/**
 * Main Layout for Documents Feature - Fully Responsive
 * Cards act as tabs — no separate tabs row
 */
const DocumentsLayout = ({ children, onOpenCreate, onExport, onRefresh, isRefreshing }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const { viewMode, setViewMode, searchTerm, setSearchTerm } = useDocumentsStore();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const toggleFilters = () => setFiltersOpen((prev) => !prev);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: { xs: 1, sm: 1.5, md: 2 } }}>

      {/* Header: Title | Search + Filter + ViewToggle + Refresh + Export + Novo */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          borderRadius: { xs: 2, md: 3 },
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`,
          backdropFilter: 'blur(20px)',
        }}
      >
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

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 0.75 }, alignItems: 'center', flexShrink: 0 }}>
            <SearchBar searchTerm={searchTerm} onSearch={setSearchTerm} />

            <FilterToggleButton open={filtersOpen} onToggle={toggleFilters} />

            {/* View mode toggle — moved here from tabs row */}
            <Box sx={{ display: 'flex', gap: 0, p: 0.5 }}>
              <Tooltip title="Vista em lista">
                <IconButton
                  size="small"
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  onClick={() => setViewMode('list')}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: viewMode === 'list' ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  }}
                >
                  <ViewListIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Vista em grelha">
                <IconButton
                  size="small"
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  onClick={() => setViewMode('grid')}
                  sx={{
                    borderRadius: 1.5,
                    bgcolor: viewMode === 'grid' ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  }}
                >
                  <ViewModuleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            {onRefresh && (
              <Tooltip title="Atualizar dados">
                <IconButton
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  size="small"
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    '& svg': {
                      transition: 'transform 0.6s ease',
                      transform: isRefreshing ? 'rotate(360deg)' : 'none',
                    },
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

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

        {/* Filter Panel (collapsible) */}
        <DocumentFilters open={filtersOpen} onToggle={toggleFilters} />
      </Paper>

      {/* Stats Cards — each card is a tab selector */}
      <DocumentStats />

      {/* Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
        {children}
      </Box>
    </Box>
  );
};

export default DocumentsLayout;
