/**
 * COMPONENTE DE ESTADO VAZIO UNIFICADO
 *
 * ✅ Otimizado para mobile
 * ✅ Responsivo e acessível
 * ✅ Textos em PT-PT
 */
import React from 'react';
import { Box, Typography, Button, Paper, useMediaQuery, useTheme } from '@mui/material';
import { Inbox, Refresh, FilterList } from '@mui/icons-material';
import MESSAGES from '../../constants/messages';

const EmptyState = ({
    type = 'no-data', // 'no-data', 'no-filters', 'no-results'
    onRefresh,
    onClearFilters,
    hasFilters = false
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const getContent = () => {
        switch (type) {
            case 'no-filters':
                return {
                    icon: <FilterList sx={{ fontSize: isMobile ? 48 : 64, color: 'text.secondary' }} />,
                    title: MESSAGES.EMPTY.SELECT_ASSOCIATE,
                    subtitle: MESSAGES.EMPTY.CHOOSE_ASSOCIATE,
                    action: null
                };

            case 'no-results':
                return {
                    icon: <Inbox sx={{ fontSize: isMobile ? 48 : 64, color: 'text.secondary' }} />,
                    title: hasFilters ? MESSAGES.EMPTY.NO_RESULTS : MESSAGES.EMPTY.NO_DATA,
                    subtitle: hasFilters
                        ? 'Tente ajustar os filtros de pesquisa'
                        : 'Não há operações para mostrar nesta vista',
                    action: hasFilters ? (
                        <Button
                            variant="outlined"
                            onClick={onClearFilters}
                            startIcon={!isMobile && <FilterList />}
                            fullWidth={isMobile}
                            size={isMobile ? 'medium' : 'large'}
                            aria-label={MESSAGES.EMPTY.CLEAR_FILTERS}
                        >
                            {MESSAGES.EMPTY.CLEAR_FILTERS}
                        </Button>
                    ) : null
                };

            default: // 'no-data'
                return {
                    icon: <Inbox sx={{ fontSize: isMobile ? 48 : 64, color: 'text.secondary' }} />,
                    title: MESSAGES.EMPTY.NO_DATA,
                    subtitle: 'Não há operações disponíveis no momento',
                    action: onRefresh ? (
                        <Button
                            variant="outlined"
                            onClick={onRefresh}
                            startIcon={!isMobile && <Refresh />}
                            fullWidth={isMobile}
                            size={isMobile ? 'medium' : 'large'}
                            aria-label={MESSAGES.UI.REFRESH}
                        >
                            {MESSAGES.UI.REFRESH}
                        </Button>
                    ) : null
                };
        }
    };

    const content = getContent();

    return (
        <Paper
            sx={{
                p: isMobile ? 4 : 6,
                textAlign: 'center',
                bgcolor: 'grey.50',
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: isMobile ? 2 : 3,
                mx: isMobile ? 1 : 0
            }}
            role="status"
            aria-live="polite"
        >
            <Box sx={{ mb: isMobile ? 2 : 3 }} role="img" aria-label="Ícone de estado vazio">
                {content.icon}
            </Box>

            <Typography
                variant={isMobile ? 'subtitle1' : 'h6'}
                gutterBottom
                color="text.secondary"
                sx={{
                    fontSize: isMobile ? '1rem' : '1.25rem',
                    fontWeight: isMobile ? 600 : 500
                }}
            >
                {content.title}
            </Typography>

            <Typography
                variant={isMobile ? 'caption' : 'body2'}
                color="text.secondary"
                sx={{
                    mb: isMobile ? 2.5 : 3,
                    fontSize: isMobile ? '0.85rem' : '0.875rem'
                }}
            >
                {content.subtitle}
            </Typography>

            {content.action}
        </Paper>
    );
};

export default EmptyState;