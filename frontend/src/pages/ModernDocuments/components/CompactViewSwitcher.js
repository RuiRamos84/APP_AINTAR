import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    IconButton,
    Tooltip,
    Paper,
    Typography,
    Fade,
    useTheme,
    alpha
} from '@mui/material';
import {
    Dashboard as GridIcon,
    List as ListIcon,
} from '@mui/icons-material';

/**
 * Compact View Switcher com hover expand
 * Design pattern: Progressive disclosure - mostra apenas o necessário, expande on hover
 *
 * Benefícios UX:
 * - Ocupa menos espaço (50% reduction)
 * - Hierarquia visual clara
 * - Smooth transitions
 * - Touch-friendly (mobile)
 */
const CompactViewSwitcher = ({ viewMode, setViewMode, isMobileView }) => {
    const theme = useTheme();
    const [isHovered, setIsHovered] = useState(false);

    const views = [
        { id: 'grid', icon: <GridIcon />, label: 'Grelha' },
        { id: 'list', icon: <ListIcon />, label: 'Lista' },
    ];

    return (
        <Box
            onMouseEnter={() => !isMobileView && setIsHovered(true)}
            onMouseLeave={() => !isMobileView && setIsHovered(false)}
            sx={{
                display: 'inline-flex',
                gap: { xs: 0.25, md: 0.5 },
                p: { xs: 0.25, md: 0.5 },
                borderRadius: { xs: 1.5, md: 2 },
                bgcolor: isMobileView ? 'transparent' : alpha(theme.palette.background.paper, 0.6),
                border: isMobileView ? 'none' : `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
        >
            {views.map((view) => {
                const isActive = view.id === viewMode;

                return (
                    <Tooltip key={view.id} title={view.label} arrow>
                        <IconButton
                            onClick={() => setViewMode(view.id)}
                            size={isMobileView ? 'small' : 'small'}
                            sx={{
                                bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                p: { xs: 0.5, md: 1 },
                                '& svg': {
                                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                                },
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                                },
                            }}
                        >
                            {view.icon}
                        </IconButton>
                    </Tooltip>
                );
            })}
        </Box>
    );
};

CompactViewSwitcher.propTypes = {
    viewMode: PropTypes.oneOf(['grid', 'list']).isRequired,
    setViewMode: PropTypes.func.isRequired,
    isMobileView: PropTypes.bool.isRequired,
};

export default CompactViewSwitcher;
