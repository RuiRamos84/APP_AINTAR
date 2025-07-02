import React from 'react';
import { Grid } from '@mui/material';
import ChartCard from './components/ChartCard';
import DynamicVisualization from './components/DynamicVisualization';
import { getChartData } from './utils/viewHelpers';

/**
 * Componente para a aba de Análise Detalhada
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.data - Dados do dashboard
 * @param {Object} props.viewTypes - Tipos de visualização para cada view
 * @param {Function} props.onViewTypeChange - Função para mudar o tipo de visualização
 * @param {Function} props.getViewTitle - Função para obter o título da view
 * @returns {React.ReactElement}
 */
const DetailsTab = ({ data, viewTypes, onViewTypeChange, getViewTitle }) => {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <ChartCard
          title={getViewTitle("vbr_document_003")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_003"
          currentViewType={viewTypes.vbr_document_003}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization
            viewName="vbr_document_003"
            viewType={viewTypes.vbr_document_003}
            data={getChartData(data, "vbr_document_003")}
          />
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12 }} md={6}>
        <ChartCard
          title={getViewTitle("vbr_document_005")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_005"
          currentViewType={viewTypes.vbr_document_005}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization
            viewName="vbr_document_005"
            viewType={viewTypes.vbr_document_005}
            data={getChartData(data, "vbr_document_005")}
          />
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12 }} md={6}>
        <ChartCard
          title={getViewTitle("vbr_document_008")}
          subtitle="Escolha diferentes visualizações para melhor visualizar os dados"
          viewToggle={true}
          viewName="vbr_document_008"
          currentViewType={viewTypes.vbr_document_008}
          onViewTypeChange={onViewTypeChange}
        >
          <DynamicVisualization
            viewName="vbr_document_008"
            viewType={viewTypes.vbr_document_008}
            data={getChartData(data, "vbr_document_008")}
          />
        </ChartCard>
      </Grid>
    </Grid>
  );
};

export default DetailsTab;