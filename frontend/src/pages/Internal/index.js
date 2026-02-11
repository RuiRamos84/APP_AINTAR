// /index.js
import React, { useState } from "react";
import { Box, Grid, Card, CardContent, Typography, Button } from "@mui/material";
import { InternalProvider } from "./context/InternalContext";
import EtarEeView from "./views/EtarEeView";
import RedeRamalView from "./views/RedeRamalView";
import ManutencaoView from "./views/ManutencaoView";
import EquipamentoView from "./views/EquipamentoView";
import RequisicaoInternaView from './views/RequisicaoInternaView';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import OpacityIcon from '@mui/icons-material/Opacity';
import LinearScaleIcon from '@mui/icons-material/LinearScale';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import DescriptionIcon from '@mui/icons-material/Description';
import InventarioView from "./views/InventoryView";
import Inventory2Icon from '@mui/icons-material/Inventory2';



const areas = [
    { id: 1, name: "ETAR", description: "Gestão de ETAR" },
    { id: 2, name: "EEAR", description: "Gestão de EEAR" },
    { id: 3, name: "Rede", description: "Gestão de Rede" },
    { id: 4, name: "Ramais", description: "Gestão de Ramais" },
    { id: 5, name: "Manutenção", description: "Gestão de Manutenção" },
    { id: 6, name: "Equipamento Básico", description: "Gestão de Equipamento Básico" },
    { id: 7, name: "Requisição Interna", description: "Gestão de Requisições Internas" },
    { id: 8, name: "Inventário", description: "Gestão Inventário de Material Interno"}
  ];

const InternalArea = () => {
    const [selectedArea, setSelectedArea] = useState(null);

    const handleAreaClick = (areaId) => {
        setSelectedArea(areaId);
    };

    const handleBack = () => {
        setSelectedArea(null);
    };

    const renderAreaContent = () => {
        switch (selectedArea) {
            case 1:
            case 2:
                return <EtarEeView areaId={selectedArea} />;
            case 3:
            case 4:
                return <RedeRamalView areaId={selectedArea} />;
            case 5:
                return <ManutencaoView />;
            case 6:
                return <EquipamentoView />;
            case 7:
                return <RequisicaoInternaView />;
            case 8:
                return <InventarioView />;

                
            default:
                return null;
        }
    };
    
    const getAreaIcon = (areaId) => {
        switch (areaId) {
            case 1: return <WaterDropIcon sx={{ fontSize: 40 }} />;
            case 2: return <OpacityIcon sx={{ fontSize: 40 }} />;
            case 3: return <LinearScaleIcon sx={{ fontSize: 40 }} />;
            case 4: return <AccountTreeIcon sx={{ fontSize: 40 }} />;
            case 5: return <BuildIcon sx={{ fontSize: 40 }} />;
            case 6: return <HandymanIcon sx={{ fontSize: 40 }} />;
            case 7: return <DescriptionIcon sx={{ fontSize: 40 }} />;
            case 8: return <Inventory2Icon sx={{ fontSize: 40 }} />; // <- Ícone do Inventário
            default: return null;
        }
      };

    return (
        <InternalProvider>
            <Box sx={{ padding: 4 }}>
                <Box display="flex" justifyContent="space-between" mb={4}>
                    <Typography variant="h4">
                        {selectedArea ? areas.find((a) => a.id === selectedArea)?.name : "Gestão Interna"}
                    </Typography>
                    {selectedArea && (
                        <Button variant="outlined" onClick={handleBack}>
                            Voltar
                        </Button>
                    )}
                </Box>

                {!selectedArea ? (
                    <Grid container spacing={3}>
                        {areas.map((area) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={area.id}>
                                <Card
                                    onClick={() => handleAreaClick(area.id)}
                                    sx={{
                                        cursor: "pointer",
                                        height: "100%",
                                        position: "relative",
                                        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                                        overflow: "hidden",
                                        borderRadius: 2,
                                        boxShadow: 2,
                                        "&:hover": {
                                            transform: "translateY(-12px)",
                                            boxShadow: 8,
                                            "& .card-overlay": {
                                                opacity: 1,
                                            },
                                            "& .card-icon": {
                                                transform: "scale(1.1) translateY(-5px)",
                                                opacity: 0.9,
                                            },
                                            "& .card-content": {
                                                transform: "translateY(-5px)",
                                            }
                                        },
                                    }}
                                >
                                    <Box
                                        className="card-overlay"
                                        sx={{
                                            position: "absolute",
                                            top: 0,
                                            left: 0,
                                            width: "100%",
                                            height: "100%",
                                            background: (theme) => `linear-gradient(145deg, 
                ${theme.palette.primary.light}22, 
                ${theme.palette.primary.main}33)`,
                                            opacity: 0,
                                            transition: "opacity 0.3s ease-in-out",
                                            zIndex: 1,
                                        }}
                                    />
                                    <Box
                                        className="card-icon"
                                        sx={{
                                            position: "absolute",
                                            right: 16,
                                            top: 16,
                                            transition: "all 0.4s ease",
                                            opacity: 0.4,
                                            color: (theme) => theme.palette.primary.main,
                                        }}
                                    >
                                        {getAreaIcon(area.id)}
                                    </Box>
                                    <CardContent
                                        className="card-content"
                                        sx={{
                                            transition: "all 0.4s ease",
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            justifyContent: "center",
                                            padding: 4,
                                            zIndex: 2,
                                            position: "relative",
                                        }}
                                    >
                                        <Typography
                                            variant="h5"
                                            gutterBottom
                                            sx={{
                                                fontWeight: 600,
                                                mb: 2,
                                                position: "relative",
                                                "&::after": {
                                                    content: '""',
                                                    position: "absolute",
                                                    bottom: -8,
                                                    left: 0,
                                                    width: 40,
                                                    height: 3,
                                                    backgroundColor: "primary.main",
                                                    transition: "width 0.3s ease",
                                                }
                                            }}
                                        >
                                            {area.name}
                                        </Typography>
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                opacity: 0.8,
                                                maxWidth: "90%"
                                            }}
                                        >
                                            {area.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    renderAreaContent()
                )}
            </Box>
        </InternalProvider>
    );
};

export default InternalArea;
