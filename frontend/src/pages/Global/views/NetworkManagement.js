// frontend/src/pages/Global/views/NetworkManagement.js

import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Button, Typography, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RecordManager from '../components/common/RecordManager';
import RequestManager from '../components/forms/RequestManager';
import { AREAS } from '../utils/constants';

const NETWORK_TABS = {
    3: [ // Rede
        { id: 0, label: 'Despesas', type: 'expense' },
        { id: 1, label: 'Desobstrução Conduta', type: 'rede_desobstrucao' },
        { id: 2, label: 'Reparação/Colapso', type: 'rede_reparacao_colapso' },
        { id: 3, label: 'Desobstrução Caixas', type: 'caixa_desobstrucao' },
        { id: 4, label: 'Reparação Caixas', type: 'caixa_reparacao' },
        { id: 5, label: 'Reparação Tampas', type: 'caixa_reparacao_tampa' }
    ],
    4: [ // Ramais
        { id: 0, label: 'Despesas', type: 'expense' },
        { id: 1, label: 'Desobstrução', type: 'ramal_desobstrucao' },
        { id: 2, label: 'Reparação', type: 'ramal_reparacao' }
    ]
};

const NetworkManagement = ({ areaId, onBack }) => {
    const [selectedTab, setSelectedTab] = useState(0);
    const tabs = NETWORK_TABS[areaId] || [];
    const currentArea = Object.values(AREAS).find(area => area.id === areaId);

    const renderTabContent = () => {
        const currentTab = tabs[selectedTab];
        if (!currentTab) return null;

        if (currentTab.type === 'expense') {
            return <RecordManager recordType="expense" entityRequired={false} />;
        }

        return <RequestManager requestType={currentTab.type} />;
    };

    return (
        <Box>
            {/* Header padronizado */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
                sx={{
                    minHeight: '56px',
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 1
                }}
            >
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {currentArea?.name}
                </Typography>

                {/* Centro - Info contextual */}
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Chip
                        label="Gestão de Infraestrutura"
                        variant="outlined"
                        size="small"
                        color="primary"
                    />
                </Box>

                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                >
                    Voltar
                </Button>
            </Box>

            <Paper>
                <Tabs
                    value={selectedTab}
                    onChange={(e, v) => setSelectedTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    {tabs.map(tab => (
                        <Tab key={tab.id} label={tab.label} />
                    ))}
                </Tabs>

                <Box sx={{ p: 3 }}>
                    {renderTabContent()}
                </Box>
            </Paper>
        </Box>
    );
};

export default NetworkManagement;