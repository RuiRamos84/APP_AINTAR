import { Box, Button, useTheme, alpha } from '@mui/material';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DashboardResumo from './DashboardResumo';
import DashboardModern from './DashboardModern';

const DashboardWrapper = () => {
    const theme = useTheme();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isGeral = searchParams.get('tab') === 'geral';

    return (
        <Box sx={{
            backgroundColor: theme.palette.background.default,
            ...(isGeral
                ? { minHeight: '100vh' }
                : { height: 'calc(100vh - 40px)', overflow: 'hidden' }
            )
        }}>
            {/* Botões de navegação no topo */}
            <Box sx={{
                display: 'flex',
                gap: 1,
                px: 3,
                pt: 2,
                pb: 0
            }}>
                <Button
                    variant={!isGeral ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: !isGeral ? 600 : 400,
                        ...(!isGeral ? {} : {
                            borderColor: alpha(theme.palette.primary.main, 0.4),
                            color: theme.palette.text.secondary,
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: alpha(theme.palette.primary.main, 0.05)
                            }
                        })
                    }}
                >
                    Resumo
                </Button>
                <Button
                    variant={isGeral ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => navigate('/dashboard?tab=geral')}
                    sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: isGeral ? 600 : 400,
                        ...(isGeral ? {} : {
                            borderColor: alpha(theme.palette.primary.main, 0.4),
                            color: theme.palette.text.secondary,
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: alpha(theme.palette.primary.main, 0.05)
                            }
                        })
                    }}
                >
                    Geral
                </Button>
            </Box>

            {isGeral ? <DashboardModern /> : <DashboardResumo />}
        </Box>
    );
};

export default DashboardWrapper;

// Manter a versão antiga disponível para fallback se necessário
export { default as DashboardLegacy } from './Dashboard';
