import React from 'react';
import { Grid } from '@mui/material';
import ChartCard from '../components/ChartCard';
import DynamicVisualization from '../components/DynamicVisualization';
import { getChartData } from '../utils/viewHelpers';

/**
 * Componente para a aba de Desempenho por Técnico
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.data - Dados do dashboard
 * @param {Object} props.viewTypes - Tipos de visualização para cada view
 * @param {Function} props.onViewTypeChange - Função para mudar o tipo de visualização
 * @param {Function} props.getViewTitle - Função para obter o título da view
 * @returns {React.ReactElement}
 */
const PerformanceTab = ({ data, viewTypes, onViewTypeChange, getViewTitle }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ChartCard 
          title={getViewTitle("vbr_document_006")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_006"
          currentViewType={viewTypes.vbr_document_006}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization 
            viewName="vbr_document_006" 
            viewType={viewTypes.vbr_document_006} 
            data={getChartData(data, "vbr_document_006")}
          />
        </ChartCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartCard 
          title={getViewTitle("vbr_document_007")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_007"
          currentViewType={viewTypes.vbr_document_007}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization 
            viewName="vbr_document_007" 
            viewType={viewTypes.vbr_document_007} 
            data={getChartData(data, "vbr_document_007")}
          />
        </ChartCard>
      </Grid>

      <Grid item xs={12}>
        <ChartCard 
          title={getViewTitle("vbr_document_009")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_009"
          currentViewType={viewTypes.vbr_document_009}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization 
            viewName="vbr_document_009" 
            viewType={viewTypes.vbr_document_009} 
            data={getChartData(data, "vbr_document_009")}
          />
        </ChartCard>
      </Grid>
    </Grid>
  );
};

export default PerformanceTab;
