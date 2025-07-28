// frontend/src/pages/Global/views/MaintenanceView.js

import React from 'react';
import { Box, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RecordManager from '../components/common/RecordManager';

const MaintenanceView = ({ onBack }) => {
    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={onBack}
                >
                    Voltar
                </Button>
            </Box>

            <RecordManager recordType="expense" entityRequired={false} />
        </Box>
    );
};

export default MaintenanceView;