import React from 'react';
import { Paper, Tabs, Tab, Box, Typography } from '@mui/material';

const AssociateFilter = ({ associates, selectedAssociate, onAssociateChange }) => {
    return (
        <Paper 
            elevation={0} 
            sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: 'transparent',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
            }}
        >
            <Tabs
                value={selectedAssociate}
                onChange={(e, val) => onAssociateChange(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 48 }}
            >
                {associates.map((associate) => (
                    <Tab
                        key={associate}
                        value={associate}
                        label={associate === 'all' ? 'Todos' : associate}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    />
                ))}
            </Tabs>
        </Paper>
    );
};

export default AssociateFilter;
