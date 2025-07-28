// frontend/src/pages/Global/components/forms/RequestManager.js

import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, Card, CardContent } from '@mui/material';
import { REQUEST_CONFIGS } from '../../utils/constants';
import RequestModal from './RequestModal';

const RequestManager = ({ areaId }) => {
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    const prefix = areaId === 1 ? 'etar' : 'ee';
    const requests = [
        'desmatacao', 'retirada_lamas', 'reparacao', 'vedacao', 'qualidade_ambiental'
    ];

    const handleRequestClick = (type) => {
        const key = `${prefix}_${type}`;
        setSelectedRequest(key);
        setModalOpen(true);
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Pedidos Disponíveis
            </Typography>

            <Grid container spacing={2}>
                {requests.map(type => {
                    const key = `${prefix}_${type}`;
                    const config = REQUEST_CONFIGS[key];

                    return (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={type}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => handleRequestClick(type)}
                            >
                                <CardContent>
                                    <Typography variant="h6" color="primary">
                                        {config?.title || type}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            <RequestModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                requestType={selectedRequest}
                areaId={areaId}
            />
        </Box>
    );
};

export default RequestManager;