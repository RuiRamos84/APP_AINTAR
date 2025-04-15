import React from 'react';
import { Box, Typography } from '@mui/material';

// Importar todas as visualizações
import PieChartView from '../visualizations/PieChartView';
import BarChartView from '../visualizations/BarChartView';
import TreeMapView from '../visualizations/TreeMapView';
import TableView from '../visualizations/TableView';
import FilterableChartView from '../visualizations/FilterableChartView';
import LineChartView from '../visualizations/LineChartView';
import AreaChartView from '../visualizations/AreaChartView';
import RadarChartView from '../visualizations/RadarChartView';

/**
 * Componente que seleciona a visualização apropriada com base no tipo e nome da view
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.viewName - Nome da view
 * @param {string} props.viewType - Tipo de visualização
 * @param {Array} props.data - Dados para visualização
 * @param {number} props.height - Altura da visualização
 * @returns {React.ReactElement}
 */
const DynamicVisualization = ({ viewName, viewType, data, height = 300 }) => {
  // Verificar se há dados disponíveis
  if (!data || data.length === 0) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="subtitle1" color="text.secondary">
          Sem dados disponíveis
        </Typography>
      </Box>
    );
  }

  // Visualização de Tabela
  if (viewType === 'table') {
    return <TableView data={data} viewName={viewName} />;
  }

  // Visualização com Filtro Interativo
  if (viewType === 'filter') {
    return <FilterableChartView data={data} viewName={viewName} />;
  }

  // Visualização TreeMap
  if (viewType === 'treemap') {
    return <TreeMapView data={data} height={height} />;
  }

  // Visualizações específicas para cada tipo de gráfico
  switch (viewType) {
    case 'pie':
      return <PieChartView data={data} viewName={viewName} height={height} />;

    case 'bar':
      return <BarChartView data={data} viewName={viewName} height={height} />;

    case 'line':
      return <LineChartView data={data} viewName={viewName} height={height} />;

    case 'area':
      return <AreaChartView data={data} viewName={viewName} height={height} />;

    case 'radar':
      return <RadarChartView data={data} viewName={viewName} height={height} />;

    default:
      // Escolhe visualização padrão baseado na view
      if (viewName === 'vbr_document_001') {
        return <PieChartView data={data} viewName={viewName} height={height} />;
      } else if (viewName === 'vbr_document_007') {
        return <RadarChartView data={data} viewName={viewName} height={height} />;
      } else if (viewName === 'vbr_document_005' || viewName === 'vbr_document_009') {
        return <LineChartView data={data} viewName={viewName} height={height} />;
      } else if (viewName === 'vbr_document_008') {
        return <AreaChartView data={data} viewName={viewName} height={height} />;
      } else {
        return <BarChartView data={data} viewName={viewName} height={height} />;
      }
  }
};

export default DynamicVisualization;