import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { DirectionsCar as CarIcon } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import VehicleList from './VehicleList.jsx';
import AssignmentsList from './AssignmentsList.jsx';
import MaintenanceList from './MaintenanceList.jsx';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fleet-tabpanel-${index}`}
      aria-labelledby={`fleet-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const FleetDashboard = () => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <ModulePage
      title="Gestão de Frota"
      icon={CarIcon}
      color={theme.palette.primary.main}
      breadcrumbs={[
        { label: 'Início', path: '/' },
        { label: 'Frota' },
      ]}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          aria-label="fleet tabs"
        >
          <Tab label="Veículos" />
          <Tab label="Atribuições (Check-in/out)" />
          <Tab label="Manutenções Auto" />
        </Tabs>
      </Box>

      <TabPanel value={tabIndex} index={0}>
        <VehicleList />
      </TabPanel>
      <TabPanel value={tabIndex} index={1}>
        <AssignmentsList />
      </TabPanel>
      <TabPanel value={tabIndex} index={2}>
        <MaintenanceList />
      </TabPanel>
    </ModulePage>
  );
};

export default FleetDashboard;
