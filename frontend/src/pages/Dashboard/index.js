import { Box, Typography, Paper, Button, IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLanding from './DashboardLanding';
import DashboardModern from './DashboardModern';

// ── WelcomeBanner partilhado entre Resumo e Geral ─────────────────────────────

const WelcomeBanner = ({ userName, isGeral, onNavigateResumo, onNavigateGeral }) => {
    const theme = useTheme();
    const queryClient = useQueryClient();
    const fetching = useIsFetching() > 0;

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    const dateStr = new Date().toLocaleDateString('pt-PT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const dateFmt = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const handleRefresh = () => {
        if (isGeral) {
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        } else {
            queryClient.invalidateQueries({ queryKey: ['dashboardLanding'] });
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <Paper sx={{
                p: { xs: 2, md: 3 },
                mb: 2.5,
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 60%, ${alpha(theme.palette.primary.light, 0.85)} 100%)`,
                color: '#fff',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
            }}>
                {/* Saudação + data */}
                <Box>
                    <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                        {greeting}{userName ? `, ${userName}` : ''}!
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                        {dateFmt}
                    </Typography>
                </Box>

                {/* Navegação + Refresh */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                        display: 'flex',
                        gap: 0.5,
                        bgcolor: alpha('#000', 0.15),
                        borderRadius: 2,
                        p: 0.5,
                    }}>
                        <Button
                            size="small"
                            onClick={onNavigateResumo}
                            sx={{
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontWeight: isGeral ? 500 : 700,
                                color: '#fff',
                                bgcolor: isGeral ? 'transparent' : alpha('#fff', 0.22),
                                '&:hover': { bgcolor: alpha('#fff', isGeral ? 0.1 : 0.3) },
                                opacity: isGeral ? 0.75 : 1,
                                px: 2,
                            }}
                        >
                            Resumo
                        </Button>
                        <Button
                            size="small"
                            onClick={onNavigateGeral}
                            sx={{
                                borderRadius: 1.5,
                                textTransform: 'none',
                                fontWeight: isGeral ? 700 : 500,
                                color: '#fff',
                                bgcolor: isGeral ? alpha('#fff', 0.22) : 'transparent',
                                '&:hover': { bgcolor: alpha('#fff', isGeral ? 0.3 : 0.1) },
                                opacity: isGeral ? 1 : 0.75,
                                px: 2,
                            }}
                        >
                            Geral
                        </Button>
                    </Box>

                    <Tooltip title={fetching ? 'A actualizar...' : 'Actualizar dados'}>
                        <span>
                            <IconButton
                                size="small"
                                onClick={handleRefresh}
                                disabled={fetching}
                                sx={{
                                    color: alpha('#fff', 0.8),
                                    '&:hover': { bgcolor: alpha('#fff', 0.15), color: '#fff' },
                                    '& svg': {
                                        animation: fetching ? 'spin 0.8s linear infinite' : 'none',
                                        '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
                                    }
                                }}
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            </Paper>
        </motion.div>
    );
};

// ── DashboardWrapper ──────────────────────────────────────────────────────────

const DashboardWrapper = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isGeral = searchParams.get('tab') === 'geral';

    return (
        <Box sx={{ p: { xs: 1.5, md: 2.5 }, minHeight: '100vh' }}>
            <WelcomeBanner
                userName={user?.user_name}
                isGeral={isGeral}
                onNavigateResumo={() => navigate('/dashboard')}
                onNavigateGeral={() => navigate('/dashboard?tab=geral')}
            />
            {isGeral ? <DashboardModern /> : <DashboardLanding />}
        </Box>
    );
};

export default DashboardWrapper;

// Manter a versão antiga disponível para fallback se necessário
export { default as DashboardLegacy } from './Dashboard';
