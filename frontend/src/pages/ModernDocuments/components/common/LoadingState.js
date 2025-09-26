import React from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, Typography, Fade, Skeleton, Paper, useTheme } from '@mui/material';

const LoadingState = ({
    type = 'circular',
    message = 'A carregar dados...',
    fullPage = false,
    height = 400,
    width = '100%',
    count = 3,
}) => {
    const theme = useTheme();
    const containerStyles = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: fullPage ? '100vh' : height,
        width: '100%',
        padding: theme.spacing(2),
    };

    let content;
    switch (type) {
        case 'skeleton':
            content = (
                <>
                    {Array(count)
                        .fill(0)
                        .map((_, index) => (
                            <Fade key={index} in={true} style={{ transitionDelay: `${index * 100}ms`, width: width }}>
                                <Paper variant="outlined" sx={{ p: 1, mb: 1, width: '100%' }}>
                                    <Skeleton variant="rectangular" width="30%" height={24} sx={{ mb: 1 }} />
                                    <Skeleton variant="rectangular" width="90%" height={20} sx={{ mb: 0.5 }} />
                                    <Skeleton variant="rectangular" width="60%" height={20} />
                                </Paper>
                            </Fade>
                        ))}
                </>
            );
            break;
        case 'text':
            content = (
                <Typography variant="body1" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={16} thickness={5} sx={{ mr: 1 }} />
                    {message}
                </Typography>
            );
            break;
        case 'circular':
        default:
            content = (
                <>
                    <CircularProgress size={40} thickness={4} sx={{ mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                        {message}
                    </Typography>
                </>
            );
    }

    return <Box sx={containerStyles}>{content}</Box>;
};

LoadingState.propTypes = {
    type: PropTypes.oneOf(['circular', 'skeleton', 'text']),
    message: PropTypes.string,
    fullPage: PropTypes.bool,
    height: PropTypes.number,
    width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    count: PropTypes.number,
};

export default LoadingState;
