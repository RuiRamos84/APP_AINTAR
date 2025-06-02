import React from 'react';
import { Box, Card, CardContent, Grid, Typography, Radio } from '@mui/material';
import {
    PhoneAndroid, AccountBalance, Euro,
    Payments, LocationCity
} from '@mui/icons-material';

const methods = {
    MBWAY: { label: 'MB WAY', icon: PhoneAndroid, color: '#3b5998' },
    MULTIBANCO: { label: 'Multibanco', icon: AccountBalance, color: '#0066cc' },
    BANK_TRANSFER: { label: 'Transferência', icon: Payments, color: '#00897b' },
    CASH: { label: 'Numerário', icon: Euro, color: '#4caf50' },
    MUNICIPALITY: { label: 'Municípios', icon: LocationCity, color: '#795548' }
};

const PaymentMethodSelector = ({ availableMethods, onSelect }) => {
    const [selected, setSelected] = React.useState('');

    const handleSelect = (method) => {
        setSelected(method);
        onSelect(method);
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Escolha o método de pagamento
            </Typography>

            <Grid container spacing={2}>
                {availableMethods.map((methodId) => {
                    const method = methods[methodId];
                    if (!method) return null;

                    const Icon = method.icon;
                    const isSelected = selected === methodId;

                    return (
                        <Grid item xs={12} sm={6} md={4} key={methodId}>
                            <Card
                                sx={{
                                    cursor: 'pointer',
                                    border: isSelected ? 2 : 1,
                                    borderColor: isSelected ? method.color : 'divider',
                                    '&:hover': { borderColor: method.color }
                                }}
                                onClick={() => handleSelect(methodId)}
                            >
                                <CardContent>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Radio checked={isSelected} />
                                        <Icon sx={{ color: method.color }} />
                                        <Typography variant="body1">
                                            {method.label}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
};

export default PaymentMethodSelector;