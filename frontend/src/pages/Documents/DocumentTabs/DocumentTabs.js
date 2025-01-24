import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Badge, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const DocumentTabs = ({ documents, onFilterChange }) => {
    const [value, setValue] = useState(4);
    const theme = useTheme();

    const states = {
        '-1': 'ANULADO',
        '0': 'CONCLUIDO',
        '1': 'ENTRADA',
        '4': 'PARA TRATAMENTO',
        '5': 'ANÁLISE EXTERNA',
        '6': 'PEDIDO DE ELEMENTOS',
        '7': 'EMISSÃO DE OFÍCIO',
        '8': 'PARA PAVIMENTAÇÃO',
        '9': 'PARA AVALIAÇÃO NO TERRENO',
        '10': 'PARA EXECUÇÃO',
        '11': 'PARA ORÇAMENTAÇÃO',
        '12': 'PARA COBRANÇA',
        '100': 'PARA PAGAMENTO DE PAVIMENTAÇÃO'
    };

    const getDocumentCount = (stateId) => {
        return documents.filter(doc => doc.what === parseInt(stateId)).length;
    };

    const handleChange = (event, newValue) => {
        setValue(newValue);
        onFilterChange(newValue);
    };

    useEffect(() => {
        const hasDocuments = getDocumentCount(value) > 0;
        if (!hasDocuments) {
            const firstStateWithDocs = Object.keys(states).find(id => getDocumentCount(id) > 0);
            if (firstStateWithDocs) {
                setValue(parseInt(firstStateWithDocs));
                onFilterChange(parseInt(firstStateWithDocs));
            }
        }
    }, [documents]);

    const activeStates = Object.entries(states).filter(([id]) => getDocumentCount(id) > 0);

    return (
        <Tabs
            value={value}
            onChange={handleChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': {
                    minHeight: '48px',
                    textTransform: 'none',
                    minWidth: 'auto',
                    padding: '12px 16px'
                }
            }}
        >
            {activeStates.map(([id, label]) => (
                <Tab
                    key={id}
                    value={parseInt(id)}
                    label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {label}
                            <Badge
                                badgeContent={getDocumentCount(id)}
                                color="primary"
                                max={999}
                                sx={{
                                    '& .MuiBadge-badge': {
                                        position: 'relative',
                                        transform: 'none',
                                    }
                                }}
                            />
                        </Box>
                    }
                />
            ))}
        </Tabs>
    );
};

export default DocumentTabs;