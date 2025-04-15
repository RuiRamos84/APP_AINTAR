import React from 'react';
import PropTypes from 'prop-types';
import { Fab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

const FloatingActionButton = ({ onClick, theme }) => {
    return (
        <Fab
            color="primary"
            aria-label="Novo Pedido"
            onClick={onClick}
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                backgroundImage: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                zIndex: 1000,
            }}
        >
            <AddIcon />
        </Fab>
    );
};

FloatingActionButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    theme: PropTypes.object.isRequired,
};

export default FloatingActionButton;
