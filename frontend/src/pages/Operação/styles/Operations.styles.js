import { styled } from '@mui/material/styles';
import { Box, Card } from '@mui/material';

export const OperationsContainer = styled(Box)(({ theme }) => ({
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default,
    [theme.breakpoints.down('sm')]: {
        height: '100%',
        minHeight: '100vh'
    }
}));

export const FilterSection = styled(Box)(({ theme }) => ({
    flexShrink: 0,
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1)
    }
}));

export const ContentSection = styled(Box)(({ theme }) => ({
    flexGrow: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    padding: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1)
    }
}));

export const StyledOperationCard = styled(Card)(({ theme, status }) => ({
    cursor: 'pointer',
    position: 'relative',
    minHeight: 200,
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: theme.shadows[6]
    },
    borderRadius: theme.spacing(2),
    overflow: 'hidden',
    ...(status && {
        borderLeft: `6px solid ${theme.palette[status].main}`
    })
}));

export const TabletDrawer = styled(Box)(({ theme }) => ({
    borderTopLeftRadius: theme.spacing(2),
    borderTopRightRadius: theme.spacing(2),
    height: '70%',
    padding: theme.spacing(1),
    [theme.breakpoints.up('md')]: {
        height: '60%'
    }
}));

export const SwipeIndicator = styled(Box)(({ theme }) => ({
    width: '60px',
    height: '4px',
    backgroundColor: theme.palette.grey[300],
    borderRadius: '2px',
    margin: '0 auto',
    marginBottom: theme.spacing(3)
}));