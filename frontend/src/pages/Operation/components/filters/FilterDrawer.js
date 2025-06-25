// frontend/src/pages/Operation/components/filters/FilterDrawer.js - NOVO
import React from 'react';
import {
    SwipeableDrawer, Box, Typography, List, ListItem,
    Switch, FormControlLabel, Divider, Button, Chip
} from '@mui/material';
import {
    Warning, Today, Person, Clear
} from '@mui/icons-material';

const FilterDrawer = ({
    open,
    onClose,
    filters,
    onFilterChange,
    itemCount = 0
}) => {
    const handleToggle = (filterType) => {
        onFilterChange(filterType, !filters[filterType]);
    };

    const clearAll = () => {
        Object.keys(filters).forEach(key => {
            onFilterChange(key, false);
        });
    };

    const activeCount = Object.values(filters).filter(Boolean).length;

    return (
        <SwipeableDrawer
            anchor="bottom"
            open={open}
            onClose={onClose}
            onOpen={() => { }}
            disableSwipeToOpen
            PaperProps={{
                sx: {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    maxHeight: '50%'
                }
            }}
        >
            <Box sx={{ p: 3 }}>
                {/* Handle */}
                <Box sx={{
                    width: 40,
                    height: 4,
                    bgcolor: 'grey.300',
                    borderRadius: 2,
                    mx: 'auto',
                    mb: 3
                }} />

                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                        Filtros
                        {activeCount > 0 && (
                            <Chip
                                size="small"
                                label={activeCount}
                                color="primary"
                                sx={{ ml: 1 }}
                            />
                        )}
                    </Typography>
                    <Chip
                        size="small"
                        label={`${itemCount} items`}
                        variant="outlined"
                    />
                </Box>

                <List sx={{ py: 0 }}>
                    {/* Urgentes */}
                    <ListItem sx={{ px: 0 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={filters.urgency}
                                    onChange={() => handleToggle('urgency')}
                                    color="error"
                                />
                            }
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Warning color="error" fontSize="small" />
                                    <Typography>Só urgentes</Typography>
                                </Box>
                            }
                        />
                    </ListItem>

                    <Divider />

                    {/* Hoje */}
                    <ListItem sx={{ px: 0 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={filters.today}
                                    onChange={() => handleToggle('today')}
                                    color="primary"
                                />
                            }
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Today color="primary" fontSize="small" />
                                    <Typography>Criados hoje</Typography>
                                </Box>
                            }
                        />
                    </ListItem>

                    <Divider />

                    {/* Meus */}
                    <ListItem sx={{ px: 0 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={filters.myTasks}
                                    onChange={() => handleToggle('myTasks')}
                                    color="secondary"
                                />
                            }
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Person color="secondary" fontSize="small" />
                                    <Typography>Só os meus</Typography>
                                </Box>
                            }
                        />
                    </ListItem>
                </List>

                {/* Acções */}
                <Box display="flex" gap={2} mt={3}>
                    <Button
                        variant="outlined"
                        startIcon={<Clear />}
                        onClick={clearAll}
                        disabled={activeCount === 0}
                        fullWidth
                    >
                        Limpar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={onClose}
                        fullWidth
                    >
                        Aplicar
                    </Button>
                </Box>
            </Box>
        </SwipeableDrawer>
    );
};

export default FilterDrawer;