/**
 * ModulePage Component
 * Template reutilizável para páginas de módulos
 *
 * Breadcrumbs inteligentes:
 * - Remove automaticamente "Início" como primeiro item (o logo serve de home)
 * - Injeta o módulo atual como primeiro breadcrumb quando necessário
 * - Padrão resultante: [Módulo] > [Sub-área] > [Página]
 */

import { useMemo } from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useUIStore } from '@/core/store/uiStore';
import { getModuleById } from '@/core/config/moduleConfig';

export const ModulePage = ({ title, subtitle, breadcrumbs = [], icon: Icon, color, actions, children }) => {
  const navigate = useNavigate();
  const currentModule = useUIStore((state) => state.currentModule);
  const moduleConfig = currentModule ? getModuleById(currentModule) : null;

  // Normaliza breadcrumbs:
  // 1. Remove "Início" do início (o logo já serve de link para home)
  // 2. Garante que o módulo atual é sempre o primeiro item clicável
  const normalizedCrumbs = useMemo(() => {
    if (!breadcrumbs.length) return [];
    let crumbs = [...breadcrumbs];

    // Remove variantes de "Início" no início
    if (/^in[íi]cio$/i.test(crumbs[0]?.label)) {
      crumbs = crumbs.slice(1);
    }

    // Se há módulo ativo e o primeiro crumb não é o módulo → injeta-o
    if (moduleConfig && crumbs.length > 0 && crumbs[0].label !== moduleConfig.label) {
      crumbs = [{ label: moduleConfig.label, path: moduleConfig.defaultRoute }, ...crumbs];
    }

    return crumbs;
  }, [breadcrumbs, moduleConfig]);

  return (
    <Box>
      {/* Breadcrumbs */}
      {normalizedCrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 0.5 }}>
          {normalizedCrumbs.map((crumb, index) => {
            const isLast = index === normalizedCrumbs.length - 1;
            return isLast ? (
              <Typography key={index} color="text.primary" variant="body2">
                {crumb.label}
              </Typography>
            ) : (
              <Link
                key={index}
                component="button"
                variant="body2"
                onClick={() => crumb.path && navigate(crumb.path)}
                sx={{ cursor: 'pointer' }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Page Header */}
      {title && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 3,
            pb: 2,
            borderBottom: `3px solid ${color || 'primary.main'}`,
          }}
        >
          {Icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: `${color}15`,
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: 28, color: color || 'primary.main' }} />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ ml: 'auto', flexShrink: 0 }}>{actions}</Box>}
        </Box>
      )}

      {/* Content */}
      <Box>{children}</Box>
    </Box>
  );
};

export default ModulePage;
