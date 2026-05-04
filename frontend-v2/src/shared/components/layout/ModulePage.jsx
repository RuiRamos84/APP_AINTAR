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
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useCurrentModule } from '@/shared/hooks/useCurrentModule';

export const ModulePage = ({ title, subtitle, breadcrumbs = [], icon: Icon, color, actions, search, center, children, compact = false, fillHeight = false, loading = false }) => {
  const navigate = useNavigate();
  const { moduleConfig } = useCurrentModule();

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
    <Box sx={fillHeight ? { display: 'flex', flexDirection: 'column', height: '100%' } : {}}>
      {/* Breadcrumbs */}
      {normalizedCrumbs.length > 0 && (
        <Breadcrumbs
          component={motion.nav}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          aria-label="Localização na aplicação"
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 0.5 }}
        >
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
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: compact ? 1 : { xs: 1.5, sm: 2 },
            mb: compact ? 1.5 : 3,
            pb: compact ? 1 : 2,
            borderBottom: `${compact ? 2 : 3}px solid ${color || 'primary.main'}`,
          }}
        >
          {Icon && (
            <Box
              component={motion.div}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: compact ? 32 : { xs: 40, sm: 48 },
                height: compact ? 32 : { xs: 40, sm: 48 },
                borderRadius: 2,
                bgcolor: `${color}15`,
                flexShrink: 0,
              }}
            >
              <Icon sx={{ fontSize: compact ? 18 : { xs: 22, sm: 28 }, color: color || 'primary.main' }} />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant={compact ? 'h6' : 'h4'}
              fontWeight={600}
              sx={compact ? {} : { fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.75rem' }, mb: 0.5 }}
            >
              {title}
            </Typography>
            {subtitle && !compact && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {/* Centro absoluto em sm+ — em xs usa fluxo normal para evitar sobreposição */}
          {center && (
            <Box sx={{
              display: { xs: 'none', sm: 'flex' },
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              alignItems: 'center',
              pointerEvents: 'none',
              '& > *': { pointerEvents: 'auto' },
            }}>
              {center}
            </Box>
          )}
          {/* Search + Actions — desabilitados durante loading */}
          {(search || actions || center) && (
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              ml: { xs: 0, sm: 'auto' },
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-end', sm: 'flex-start' },
              flexShrink: 0,
              opacity: loading ? 0.5 : 1,
              pointerEvents: loading ? 'none' : 'auto',
              transition: 'opacity 0.2s',
            }}>
              {search}
              {/* Em xs, o center aparece aqui em fluxo normal */}
              {center && <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>{center}</Box>}
              {actions}
            </Box>
          )}
        </Box>
      )}

      {/* Content */}
      <Box sx={fillHeight ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}}>{children}</Box>
    </Box>
  );
};

export default ModulePage;
