import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, Tab, Badge, Box, Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const DocumentTabs = ({ documents, onFilterChange }) => {
    const [value, setValue] = useState(4);
    const theme = useTheme();

    const states = useMemo(() => ({
        '-1': 'ANULADO',
        '0': 'CONCLUÍDO',
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
        '13': 'PARA ACEITAÇÃO DE ORÇAMENTO',
        '100': 'PARA PAGAMENTO DE PAVIMENTAÇÃO'
    }), []);

    const getDocumentCount = useMemo(() => {
        return (stateId) => {
            return documents.filter(doc => doc.what === parseInt(stateId)).length;
        };
    }, [documents]);

    const handleChange = (event, newValue) => {
        setValue(newValue);
        onFilterChange(newValue);
    };

    useEffect(() => {
        const firstStateWithDocs = Object.keys(states).find(id => getDocumentCount(id) > 0);
        if (firstStateWithDocs) {
            const stateValue = parseInt(firstStateWithDocs);
            setValue(stateValue);
            onFilterChange(stateValue);
        }
    }, [documents, states, getDocumentCount, onFilterChange]);

    const activeStates = useMemo(() => {
        return Object.entries(states).filter(([id]) => getDocumentCount(id) > 0);
    }, [states, getDocumentCount]);

    if (activeStates.length === 0) {
        return null;
    }

    return (
        <Box sx={{
            width: '100%',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            flexShrink: 0,
            borderBottom: 1,
            borderColor: 'divider',
            mb: 2
        }}>
            <Tabs
                value={value}
                onChange={handleChange}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                    minHeight: 48,
                    '& .MuiTab-root': {
                        minHeight: 48,
                        textTransform: 'none',
                        minWidth: 'auto',
                        px: 2,
                        py: 1.5,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                        '&.Mui-selected': {
                            color: 'primary.main',
                            fontWeight: 600,
                        }
                    },
                    '& .MuiTabs-flexContainer': {
                        minHeight: 48,
                    },
                    '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: '3px 3px 0 0',
                    }
                }}
            >
                {activeStates.map(([id, label]) => {
                    const count = getDocumentCount(id);
                    const stateId = parseInt(id);

                    return (
                        <Tab
                            key={id}
                            value={stateId}
                            label={
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.5,
                                    whiteSpace: 'nowrap'
                                }}>
                                    <span>{label}</span>
                                    <Chip
                                        label={count}
                                        size="small"
                                        color={stateId === value ? "primary" : "default"}
                                        variant={stateId === value ? "filled" : "outlined"}
                                        sx={{
                                            height: 20,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            minWidth: 24,
                                            '& .MuiChip-label': {
                                                px: 1,
                                            }
                                        }}
                                    />
                                </Box>
                            }
                            sx={{
                                opacity: count === 0 ? 0.5 : 1,
                                pointerEvents: count === 0 ? 'none' : 'auto'
                            }}
                        />
                    );
                })}
            </Tabs>
        </Box>
    );
};

export default DocumentTabs;