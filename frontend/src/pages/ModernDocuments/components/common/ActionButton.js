import React from 'react';
import PropTypes from 'prop-types';
import { IconButton, Button, Tooltip, Badge, useMediaQuery, useTheme } from '@mui/material';

const ActionButton = ({
    tooltip,
    label,
    icon,
    color = 'primary',
    iconOnly = false,
    badgeCount = 0,
    disabled = false,
    onClick,
    size = 'medium',
    variant = 'contained',
    ...props
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const useIconMode = iconOnly || isMobile;
    const buttonIcon = badgeCount > 0 ? (
        <Badge
            badgeContent={badgeCount}
            color="error"
            overlap="circular"
            sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem' } }}
        >
            {icon}
        </Badge>
    ) : (
        icon
    );

    if (useIconMode) {
        return (
            <Tooltip title={tooltip || label} arrow>
                <span>
                    <IconButton
                        color={color}
                        disabled={disabled}
                        onClick={onClick}
                        size={size}
                        aria-label={tooltip || label}
                        {...props}
                    >
                        {buttonIcon}
                    </IconButton>
                </span>
            </Tooltip>
        );
    }

    return (
        <Tooltip title={tooltip} arrow>
            <Button
                variant={variant}
                color={color}
                disabled={disabled}
                onClick={onClick}
                size={size}
                startIcon={buttonIcon}
                aria-label={label}
                {...props}
            >
                {label}
            </Button>
        </Tooltip>
    );
};

ActionButton.propTypes = {
    tooltip: PropTypes.string,
    label: PropTypes.string,
    icon: PropTypes.node.isRequired,
    color: PropTypes.string,
    iconOnly: PropTypes.bool,
    badgeCount: PropTypes.number,
    disabled: PropTypes.bool,
    onClick: PropTypes.func.isRequired,
    size: PropTypes.string,
    variant: PropTypes.string,
};

export default ActionButton;
