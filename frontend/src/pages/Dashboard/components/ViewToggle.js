import React from 'react';
import { Box, ToggleButtonGroup, ToggleButton } from '@mui/material';
import {
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  TableChart as TableChartIcon,
  ViewModule as ViewModuleIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

/**
 * Componente para alternar entre diferentes tipos de visualização
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.viewName - Nome da view
 * @param {string} props.currentViewType - Tipo atual de visualização
 * @param {Function} props.onViewTypeChange - Função para mudar o tipo de visualização
 * @returns {React.ReactElement}
 */
const ViewToggle = ({ viewName, currentViewType, onViewTypeChange }) => (
  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
    <ToggleButtonGroup
      value={currentViewType}
      exclusive
      onChange={(e, newValue) => {
        if (newValue !== null) {
          onViewTypeChange(viewName, newValue);
        }
      }}
      size="small"
      aria-label="tipo de visualização"
    >
      <ToggleButton value="pie" aria-label="gráfico de pizza">
        <PieChartIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="bar" aria-label="gráfico de barras">
        <BarChartIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="treemap" aria-label="treemap">
        <ViewModuleIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="table" aria-label="tabela">
        <TableChartIcon fontSize="small" />
      </ToggleButton>
      <ToggleButton value="filter" aria-label="filtro">
        <FilterListIcon fontSize="small" />
      </ToggleButton>
    </ToggleButtonGroup>
  </Box>
);

export default ViewToggle;
