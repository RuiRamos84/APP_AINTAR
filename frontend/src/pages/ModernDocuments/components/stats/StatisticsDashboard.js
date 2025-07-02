import React from 'react';
import { Grid, Typography, Box, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useDocumentsContext } from '../../context/DocumentsContext';
import StatCard from './StatCard';
import { getStatusName } from '../../utils/statusUtils';

const StatisticsDashboard = ({ onCreateDocument, metaData }) => {
    const {
        allDocuments,
        assignedDocuments,
        createdDocuments,
        loadingAll,
        loadingAssigned,
        loadingCreated,
        setActiveTab
    } = useDocumentsContext();

    // Função para contar documentos por status
    const countByStatus = (statusId) => {
        return allDocuments.filter(doc => doc.what === statusId).length;
    };

    // Função para contar documentos com notificações
    const countWithNotifications = () => {
        return assignedDocuments.filter(doc => doc.notification === 1).length;
    };

    const stats = [
        {
            title: 'Total de Pedidos',
            value: allDocuments.length,
            icon: 'DocumentIcon',
            color: 'primary.main',
            onClick: () => setActiveTab(0),
            loading: loadingAll
        },
        {
            title: 'Para Tratamento',
            value: assignedDocuments.length,
            icon: 'AssignmentIcon',
            color: 'secondary.main',
            notificationCount: countWithNotifications(),
            onClick: () => setActiveTab(1),
            loading: loadingAssigned
        },
        {
            title: getStatusName(0, metaData?.what), // "CONCLUIDO"
            value: countByStatus(0),
            icon: 'CheckCircleIcon',
            color: 'success.main',
            loading: loadingAll
        },
        {
            title: 'Criados por Mim',
            value: createdDocuments.length,
            icon: 'TimelineIcon',
            color: 'info.main',
            onClick: () => setActiveTab(2),
            loading: loadingCreated
        }
    ];

    return (
        <Box mb={4}>
            <Typography variant="h4" gutterBottom>
                Gestão de Pedidos
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                {stats.map((stat, index) => (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
                        <StatCard {...stat} />
                    </Grid>
                ))}
            </Grid>

            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h5">Pedidos</Typography>

                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={onCreateDocument}
                    >
                        Novo Pedido
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

export default StatisticsDashboard;