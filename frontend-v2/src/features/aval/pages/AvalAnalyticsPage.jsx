import { useState } from 'react';
import { Box, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import {
  Groups as TeamIcon,
  Person as PersonIcon,
  CompareArrows as CompareIcon,
  QueryStats as StatsIcon,
} from '@mui/icons-material';
import ModulePage from '@/shared/components/layout/ModulePage';
import { useAvalAnalytics } from '../hooks/useAvalAnalytics';
import TeamEvolutionTab     from '../components/analytics/TeamEvolutionTab';
import IndividualEvolutionTab from '../components/analytics/IndividualEvolutionTab';
import PeriodComparisonTab  from '../components/analytics/PeriodComparisonTab';

const TABS = [
  { label: 'Média da Equipa',        icon: <TeamIcon />    },
  { label: 'Evolução Individual',    icon: <PersonIcon />  },
  { label: 'Comparação de Períodos', icon: <CompareIcon /> },
];

function AvalAnalyticsPage() {
  const [tab, setTab] = useState(0);
  const { rawData, periods, people, loading } = useAvalAnalytics();
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const shared = { rawData, periods, people, loading };

  return (
    <ModulePage
      title="Análise de Avaliações"
      subtitle="Evolução e comparação de desempenho ao longo dos períodos"
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
        {tab === 0 && <TeamEvolutionTab      {...shared} />}
        {tab === 1 && <IndividualEvolutionTab {...shared} />}
        {tab === 2 && <PeriodComparisonTab   {...shared} />}
      </Box>
    </ModulePage>
  );
}

export default AvalAnalyticsPage;
