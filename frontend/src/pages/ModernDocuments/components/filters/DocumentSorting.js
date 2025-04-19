import React from 'react';
import {
    Box,
    Paper,
    Typography,
    useTheme,
    Collapse,
    alpha,
    Chip,
    Stack
} from '@mui/material';
import {
    Sort as SortIcon,
    Schedule as ScheduleIcon,
    KeyboardArrowDown as ExpandMoreIcon,
    KeyboardArrowUp as ExpandLessIcon,
    Assignment as DocumentIcon,
    Person as CreatorIcon,
    LocationCity as AssociateIcon,
    AccountTree as TypeIcon,
    FilterAlt as FilterIcon
} from '@mui/icons-material';

const DocumentSorting = ({
    open,
    sortBy,
    sortDirection,
    onSortChange,
    density = 'standard'
}) => {
    const theme = useTheme();

    // Configurações baseadas na densidade
    const getPaperPadding = () => density === 'compact' ? 1.5 : density === 'comfortable' ? 3 : 2;

    // Opções de ordenação com ícones
    const sortOptions = [
        { field: 'submission', label: 'Data', icon: <ScheduleIcon fontSize="small" /> },
        { field: 'regnumber', label: 'Número', icon: <DocumentIcon fontSize="small" /> },
        { field: 'ts_entity', label: 'Entidade', icon: <AssociateIcon fontSize="small" /> },
        { field: 'what', label: 'Status', icon: <FilterIcon fontSize="small" /> },
        { field: 'tt_type', label: 'Tipo', icon: <TypeIcon fontSize="small" /> },
        { field: 'creator', label: 'Criador', icon: <CreatorIcon fontSize="small" /> },
    ];

    return (
        <Collapse in={open} timeout="auto">
            <Paper
                variant="outlined"
                sx={{
                    p: getPaperPadding(),
                    mb: 2,
                    bgcolor: theme.palette.mode === 'dark'
                        ? alpha(theme.palette.background.paper, 0.5)
                        : alpha(theme.palette.grey[50], 0.9),
                    borderRadius: 1,
                    position: 'relative'
                }}
            >
                <Typography variant="subtitle1" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <SortIcon sx={{ mr: 1 }} />
                    Ordenação
                </Typography>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {sortOptions.map(({ field, label, icon }) => (
                        <Chip
                            key={field}
                            label={label}
                            icon={icon}
                            variant={sortBy === field ? "filled" : "outlined"}
                            color={sortBy === field ? "primary" : "default"}
                            onClick={() => onSortChange(field)}
                            deleteIcon={sortBy === field ? (
                                sortDirection === 'asc' ? <ExpandLessIcon /> : <ExpandMoreIcon />
                            ) : undefined}
                            onDelete={sortBy === field ? () => onSortChange(field) : undefined}
                            sx={{ fontWeight: sortBy === field ? 'medium' : 'normal' }}
                        />
                    ))}
                </Stack>
            </Paper>
        </Collapse>
    );
};

export default DocumentSorting;