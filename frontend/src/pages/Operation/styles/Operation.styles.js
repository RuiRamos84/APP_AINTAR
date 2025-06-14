import { styled } from '@mui/material/styles';
import { Box, Card } from '@mui/material';

export const OperationContainer = styled(Box)(({ theme }) => ({
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default
}));

export const StyledCard = styled(Card)(({ theme }) => ({
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[6]
    },
    borderRadius: theme.spacing(2)
}));