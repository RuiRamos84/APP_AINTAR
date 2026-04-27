/**
 * ModuleBottomNav - Navegação inferior para mobile
 * Substituí o Select do AppBar em ecrãs pequenos (xs).
 * Cada módulo usa a sua própria cor quando selecionado.
 */
import { BottomNavigation, BottomNavigationAction, Box, Paper, useTheme, alpha } from '@mui/material';

export const ModuleBottomNav = ({ modules, currentModule, onModuleChange }) => {
  const theme = useTheme();
  // Mostrar labels apenas se os módulos cabem confortavelmente
  const showLabels = modules.length <= 5;

  return (
    <Box
      sx={{
        display: { xs: 'block', sm: 'none' },
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.drawer + 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          backgroundColor: alpha(theme.palette.background.paper, 0.94),
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
          // Suporte iPhone notch / home indicator
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <BottomNavigation
          value={currentModule || false}
          onChange={(_event, newValue) => onModuleChange(newValue)}
          showLabels={showLabels}
          sx={{ backgroundColor: 'transparent', height: 62 }}
        >
          {modules.map((module) => (
            <BottomNavigationAction
              key={module.id}
              value={module.id}
              label={module.label}
              icon={<module.icon sx={{ fontSize: showLabels ? 22 : 24 }} />}
              sx={{
                minWidth: 0,
                px: { xs: 0.25, sm: 1 },
                color: theme.palette.text.secondary,
                transition: 'color 0.2s',
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.72rem',
                  mt: 0.25,
                  '&.Mui-selected': { fontSize: '0.74rem', fontWeight: 600 },
                },
                '&.Mui-selected': { color: module.color },
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default ModuleBottomNav;
