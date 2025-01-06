import React, { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import ExpenseRecordsTable from './ExpenseRecordsTable';
import MaintenanceRecordsTable from './MaintenanceRecordsTable';

const RamalRedeContent = ({ areas, selectedArea, metaData }) => {
    const [selectedOption, setSelectedOption] = useState(null);

    const renderContent = () => {
        switch (selectedOption) {
            case 'despesa':
                return <ExpenseRecordsTable selectedArea={selectedArea} metaData={metaData} />;
            case 'desobstrucao':
                return <MaintenanceRecordsTable selectedArea={selectedArea} metaData={metaData} recordType="unblocking" />;
            case 'manutencao':
                return <MaintenanceRecordsTable selectedArea={selectedArea} metaData={metaData} recordType="maintenance" />;
            default:
                return null;
        }
    };

    return (
        <Box>
            <Grid container spacing={2}>
                {areas.map((area) => (
                    <Grid item xs={12} sm={6} md={4} key={area.id}>
                        <Card
                            onClick={() => setSelectedOption(area.id)}
                            sx={{
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                '&:hover': { transform: 'scale(1.05)', boxShadow: 3 }
                            }}
                        >
                            <CardContent>
                                <Typography variant="h6">{area.name}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            <Box mt={4}>{renderContent()}</Box>
        </Box>
    );
};

export default RamalRedeContent;