import React, { useState } from "react";
import { Box, Grid, Card, CardContent, Typography, Button } from "@mui/material";
import { useMetaData } from "../../contexts/MetaDataContext";
import InternalDetails from "./InternalDetails";
import InternalMaintenance from "./InternalMaintenance";
import ExpenseRecordsTable from "./ExpenseRecordsTable";
import MaintenanceRecordsTable from "./MaintenanceRecordsTable";
import EquipExpenseTable from "./EquipExpenseTable";

const InternalArea = () => {
    const { metaData } = useMetaData();
    const [selectedArea, setSelectedArea] = useState(null);
    const [selectedSubArea, setSelectedSubArea] = useState(null);
    const [selectedOption, setSelectedOption] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState("");
    const [filteredEntities, setFilteredEntities] = useState([]);
    const [selectedEntity, setSelectedEntity] = useState(null);
    const [selectedEntities, setSelectedEntities] = useState([]);

    const areas = [
        { id: 1, name: "ETAR", description: "Gestão de ETAR" },
        { id: 2, name: "EEAR", description: "Gestão de EEAR" },
        { id: 3, name: "Rede", description: "Gestão de Rede" },
        { id: 4, name: "Ramais", description: "Gestão de Ramais" },
        { id: 5, name: "Manutenção", description: "Gestão de Manutenção" },
        { id: 6, name: 'Equipamento Básico', description: 'Gestão de Equipamento Básico' }
    ];

    const etarEeSubAreas = [
        { id: 1, name: "Detalhes/Características" },
        { id: 2, name: "Agendamento de Manutenção" },
    ];

    // Opções para áreas 3 a 6
    const getOptionsForArea = (areaId) => {
        switch (areaId) {
            case 3: // Rede
                return [
                    { id: 'despesa', name: 'Registo de Despesa' }
                ];
            case 4: // Ramais
                return [
                    { id: 'despesa', name: 'Registo de Despesa' }
                ];
            case 5: // Manutenção
                return [
                    { id: 'despesa', name: 'Registo de Despesa' }
                ];
            case 6: // Despesas Equipamento
                return [
                    { id: 'despesa', name: 'Registo de Despesa' }
                ];
            default:
                return [];
        }
    };

    const handleAreaClick = (areaId) => {
        setSelectedArea(areaId);
        setSelectedSubArea(null);
        setSelectedOption(null);
    };

    const handleSubAreaClick = (subAreaId) => {
        setSelectedSubArea(subAreaId);
    };

    const handleOptionClick = (option) => {
        setSelectedOption(option);
    };

    const renderContentByArea = () => {
        if (!selectedArea) return null;

        // ETAR ou EEAR (áreas 1 e 2)
        if (selectedArea <= 2) {
            if (!selectedSubArea) {
                return (
                    <Grid container spacing={2}>
                        {etarEeSubAreas.map((subArea) => (
                            <Grid item xs={12} sm={6} md={4} key={subArea.id}>
                                <Card
                                    onClick={() => handleSubAreaClick(subArea.id)}
                                    sx={{
                                        cursor: "pointer",
                                        transition: "all 0.3s",
                                        "&:hover": { transform: "scale(1.05)" }
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="h6">{subArea.name}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                );
            }

            switch (selectedSubArea) {
                case 1:
                    return (
                        <InternalDetails
                            metaData={metaData}
                            selectedArea={selectedArea}
                            selectedLocation={selectedLocation}
                            setSelectedLocation={setSelectedLocation}
                            filteredEntities={filteredEntities}
                            setFilteredEntities={setFilteredEntities}
                            selectedEntity={selectedEntity}
                            setSelectedEntity={setSelectedEntity}
                        />
                    );
                case 2:
                    return (
                        <InternalMaintenance
                            metaData={metaData}
                            selectedArea={selectedArea}
                            selectedLocation={selectedLocation}
                            setSelectedLocation={setSelectedLocation}
                            filteredEntities={filteredEntities}
                            setFilteredEntities={setFilteredEntities}
                            selectedEntities={selectedEntities}
                            setSelectedEntities={setSelectedEntities}
                        />
                    );
                default:
                    return null;
            }
        }

        // Rede, Ramais, Manutenção, Despesas Equipamento (áreas 3, 4, 5, 6)
        // Mostrar submenu de opções
        const options = getOptionsForArea(selectedArea);

        if (!selectedOption) {
            return (
                <Grid container spacing={2}>
                    {options.map((option) => (
                        <Grid item xs={12} sm={6} md={4} key={option.id}>
                            <Card
                                onClick={() => handleOptionClick(option.id)}
                                sx={{
                                    cursor: "pointer",
                                    transition: "all 0.3s",
                                    "&:hover": { transform: "scale(1.05)" }
                                }}
                            >
                                <CardContent>
                                    <Typography variant="h6">{option.name}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            );
        }

        // Renderizar o componente adequado com base na opção selecionada
        switch (selectedOption) {
            case 'despesa':
                if (selectedArea === 6) {
                    return <EquipExpenseTable metaData={metaData} />;
                }
                return <ExpenseRecordsTable selectedArea={selectedArea} metaData={metaData} />;
            default:
                return null;
        }
    };

    const handleBack = () => {
        if (selectedOption) {
            setSelectedOption(null);
        } else if (selectedSubArea) {
            setSelectedSubArea(null);
        } else if (selectedArea) {
            setSelectedArea(null);
        }

        // Limpar todas as seleções
        setSelectedLocation("");
        setFilteredEntities([]);
        setSelectedEntity(null);
        setSelectedEntities([]);
    };

    return (
        <Box sx={{ padding: 4 }}>
            <Box display="flex" justifyContent="space-between" mb={4}>
                <Typography variant="h4">
                    {selectedArea ? areas.find(a => a.id === selectedArea)?.name : ""}
                </Typography>
                {(selectedArea || selectedSubArea || selectedOption) && (
                    <Button variant="outlined" onClick={handleBack}>
                        Voltar
                    </Button>
                )}
            </Box>

            {!selectedArea ? (
                <Grid container spacing={2}>
                    {areas.map((area) => (
                        <Grid item xs={12} sm={6} md={3} key={area.id}>
                            <Card
                                onClick={() => handleAreaClick(area.id)}
                                sx={{
                                    cursor: "pointer",
                                    transition: "all 0.3s",
                                    "&:hover": { transform: "scale(1.05)" }
                                }}
                            >
                                <CardContent>
                                    <Typography variant="h6">{area.name}</Typography>
                                    <Typography variant="body2">{area.description}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            ) : (
                renderContentByArea()
            )}
        </Box>
    );
};

export default InternalArea;