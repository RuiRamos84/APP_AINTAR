// frontend/src/pages/Global/views/MaintenanceView.js

import React from 'react';
import { Box, Button, Typography, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RecordManager from '../components/common/RecordManager';
import { useGlobal } from '../context/GlobalContext';
import { AREAS } from '../utils/constants';

const MaintenanceView = ({ onBack }) => {
    const { state } = useGlobal();
    const currentArea = Object.values(AREAS).find(area => area.id === state.selectedArea);

    return (
        <Box>
            {/* Header padronizado */}
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={3}
                sx={{
                    minHeight: '56px',
                    p: 2,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 1
                }}
            >
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {currentArea?.name}
                </Typography>

                {/* Centro - Info contextual */}
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Chip
                        label="Registo de Despesas"
                        variant="outlined"
                        size="small"
                        color="secondary"
                    />
                </Box>

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