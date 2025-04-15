import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    useTheme
} from '@mui/material';

const StatCard = ({
    title,
    value,
    icon,
    color,
    onClick,
    loading = false
}) => {
    const theme = useTheme();

    return (
        <Card
            onClick={onClick}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                boxShadow: 2,
                borderRadius: 2,
                transition: 'transform 0.3s, box-shadow 0.3s, opacity 0.3s',
                cursor: onClick ? 'pointer' : 'default',
                opacity: loading ? 0.7 : 1,
                '&:hover': onClick ? {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                } : {}
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    top: -10,
                    right: -10,
                    borderRadius: '50%',
                    width: 70,
                    height: 70,
                    opacity: 0.1,
                    backgroundColor: color
                }}
            />

            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            {title}
                        </Typography>
                        {loading ? (
                            <Box display="flex" alignItems="center" height={45}>
                                <CircularProgress size={24} color="inherit" />
                            </Box>
                        ) : (
                            <Typography variant="h4" component="div">
                                {value}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        sx={{
                            backgroundColor: color,
                            color: '#fff',
                            borderRadius: '50%',
                            width: 48,
                            height: 48
                        }}
                    >
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};

export default StatCard;