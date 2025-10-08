import React from 'react';
import {
    Box,
    CircularProgress,
    LinearProgress,
    Typography,
    Card,
    CardContent,
    useMediaQuery,
    useTheme
} from '@mui/material';
import MESSAGES from '../../constants/messages';

/**
 * COMPONENTE DE LOADING UNIFICADO
 *
 * ✅ Otimizado para mobile
 * ✅ Responsivo e acessível
 * ✅ Textos em PT-PT
 */
const LoadingContainer = ({
    message = MESSAGES.LOADING.DEFAULT,
    showProgress = false,
    progress = null,
    variant = 'circular',
    fullHeight = true,
    inline = false
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const containerStyles = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isMobile ? 1.5 : 2,
        ...(fullHeight && { height: '100vh' }),
        ...(inline && { height: 'auto', py: isMobile ? 2 : 4 }),
        px: isMobile ? 2 : 0
    };

    const renderProgressIndicator = () => {
        const size = isMobile ? 48 : 60;
        const thickness = isMobile ? 3.5 : 4;

        if (variant === 'linear') {
            return (
                <Box sx={{ width: '100%', maxWidth: isMobile ? 250 : 300 }}>
                    <LinearProgress
                        variant={progress !== null ? 'determinate' : 'indeterminate'}
                        value={progress}
                        sx={{ height: isMobile ? 6 : 8, borderRadius: 4 }}
                        aria-label={MESSAGES.ARIA.LOADING}
                        role="progressbar"
                    />
                    {progress !== null && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                            sx={{ mt: 1, fontSize: isMobile ? '0.8rem' : '0.875rem' }}
                        >
                            {Math.round(progress)}%
                        </Typography>
                    )}
                </Box>
            );
        }

        return (
            <CircularProgress
                size={size}
                thickness={thickness}
                variant={progress !== null ? 'determinate' : 'indeterminate'}
                value={progress}
                aria-label={MESSAGES.ARIA.LOADING}
                role="progressbar"
                sx={{
                    color: theme => theme.palette.primary.main,
                    '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                    }
                }}
            />
        );
    };

    if (inline) {
        return (
            <Box sx={containerStyles}>
                {renderProgressIndicator()}
                <Typography
                    variant={isMobile ? 'body2' : 'body1'}
                    color="text.secondary"
                    align="center"
                >
                    {message}
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={containerStyles}>
            <Card
                elevation={0}
                sx={{
                    background: 'transparent',
                    textAlign: 'center',
                    width: '100%',
                    maxWidth: isMobile ? '90%' : '400px'
                }}
            >
                <CardContent sx={{ py: isMobile ? 3 : 4 }}>
                    {renderProgressIndicator()}

                    <Typography
                        variant={isMobile ? 'subtitle1' : 'h6'}
                        color="text.secondary"
                        sx={{
                            mt: 2,
                            fontSize: isMobile ? '1rem' : '1.25rem',
                            fontWeight: isMobile ? 500 : 400
                        }}
                    >
                        {message}
                    </Typography>

                    {showProgress && (
                        <Typography
                            variant={isMobile ? 'caption' : 'body2'}
                            color="text.secondary"
                            sx={{
                                mt: 1,
                                opacity: 0.7,
                                fontSize: isMobile ? '0.75rem' : '0.875rem'
                            }}
                        >
                            Por favor aguarde...
                        </Typography>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
};

export default LoadingContainer;