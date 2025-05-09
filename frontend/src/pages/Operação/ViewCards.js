import React from 'react';
import { Grid, Card, CardContent, Typography, useMediaQuery, useTheme, Box, Badge } from '@mui/material';
import {
    CleaningServices, CallMade, LocalDrink, Construction,
    RouteOutlined, NetworkCheck
} from '@mui/icons-material';

// Mapeamento de ícones para cada tipo de vista
const viewIcons = {
    vbr_document_fossa: <CleaningServices />,
    vbr_document_ramais: <CallMade />,
    vbr_document_caixas: <Construction />,
    vbr_document_desobstrucao: <LocalDrink />,
    vbr_document_pavimentacao: <RouteOutlined />, // Substituído Road por RouteOutlined
    vbr_document_rede: <NetworkCheck />
};

// Função para escolher o ícone correto para cada vista
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

    // Determinar o tamanho do grid com base no dispositivo
    const getGridSize = () => {
        if (isMobile) return 6; // 2 cartões por linha em dispositivos móveis
        if (isTablet) return 4;  // 3 cartões por linha em tablets
        return 3;                // 4 cartões por linha em desktop
    };

    return (
        <Grid container spacing={2}>
            {views.map(([key, value]) => {
                if (!value || !key) return null; // Skip invalid entries

                const icon = getViewIcon(key);
                const hasItems = value.total > 0;

                return (
                    <Grid item xs={6} sm={getGridSize()} md={3} lg={3} key={key}>
                        <Card
                            onClick={() => onViewClick(key)}
                            sx={{
                                cursor: "pointer",
                                transition: "all 0.2s",
                                "&:hover": {
                                    transform: "translateY(-5px)",
                                    boxShadow: 4,
                                },
                                "&:active": {
                                    transform: "translateY(0px)",
                                },
                                bgcolor: selectedView === key ? "primary.light" : "background.paper",
                                color: selectedView === key ? "primary.contrastText" : "text.primary",
                                height: "100%",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                borderRadius: 2,
                                // Aumentar tamanho dos cards em tablet para toque mais fácil
                                minHeight: isTablet ? 120 : 100,
                            }}
                        >
                            <CardContent sx={{ p: isTablet ? 2 : 3 }}>
                                <Box
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                    mb={1}
                                >
                                    <Typography
                                        variant={isTablet ? "subtitle1" : "h6"}
                                        component="div"
                                        sx={{
                                            fontWeight: "bold",
                                            // Limitar a 2 linhas e mostrar ellipsis
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            lineHeight: 1.2,
                                            height: isTablet ? "2.4em" : "2.4em"
                                        }}
                                    >
                                        {value.name || "Sem nome"}
                                    </Typography>

                                    {icon && (
                                        <Box
                                            sx={{
                                                color: selectedView === key ? "primary.contrastText" : "primary.main",
                                                opacity: 0.7,
                                                ml: 1
                                            }}
                                        >
                                            {icon}
                                        </Box>
                                    )}
                                </Box>

                                <Box
                                    display="flex"
                                    alignItems="baseline"
                                    sx={{ mt: isTablet ? 1 : 2 }}
                                >
                                    <Badge
                                        color={hasItems ? "error" : "default"}
                                        badgeContent={hasItems ? "!" : 0}
                                        sx={{
                                            "& .MuiBadge-badge": {
                                                top: -8,
                                                right: -8,
                                                display: hasItems ? "flex" : "none"
                                            }
                                        }}
                                    >
                                        <Typography
                                            variant={isTablet ? "h5" : "h4"}
                                            component="div"
                                            sx={{
                                                fontWeight: "bold",
                                                color: hasItems
                                                    ? (selectedView === key ? "white" : "error.main")
                                                    : (selectedView === key ? "rgba(255,255,255,0.7)" : "text.secondary")
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
                                            color: selectedView === key ? "rgba(255,255,255,0.7)" : "text.secondary"
                                        }}
                                    >
                                        {value.total === 1 ? "pedido" : "pedidos"}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default ViewCards;