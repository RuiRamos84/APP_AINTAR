// Refatorado: InternalArea.js com animações framer-motion
import React, { useState } from "react";
import {
    Box, Grid, CardContent, Typography, Button
} from "@mui/material";
import { motion } from "framer-motion";
import { useMetaData } from "../../contexts/MetaDataContext";
import InternalDetails from "./InternalDetails";
import InternalMaintenance from "./InternalMaintenance";
import ExpenseRecordsTable from "./ExpenseRecordsTable";
import EquipExpenseTable from "./EquipExpenseTable";

const AREAS = [
    { id: 1, name: "ETAR", description: "Gestão de ETAR" },
    { id: 2, name: "EEAR", description: "Gestão de EEAR" },
    { id: 3, name: "Rede", description: "Gestão de Rede" },
    { id: 4, name: "Ramais", description: "Gestão de Ramais" },
    { id: 5, name: "Manutenção", description: "Gestão de Manutenção" },
    { id: 6, name: "Equipamento Básico", description: "Gestão de Equipamento Básico" }
];

const SUB_AREAS = [
    { id: 1, name: "Detalhes/Características" },
    { id: 2, name: "Agendamento de Manutenção" },
];

const OPTIONS = {
    3: [{ id: "despesa", name: "Registo de Despesa" }],
    4: [{ id: "despesa", name: "Registo de Despesa" }],
    5: [{ id: "despesa", name: "Registo de Despesa" }],
    6: [{ id: "despesa", name: "Registo de Despesa" }],
};

const MotionCard = motion(Box);

const InternalArea = () => {
    const { metaData } = useMetaData();
    const [state, setState] = useState({
        selectedArea: null,
        selectedSubArea: null,
        selectedOption: null,
        selectedLocation: "",
        filteredEntities: [],
        selectedEntity: null,
        selectedEntities: [],
    });

    const updateState = (updates) => setState(prev => ({ ...prev, ...updates }));

    const handleBack = () => {
        if (state.selectedOption) return updateState({ selectedOption: null });
        if (state.selectedSubArea) return updateState({ selectedSubArea: null });
        if (state.selectedArea) return updateState({ selectedArea: null });
    };

    const renderCard = (item, onClick) => (
        <MotionCard
            key={item.id}
            onClick={() => onClick(item.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            sx={{ cursor: "pointer", backgroundColor: "white", borderRadius: 2, boxShadow: 2, p: 2 }}
        >
            <CardContent>
                <Typography variant="h6">{item.name}</Typography>
                {item.description && <Typography variant="body2">{item.description}</Typography>}
            </CardContent>
        </MotionCard>
    );

    const renderAreaCards = () => (
        <Grid container spacing={2}>
            {AREAS.map((area) => (
                <Grid item xs={12} sm={6} md={3} key={area.id}>
                    {renderCard(area, (id) => updateState({ selectedArea: id }))}
                </Grid>
            ))}
        </Grid>
    );

    const renderSubAreaCards = () => (
        <Grid container spacing={2}>
            {SUB_AREAS.map((subArea) => (
                <Grid item xs={12} sm={6} md={4} key={subArea.id}>
                    {renderCard(subArea, (id) => updateState({ selectedSubArea: id }))}
                </Grid>
            ))}
        </Grid>
    );

    const renderOptionCards = () => (
        <Grid container spacing={2}>
            {(OPTIONS[state.selectedArea] || []).map((opt) => (
                <Grid item xs={12} sm={6} md={4} key={opt.id}>
                    {renderCard(opt, (id) => updateState({ selectedOption: id }))}
                </Grid>
            ))}
        </Grid>
    );

    const renderContent = () => {
        const {
            selectedArea, selectedSubArea, selectedOption, selectedLocation,
            filteredEntities, selectedEntity, selectedEntities
        } = state;

        if (!selectedArea) return renderAreaCards();

        if (selectedArea <= 2) {
            if (!selectedSubArea) return renderSubAreaCards();

            switch (selectedSubArea) {
                case 1:
                    return <InternalDetails
                        metaData={metaData} selectedArea={selectedArea}
                        selectedLocation={selectedLocation} setSelectedLocation={(v) => updateState({ selectedLocation: v })}
                        filteredEntities={filteredEntities} setFilteredEntities={(v) => updateState({ filteredEntities: v })}
                        selectedEntity={selectedEntity} setSelectedEntity={(v) => updateState({ selectedEntity: v })}
                    />;
                case 2:
                    return <InternalMaintenance
                        metaData={metaData} selectedArea={selectedArea}
                        selectedLocation={selectedLocation} setSelectedLocation={(v) => updateState({ selectedLocation: v })}
                        filteredEntities={filteredEntities} setFilteredEntities={(v) => updateState({ filteredEntities: v })}
                        selectedEntities={selectedEntities} setSelectedEntities={(v) => updateState({ selectedEntities: v })}
                    />;
                default:
                    return null;
            }
        }

        if (!selectedOption) return renderOptionCards();

        switch (selectedOption) {
            case "despesa":
                return selectedArea === 6
                    ? <EquipExpenseTable metaData={metaData} />
                    : <ExpenseRecordsTable selectedArea={selectedArea} metaData={metaData} />;
            default:
                return <Typography>Opção não suportada</Typography>;
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Box display="flex" justifyContent="space-between" mb={4}>
                <Typography variant="h4">
                    {state.selectedArea ? AREAS.find(a => a.id === state.selectedArea)?.name : ""}
                </Typography>
                {(state.selectedArea || state.selectedSubArea || state.selectedOption) && (
                    <Button variant="outlined" onClick={handleBack}>Voltar</Button>
                )}
            </Box>
            {renderContent()}
        </Box>
    );
};

export default InternalArea;
