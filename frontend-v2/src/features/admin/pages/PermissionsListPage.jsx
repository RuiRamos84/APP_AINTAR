/**
 * PermissionsListPage
 * Gestão de permissões do sistema (ts_interface)
 *
 * Features:
 * - Listar todas as permissões disponíveis
 * - Visualizar detalhes de cada permissão
 * - Criar/editar permissões (futuro)
 * - Atribuir permissões a perfis (futuro)
 */

import { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import { PageTransition, FadeIn } from '@/shared/components/animation';
import { SearchBar } from '@/shared/components/data';
import { useInterfaces } from '@/core/contexts/MetadataContext';

const PermissionsListPage = () => {
  const { interfaces, isLoading, refreshMetadata } = useInterfaces();
  const [searchTerm, setSearchTerm] = useState('');

  // Responsividade
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Filtrar permissões baseado na busca
  const filteredPermissions = interfaces.filter((permission) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      permission.value?.toLowerCase().includes(searchLower) ||
      permission.label?.toLowerCase().includes(searchLower) ||
      permission.category?.toLowerCase().includes(searchLower) ||
      permission.pk?.toString().includes(searchLower)
    );
  });

  // Agrupar por categoria
  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const category = permission.category || 'outros';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {});

  return (
    <PageTransition variant="slideUp">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <FadeIn direction="down">
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flexGrow: 1, minWidth: isMobile ? '100%' : 'auto' }}>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                component="h1"
                fontWeight="bold"
                gutterBottom
              >
                Gestão de Permissões
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Visualizar e gerir permissões do sistema (ts_interface)
              </Typography>
            </Box>
            <Tooltip title="Recarregar permissões">
              <span>
                <IconButton onClick={refreshMetadata} disabled={isLoading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </FadeIn>

        {/* Search & Stats */}
        <FadeIn delay={0.1}>
          <Paper sx={{ p: isMobile ? 2 : 3, mb: 3 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <SearchBar
                  searchTerm={searchTerm}
                  onSearch={setSearchTerm}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                <Chip
                  icon={<AdminIcon />}
                  label={`${interfaces.length} permiss${isMobile ? '.' : 'ões'}`}
                  color="primary"
                  variant="outlined"
                  size={isMobile ? 'small' : 'medium'}
                />
                <Chip
                  label={`${Object.keys(groupedPermissions).length} categoria${isMobile ? 's' : 's'}`}
                  color="default"
                  variant="outlined"
                  size={isMobile ? 'small' : 'medium'}
                />
              </Box>
            </Stack>
          </Paper>
        </FadeIn>

        {/* Permissions by Category */}
        {Object.entries(groupedPermissions).map(([category, permissions], index) => (
          <FadeIn key={category} delay={0.15 + index * 0.05}>
            <Paper sx={{ mb: 3, overflow: 'hidden' }}>
              <Box sx={{ p: isMobile ? 1.5 : 2, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold">
                  {category.toUpperCase()} ({permissions.length})
                </Typography>
              </Box>

              {/* Mobile View - Cards */}
              {isMobile ? (
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    {permissions.map((permission) => (
                      <Grid size={{ xs: 12 }} key={permission.pk}>
                        <Card variant="outlined" sx={{ '&:hover': { boxShadow: 2 } }}>
                          <CardContent>
                            <Stack spacing={1.5}>
                              {/* ID */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>
                                  ID:
                                </Typography>
                                <Chip label={permission.pk} size="small" color="primary" />
                              </Box>

                              <Divider />

                              {/* Nome/Código */}
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Nome/Código
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {permission.value || '-'}
                                </Typography>
                              </Box>

                              {/* Label */}
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Label
                                </Typography>
                                <Typography variant="body2">
                                  {permission.label || '-'}
                                </Typography>
                              </Box>

                              {/* Descrição */}
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Descrição
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {permission.description || 'Sem descrição'}
                                </Typography>
                              </Box>

                              {/* Status */}
                              {(permission.is_critical || permission.is_sensitive) && (
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {permission.is_critical && (
                                    <Chip label="Crítica" size="small" color="error" />
                                  )}
                                  {permission.is_sensitive && (
                                    <Chip label="Sensível" size="small" color="warning" />
                                  )}
                                </Box>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                /* Desktop/Tablet View - Table */
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Nome/Código</TableCell>
                        <TableCell>Label</TableCell>
                        {!isTablet && <TableCell>Descrição</TableCell>}
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {permissions.map((permission) => (
                        <TableRow
                          key={permission.pk}
                          hover
                          sx={{ '&:hover': { bgcolor: 'action.hover' } }}
                        >
                          <TableCell>
                            <Chip label={permission.pk} size="small" color="primary" />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {permission.value || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{permission.label || '-'}</TableCell>
                          {!isTablet && (
                            <TableCell>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {permission.description || 'Sem descrição'}
                              </Typography>
                            </TableCell>
                          )}
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {permission.is_critical && (
                                <Chip label="Crítica" size="small" color="error" />
                              )}
                              {permission.is_sensitive && (
                                <Chip label="Sensível" size="small" color="warning" />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </FadeIn>
        ))}

        {/* Empty State */}
        {filteredPermissions.length === 0 && (
          <FadeIn delay={0.2}>
            <Paper sx={{ p: isMobile ? 3 : 6, textAlign: 'center' }}>
              <AdminIcon sx={{ fontSize: isMobile ? 48 : 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} color="text.secondary" gutterBottom>
                Nenhuma permissão encontrada
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm
                  ? 'Tenta ajustar os filtros de pesquisa'
                  : 'Não há permissões disponíveis no sistema'}
              </Typography>
            </Paper>
          </FadeIn>
        )}
      </Container>
    </PageTransition>
  );
};

export default PermissionsListPage;
