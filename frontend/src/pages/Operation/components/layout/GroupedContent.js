// frontend/src/pages/Operation/components/layout/GroupedContent.js
import React from 'react';
import {
    Box, Paper, Typography, Collapse, IconButton, Badge,
    Chip, Grid, Divider
} from '@mui/material';
import { ExpandMore, ExpandLess, Group } from '@mui/icons-material';
import useFiltersStore from '../../store/filtersStore';
import OperationCard from '../cards/OperationCard';
import OperationListItem from '../list/OperationListItem';

const GroupHeader = ({
    groupKey,
    items,
    isCollapsed,
    onToggle,
    groupBy
}) => {
    const getGroupIcon = () => {
        switch (groupBy) {
            case 'urgency':
                return groupKey === 'Urgentes' ? '🚨' : '📋';
            case 'assignee':
                return '👤';
            case 'location':
                return '📍';
            case 'type':
                return '🔧';
            case 'date':
                return '📅';
            default:
                return '📁';
        }
    };

    const getGroupColor = () => {
        switch (groupBy) {
            case 'urgency':
                return groupKey === 'Urgentes' ? 'error' : 'default';
            case 'assignee':
                return 'primary';
            case 'location':
                return 'info';
            case 'type':
                return 'secondary';
            case 'date':
                return 'success';
            default:
                return 'default';
        }
    };

    const urgentCount = items.filter(item => item.urgency === "1").length;

    return (
        <Paper
            sx={{
                p: 2,
                mb: 2,
                bgcolor: isCollapsed ? 'grey.50' : 'background.paper',
                border: '1px solid',
                borderColor: isCollapsed ? 'grey.200' : 'primary.200',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                    bgcolor: 'grey.50',
                    borderColor: 'primary.300'
                }
            }}
            onClick={onToggle}
        >
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                    <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                        {getGroupIcon()} {groupKey}
                    </Typography>

                    <Badge
                        badgeContent={items.length}
                        color={getGroupColor()}
                        max={999}
                    >
                        <Group color="action" />
                    </Badge>

                    {urgentCount > 0 && (
                        <Chip
                            size="small"
                            label={`${urgentCount} urgentes`}
                            color="error"
                            variant="outlined"
                        />
                    )}
                </Box>

                <IconButton>
                    {isCollapsed ? <ExpandMore /> : <ExpandLess />}
                </IconButton>
            </Box>

            {isCollapsed && (
                <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                        {urgentCount > 0 && ` • ${urgentCount} urgentes`}
                    </Typography>
                </Box>
            )}
        </Paper>
    );
};

const GroupedContent = ({
    data,
    viewMode,
    metaData,
    onItemClick,
    onNavigate,
    onCall,
    getUserNameByPk,
    getRemainingDaysColor,
    getAddressString,
    canExecuteActions,
    isRamaisView,
    ...props
}) => {
    const { groupBy, groupCollapsed, toggleGroupCollapsed } = useFiltersStore();

    // Normalizar dados: array ou objeto agrupado
    const normalizedData = React.useMemo(() => {
        if (Array.isArray(data)) {
            return { 'Todos': data };
        }
        return data;
    }, [data]);

    // Componente para renderizar item individual
    const renderItem = (item) => {
        // Validação de segurança
        if (!item || !item.pk) {
            console.warn('Item inválido:', item);
            return null;
        }

        if (viewMode === 'cards') {
            return (
                <OperationCard
                    key={item.pk}
                    item={item}
                    isUrgent={item.urgency === "1"}
                    canAct={canExecuteActions(item)}
                    onClick={() => onItemClick(item)}
                    onNavigate={() => onNavigate(item)}
                    onCall={() => onCall(item)}
                    getUserNameByPk={getUserNameByPk}
                    getRemainingDaysColor={getRemainingDaysColor}
                    getAddressString={getAddressString}
                    isRamaisView={isRamaisView}
                    metaData={metaData}
                />
            );
        }

        return (
            <OperationListItem
                key={item.pk}
                item={item}
                isUrgent={item.urgency === "1"}
                canAct={canExecuteActions(item)}
                onClick={() => onItemClick(item)}
                onNavigate={() => onNavigate(item)}
                onCall={() => onCall(item)}
                getUserNameByPk={getUserNameByPk}
                getRemainingDaysColor={getRemainingDaysColor}
                getAddressString={getAddressString}
                isRamaisView={isRamaisView}
                metaData={metaData}
            />
        );
    };

    // Se não há agrupamento, renderizar lista simples
    if (groupBy === 'none' || Object.keys(normalizedData).length === 1) {
        const items = Object.values(normalizedData).flat();

        if (viewMode === 'cards') {
            return (
                <Grid container spacing={2}>
                    {items.map(item => (
                        <Grid item xs={12} sm={6} md={4} key={item.pk}>
                            {renderItem(item)}
                        </Grid>
                    ))}
                </Grid>
            );
        }

        return (
            <Box>
                {items.map(renderItem)}
            </Box>
        );
    }

    // Renderizar com agrupamento
    return (
        <Box>
            {Object.entries(normalizedData).map(([groupKey, groupItems]) => {
                const isCollapsed = groupCollapsed[groupKey];

                return (
                    <Box key={groupKey} sx={{ mb: 3 }}>
                        {/* Cabeçalho do grupo */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 2,
                                p: 1,
                                bgcolor: 'grey.50',
                                borderRadius: 1,
                                cursor: 'pointer'
                            }}
                            onClick={() => toggleGroupCollapsed(groupKey)}
                        >
                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                {groupKey} ({groupItems.length})
                            </Typography>
                            <IconButton size="small">
                                {isCollapsed ? <ExpandMore /> : <ExpandLess />}
                            </IconButton>
                        </Box>

                        {/* Conteúdo do grupo */}
                        <Collapse in={!isCollapsed}>
                            {viewMode === 'cards' ? (
                                <Grid container spacing={2}>
                                    {groupItems.filter(item => item && item.pk).map(item => (
                                        <Grid item xs={12} sm={6} md={4} key={item.pk}>
                                            {renderItem(item)}
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Box>
                                    {groupItems.filter(item => item && item.pk).map(renderItem)}
                                </Box>
                            )}
                        </Collapse>
                    </Box>
                );
            })}
        </Box>
    );
};

export default GroupedContent;