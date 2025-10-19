import React from 'react';
import PropTypes from 'prop-types';
import { Fab, useTheme, alpha } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const MobileFloatingButton = ({ onClick }) => {
    const theme = useTheme();

    return (
        <Fab
            color="primary"
            aria-label="Novo pedido"
            onClick={onClick}
            sx={{
                position: 'fixed',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                boxShadow: 6,
                '&:active': {
                    boxShadow: 2,
                },
            }}
        >
            <AddIcon />
        </Fab>
    );
};

MobileFloatingButton.propTypes = {
    onClick: PropTypes.func.isRequired,
};

export default MobileFloatingButton;
