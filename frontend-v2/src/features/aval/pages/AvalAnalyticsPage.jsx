import { useState } from 'react';
import { Box, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import {
  Insights as InsightsIcon,
  Person as PersonIcon,
  QueryStats as StatsIcon,
  CompareArrows as CompareIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import ModulePage from '@/shared/components/layout/ModulePage';
import { useAvalAnalytics } from '../hooks/useAvalAnalytics';
import TeamInsightsTab      from '../components/analytics/TeamInsightsTab';
import IndividualInsightsTab from '../components/analytics/IndividualInsightsTab';
import TeamEvolutionTab     from '../components/analytics/TeamEvolutionTab';
import IndividualEvolutionTab from '../components/analytics/IndividualEvolutionTab';
import PeriodComparisonTab  from '../components/analytics/PeriodComparisonTab';

const TABS = [
  { label: 'Visão da Equipa',       icon: <InsightsIcon />  },
  { label: 'O Meu Perfil',         icon: <PersonIcon />    },
  { label: 'Evolução Histórica',   icon: <TimelineIcon />  },
  { label: 'Comparação de Períodos', icon: <CompareIcon /> },
];

function AvalAnalyticsPage() {
  const [tab, setTab] = useState(0);
  const { rawData, periods, people, enriched, loading } = useAvalAnalytics();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const shared = { rawData, periods, people, loading };

  return (
    <ModulePage
      title="Análise de Avaliações"
      subtitle="Insights de desempenho individual e coletivo"
      icon={StatsIcon}
      color="primary"
      breadcrumbs={[{ label: 'Análise de Avaliações' }]}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant={isMobile ? 'scrollable' : 'standard'}
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.label}
            label={isMobile ? undefined : t.label}
            icon={t.icon}
            iconPosition={isMobile ? 'top' : 'start'}
            aria-label={t.label}
          />
        ))}
      </Tabs>

      <Box>
        {tab === 0 && <TeamInsightsTab      enriched={enriched} loading={loading} />}
        {tab === 1 && <IndividualInsightsTab enriched={enriched} rawData={rawData} periods={periods} loading={loading} />}
        {tab === 2 && <TeamEvolutionTab      {...shared} />}
        {tab === 3 && <PeriodComparisonTab   {...shared} me={enriched?.me} />}
      </Box>
    </ModulePage>
  );
}

export default AvalAnalyticsPage;
