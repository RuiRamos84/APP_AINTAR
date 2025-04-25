import React from 'react';
import { Container, Typography, Paper, Box, Divider } from '@mui/material';
import PaymentApproval from '../components/PaymentApproval';

/**
 * Página de administração de pagamentos
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.userInfo - Informações do usuário atual
 */
const PaymentAdminPage = ({ userInfo }) => {
    return (
        <Container maxWidth="lg">
            <Box py={3}>
                <Typography variant="h4" gutterBottom>
                    Administração de Pagamentos
                </Typography>

                <Paper elevation={2} sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Validação de Pagamentos Manuais
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        Nesta seção, você pode validar pagamentos em dinheiro e transferências bancárias pendentes.
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <PaymentApproval userInfo={userInfo} />
                </Paper>
            </Box>
        </Container>
    );
};

export default PaymentAdminPage;