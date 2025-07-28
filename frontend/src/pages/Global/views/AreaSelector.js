// frontend/src/pages/Global/views/AreaSelector.js

import React from 'react';
import { Box, Grid, Card, CardContent, Typography } from '@mui/material';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import OpacityIcon from '@mui/icons-material/Opacity';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import { AREAS } from '../utils/constants';

const iconMap = {
    WaterDropIcon: <WaterDropIcon sx={{ fontSize: 40 }} />,
    OpacityIcon: <OpacityIcon sx={{ fontSize: 40 }} />,
    LinearScaleIcon: <LinearScaleIcon sx={{ fontSize: 40 }} />,
    AccountTreeIcon: <AccountTreeIcon sx={{ fontSize: 40 }} />,
    BuildIcon: <BuildIcon sx={{ fontSize: 40 }} />,
    HandymanIcon: <HandymanIcon sx={{ fontSize: 40 }} />
};

const AreaSelector = ({ onSelectArea }) => {
    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Gestão Interna
            </Typography>

            <Grid container spacing={3}>
                {Object.values(AREAS).map((area) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={area.id}>
                        <Card
                            onClick={() => onSelectArea(area.id)}
                            sx={{
                                cursor: 'pointer',
                                height: 200,
                                position: 'relative',
                                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                overflow: 'hidden',
                                borderRadius: 2,
                                boxShadow: 2,
                                '&:hover': {
                                    transform: 'translateY(-12px)',
                                    boxShadow: 8,
                                    '& .card-overlay': {
                                        opacity: 1,
                                    },
                                    '& .card-icon': {
                                        transform: 'scale(1.1) translateY(-5px)',
                                        opacity: 0.9,
                                    },
                                    '& .card-content': {
                                        transform: 'translateY(-5px)',
                                    }
                                },
                            }}
                        >
                            {/* Overlay animado */}
                            <Box
                                className="card-overlay"
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    background: (theme) => `linear-gradient(145deg, 
                    ${theme.palette.primary.light}22, 
                    ${theme.palette.primary.main}33)`,
                                    opacity: 0,
                                    transition: 'opacity 0.3s ease-in-out',
                                    zIndex: 1,
                                }}
                            />

                            {/* Ícone animado */}
                            <Box
                                className="card-icon"
                                sx={{
                                    position: 'absolute',
                                    right: 16,
                                    top: 16,
                                    transition: 'all 0.4s ease',
                                    opacity: 0.4,
                                    color: (theme) => theme.palette.primary.main,
                                    zIndex: 2,
                                }}
                            >
                                {iconMap[area.icon]}
                            </Box>

                            <CardContent
                                className="card-content"
                                sx={{
                                    transition: 'all 0.4s ease',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    padding: 4,
                                    zIndex: 3,
                                    position: 'relative',
                                }}
                            >
                                <Typography
                                    variant="h5"
                                    gutterBottom
                                    sx={{
                                        fontWeight: 600,
                                        mb: 2,
                                        position: 'relative',
                                        '&::after': {
                                            content: '""',
                                            position: 'absolute',
                                            bottom: -8,
                                            left: 0,
                                            width: 40,
                                            height: 3,
                                            backgroundColor: 'primary.main',
                                            transition: 'width 0.3s ease',
                                        }
                                    }}
                                >
                                    {area.name}
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        opacity: 0.8,
                                        maxWidth: '90%'
                                    }}
                                >
                                    Gestão de {area.name}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default AreaSelector;