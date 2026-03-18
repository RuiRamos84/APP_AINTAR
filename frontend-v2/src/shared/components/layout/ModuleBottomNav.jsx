/**
 * ModuleBottomNav - Navegação inferior para mobile
 * Substituí o Select do AppBar em ecrãs pequenos (xs).
 * Cada módulo usa a sua própria cor quando selecionado.
 */
import { BottomNavigation, BottomNavigationAction, Box, Paper, useTheme, alpha } from '@mui/material';

export const ModuleBottomNav = ({ modules, currentModule, onModuleChange }) => {
  const theme = useTheme();

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
          backgroundColor: alpha(theme.palette.background.paper, 0.92),
          backdropFilter: 'blur(16px)',
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
        }}
      >
        <BottomNavigation
          value={currentModule || false}
          onChange={(_event, newValue) => onModuleChange(newValue)}
          showLabels
          sx={{ backgroundColor: 'transparent', height: 58 }}
        >
          {modules.map((module) => (
            <BottomNavigationAction
              key={module.id}
              value={module.id}
              label={module.label}
              icon={<module.icon sx={{ fontSize: 22 }} />}
              sx={{
                minWidth: 0,
                px: 0.5,
                color: theme.palette.text.secondary,
                transition: 'color 0.2s',
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.62rem',
                  '&.Mui-selected': { fontSize: '0.65rem', fontWeight: 600 },
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
