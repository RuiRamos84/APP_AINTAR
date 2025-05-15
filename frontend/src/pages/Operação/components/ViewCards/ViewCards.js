import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Badge, useMediaQuery, useTheme } from '@mui/material';
import {
    CleaningServices, CallMade, LocalDrink, Construction,
    RouteOutlined, NetworkCheck, SwipeRight
} from '@mui/icons-material';

const viewIcons = {
    vbr_document_fossa: <CleaningServices />,
    vbr_document_ramais: <CallMade />,
    vbr_document_caixas: <Construction />,
    vbr_document_desobstrucao: <LocalDrink />,
    vbr_document_pavimentacao: <RouteOutlined />,
    vbr_document_rede: <NetworkCheck />
};

const getViewIcon = (viewKey) => {
    for (const key in viewIcons) {
        if (viewKey.startsWith(key)) {
            return viewIcons[key];
        }
    }
    return null;
};

const ViewCards = ({ views = [], selectedView, onViewClick }) => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('md'));
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const getGridSize = () => {
        if (isMobile) return 6;
        if (isTablet) return 4;
        return 3;
    };

    return (
        <Grid container spacing={2}>
            {views.map(([key, value]) => {
                if (!value || !key) return null;

                const icon = getViewIcon(key);
                const hasItems = value.total > 0;

                return (
                    <Grid item xs={6} sm={getGridSize()} md={3} lg={3} key={key}>
                        <Card
                            onClick={() => onViewClick(key)}
                            sx={{
                                cursor: "pointer",
                                transition: "transform 0.2s, box-shadow 0.2s",
                                "&:hover": {
                                    transform: "translateY(-4px)",
                                    boxShadow: 4,
                                },
                                "&:active": {
                                    transform: "scale(0.98)",
                                    transition: "transform 0.1s"
                                },
                                bgcolor: selectedView === key ? "primary.light" : "background.paper",
                                color: selectedView === key ? "primary.contrastText" : "text.primary",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                borderRadius: 2,
                                minHeight: isTablet ? 140 : 120,
                                border: selectedView === key ? `1px solid ${theme.palette.primary.main}` : '1px solid transparent',
                                '&:hover .swipe-indicator': {
                                    opacity: 1,
                                },
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <CardContent sx={{ p: isTablet ? 2.5 : 3 }}>
                                <Box
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    mb={1.5}
                                >
                                    <Typography
                                        variant={isTablet ? "subtitle1" : "h6"}
                                        component="div"
                                        sx={{
                                            fontWeight: "bold",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            lineHeight: 1.3,
                                            height: isTablet ? "2.6em" : "3em"
                                        }}
                                    >
                                        {value.name || "Sem nome"}
                                    </Typography>

                                    {icon && (
                                        <Box
                                            sx={{
                                                color: selectedView === key ? "primary.contrastText" : "primary.main",
                                                opacity: 0.8,
                                                ml: 1,
                                                transition: 'transform 0.3s ease',
                                                '&:hover': {
                                                    transform: 'scale(1.1)'
                                                }
                                            }}
                                        >
                                            {icon}
                                        </Box>
                                    )}
                                </Box>

                                <Box
                                    display="flex"
                                    alignItems="baseline"
                                    sx={{ mt: isTablet ? 1.5 : 2 }}
                                >
                                    <Badge
                                        color={hasItems ? "error" : "default"}
                                        badgeContent={hasItems ? "!" : 0}
                                        sx={{
                                            "& .MuiBadge-badge": {
                                                top: -8,
                                                right: -8,
                                                display: hasItems ? "flex" : "none",
                                                width: isTablet ? 20 : 18,
                                                height: isTablet ? 20 : 18,
                                                fontSize: isTablet ? '0.75rem' : '0.7rem'
                                            }
                                        }}
                                    >
                                        <Typography
                                            variant={isTablet ? "h4" : "h3"}
                                            component="div"
                                            sx={{
                                                fontWeight: "bold",
                                                color: hasItems
                                                    ? (selectedView === key ? "white" : "error.main")
                                                    : (selectedView === key ? "rgba(255,255,255,0.8)" : "text.secondary"),
                                                transition: 'color 0.3s ease'
                                            }}
                                        >
                                            {value.total || 0}
                                        </Typography>
                                    </Badge>

                                    <Typography
                                        variant="body2"
                                        component="div"
                                        sx={{
                                            ml: 1,
                                            color: selectedView === key ? "rgba(255,255,255,0.8)" : "text.secondary",
                                            fontSize: isTablet ? '0.9rem' : '0.875rem'
                                        }}
                                    >
                                        {value.total === 1 ? "pedido" : "pedidos"}
                                    </Typography>
                                </Box>
                            </CardContent>

                            {isTablet && (
                                <Box
                                    className="swipe-indicator"
                                    sx={{
                                        position: 'absolute',
                                        right: 12,
                                        bottom: 12,
                                        opacity: 0,
                                        transition: 'opacity 0.3s ease',
                                        color: selectedView === key ? "primary.contrastText" : "text.secondary"
                                    }}
                                >
                                    <SwipeRight fontSize="small" />
                                </Box>
                            )}
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default ViewCards;