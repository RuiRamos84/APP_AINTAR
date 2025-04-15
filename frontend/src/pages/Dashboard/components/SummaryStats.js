import React from 'react';
import { Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import StatCard from './StatCard';
import { calculateSummaryMetrics } from '../utils/viewHelpers';
import { formatNumber, formatTime } from '../utils/formatters';

// Ícones
import AssignmentIcon from "@mui/icons-material/Assignment";
import TimelineIcon from "@mui/icons-material/Timeline";
import EqualizerIcon from "@mui/icons-material/Equalizer";
import BusinessIcon from "@mui/icons-material/Business";

/**
 * Componente que exibe as estatísticas resumidas
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.data - Dados do dashboard
 * @param {boolean} props.animationComplete - Se a animação está completa
 * @returns {React.ReactElement}
 */
const SummaryStats = ({ data, animationComplete = true }) => {
  const theme = useTheme();
  const metrics = calculateSummaryMetrics(data);

  return (
    <Grid container spacing={3} mb={4}>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<AssignmentIcon />}
          title="Total de Pedidos"
          value={formatNumber(metrics.totalRequests)}
          color={theme.palette.primary.main}
          delay={0}
          animationComplete={animationComplete}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<TimelineIcon />}
          title="Tempo Médio de Resposta"
          value={formatTime(metrics.avgResponseTime)}
          color={theme.palette.success.main}
          delay={1}
          animationComplete={animationComplete}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<EqualizerIcon />}
          title="Tipo Mais Comum"
          value={metrics.mostCommonType}
          color={theme.palette.info.main}
          delay={2}
          animationComplete={animationComplete}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <StatCard
          icon={<BusinessIcon />}
          title="Concelho Mais Ativo"
          value={metrics.mostActiveCity}
          color={theme.palette.secondary.main}
          delay={3}
          animationComplete={animationComplete}
        />
      </Grid>
    </Grid>
  );
};

export default SummaryStats;
