// frontend/src/pages/Operation/components/common/EmptyState.js - NOVO
import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Inbox, Refresh, FilterList } from '@mui/icons-material';

const EmptyState = ({
    type = 'no-data', // 'no-data', 'no-filters', 'no-results'
    onRefresh,
    onClearFilters,
    hasFilters = false
}) => {
    const getContent = () => {
        switch (type) {
            case 'no-filters':
                return {
                    icon: <FilterList sx={{ fontSize: 64, color: 'text.secondary' }} />,
                    title: 'Seleccione um associado',
                    subtitle: 'Escolha um associado para ver os dados das operações',
                    action: null
                };

            case 'no-results':
                return {
                    icon: <Inbox sx={{ fontSize: 64, color: 'text.secondary' }} />,
                    title: hasFilters ? 'Nenhum resultado encontrado' : 'Sem dados',
                    subtitle: hasFilters
                        ? 'Tente ajustar os filtros de pesquisa'
                        : 'Não há operações para mostrar nesta vista',
                    action: hasFilters ? (
                        <Button
                            variant="outlined"
                            onClick={onClearFilters}
                            startIcon={<FilterList />}
                        >
                            Limpar Filtros
                        </Button>
                    ) : null
                };

            default: // 'no-data'
                return {
                    icon: <Inbox sx={{ fontSize: 64, color: 'text.secondary' }} />,
                    title: 'Sem dados',
                    subtitle: 'Não há operações disponíveis no momento',
                    action: onRefresh ? (
                        <Button
                            variant="outlined"
                            onClick={onRefresh}
                            startIcon={<Refresh />}
                        >
                            Actualizar
                        </Button>
                    ) : null
                };
        }
    };

    const content = getContent();

    return (
        <Paper
            sx={{
                p: 6,
                textAlign: 'center',
                bgcolor: 'grey.50',
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: 3
            }}
        >
            <Box sx={{ mb: 3 }}>
                {content.icon}
            </Box>

            <Typography variant="h6" gutterBottom color="text.secondary">
                {content.title}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {content.subtitle}
            </Typography>

            {content.action}
        </Paper>
    );
};

export default EmptyState;