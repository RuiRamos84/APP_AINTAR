import React from 'react';
import { Grid } from '@mui/material';
import ChartCard from '../components/ChartCard';
import DynamicVisualization from '../components/DynamicVisualization';
import { getChartData } from '../utils/viewHelpers';

/**
 * Componente para a aba de Visão Geral
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.data - Dados do dashboard
 * @param {Object} props.viewTypes - Tipos de visualização para cada view
 * @param {Function} props.onViewTypeChange - Função para mudar o tipo de visualização
 * @param {Function} props.getViewTitle - Função para obter o título da view
 * @returns {React.ReactElement}
 */
const OverviewTab = ({ data, viewTypes, onViewTypeChange, getViewTitle }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ChartCard 
          title={getViewTitle("vbr_document_001")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_001"
          currentViewType={viewTypes.vbr_document_001}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization 
            viewName="vbr_document_001" 
            viewType={viewTypes.vbr_document_001} 
            data={getChartData(data, "vbr_document_001")}
          />
        </ChartCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <ChartCard 
          title={getViewTitle("vbr_document_002")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_002"
          currentViewType={viewTypes.vbr_document_002}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization 
            viewName="vbr_document_002" 
            viewType={viewTypes.vbr_document_002} 
            data={getChartData(data, "vbr_document_002")}
          />
        </ChartCard>
      </Grid>

      <Grid item xs={12}>
        <ChartCard 
          title={getViewTitle("vbr_document_004")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_004"
          currentViewType={viewTypes.vbr_document_004}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization 
            viewName="vbr_document_004" 
            viewType={viewTypes.vbr_document_004} 
            data={getChartData(data, "vbr_document_004")}
          />
        </ChartCard>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;
