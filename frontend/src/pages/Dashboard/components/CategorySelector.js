import React from 'react';
import {
  Box,
  Chip,
  Paper,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  AccountTree as AccountTreeIcon,
  CleaningServices as CleaningServicesIcon,
  Construction as ConstructionIcon
} from '@mui/icons-material';
import { DASHBOARD_CATEGORIES } from '../constants';

/**
 * Componente para seleção de categorias do dashboard
 *
 * @param {Object} props
 * @param {string|null} props.selectedCategory - Categoria atualmente selecionada
 * @param {Function} props.onCategoryChange - Callback quando uma categoria é selecionada
 * @param {Object} props.categoryCounts - Objeto com contagem de views por categoria
 * @returns {React.ReactElement}
 */
const CategorySelector = ({
  selectedCategory,
  onCategoryChange,
  categoryCounts = {}
}) => {
  const theme = useTheme();

  // Mapear ícones
  const iconMap = {
    assignment: <AssignmentIcon />,
    account_tree: <AccountTreeIcon />,
    cleaning_services: <CleaningServicesIcon />,
    construction: <ConstructionIcon />
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Categorias
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        {/* Chip "Todas" */}
        <Chip
          icon={<AssignmentIcon />}
          label="Todas as Categorias"
          onClick={() => onCategoryChange(null)}
          color={selectedCategory === null ? 'primary' : 'default'}
          variant={selectedCategory === null ? 'filled' : 'outlined'}
          sx={{
            fontSize: '0.9rem',
            fontWeight: selectedCategory === null ? 'bold' : 'normal',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 2
            }
          }}
        />

        {/* Chips de categorias */}
        {Object.values(DASHBOARD_CATEGORIES).map((category) => {
          const isSelected = selectedCategory === category.id;
          const count = categoryCounts[category.id] || 0;

          return (
            <Chip
              key={category.id}
              icon={iconMap[category.icon] || <AssignmentIcon />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{category.name}</span>
                  {count > 0 && (
                    <Box
                      component="span"
                      sx={{
                        backgroundColor: isSelected
                          ? alpha(theme.palette.common.white, 0.3)
                          : alpha(theme.palette.primary.main, 0.1),
                        borderRadius: '10px',
                        px: 0.8,
                        py: 0.2,
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {count}
                    </Box>
                  )}
                </Box>
              }
              onClick={() => onCategoryChange(category.id)}
              color={isSelected ? 'primary' : 'default'}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={{
                fontSize: '0.9rem',
                fontWeight: isSelected ? 'bold' : 'normal',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2
                }
              }}
            />
          );
        })}
      </Box>

      {/* Descrição da categoria selecionada */}
      {selectedCategory && DASHBOARD_CATEGORIES[selectedCategory] && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderRadius: 1,
            borderLeft: `3px solid ${theme.palette.primary.main}`
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {DASHBOARD_CATEGORIES[selectedCategory].description}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default CategorySelector;
