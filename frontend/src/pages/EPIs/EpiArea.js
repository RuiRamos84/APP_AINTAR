import React, { useState } from "react";
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    useTheme
} from "@mui/material";
import { useMetaData } from "../../contexts/MetaDataContext";
import PreferencesSection from "./PreferencesSection";
import EpiSection from "./EpiSection";
import UniformSection from "./UniformSection";
import EpiSummarySection from "./EpiSummarySection";

const EpiArea = () => {
    const { metaData } = useMetaData();
    const theme = useTheme();
    const [selectedSection, setSelectedSection] = useState(null);

    const sections = [
        {
            id: 'preferences',
            name: 'Registo de Tamanhos',
            description: "Gestão de Tamanhos de EPI's e Fardamento"
        },
        {
            id: 'epis',
            name: 'EPIs',
            description: "Gestão de Entrega de EPI's"
        },
        {
            id: 'uniforms',
            name: 'Fardamento',
            description: 'Gestão de Entrega de Fardamento'
        },
        {
            id: 'summary',
            name: 'Resumo de Entregas',
            description: 'Resumo de Entregas por Colaborador'
        } 
    ];

    const handleBack = () => {
        setSelectedSection(null);
    };

    const getPagedescription = () => {
        if (selectedSection) {
            const section = sections.find(s => s.id === selectedSection);
            return section ? section.description : "Gestão de EPI's e Fardamento";
        }
        return "Gestão de EPI's e Fardamento";
    };

    const renderContent = () => {
        switch (selectedSection) {
            case 'preferences':
                return <PreferencesSection metaData={metaData} />;
            case 'epis':
                return <EpiSection metaData={metaData} />;
            case 'uniforms':
                return <UniformSection metaData={metaData} />;
            case 'summary':
                return <EpiSummarySection metaData={metaData} />;
            default:
                return (
                    <Grid container spacing={2}>
                        {sections.map((section) => (
                            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={section.id}>
                                <Card
                                    onClick={() => setSelectedSection(section.id)}
                                    sx={{
                                        cursor: "pointer",
                                        transition: "all 0.3s",
                                        "&:hover": { transform: "scale(1.05)" }
                                    }}
                                >
                                    <CardContent>
                                        <Typography variant="h6">{section.name}</Typography>
                                        <Typography variant="body2">{section.description}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                );
        }
    };

    return (
        <Box sx={{ padding: 4 }}>
            <Box display="flex" justifyContent="space-between" mb={4}>
                <Typography variant="h4">
                    {getPagedescription()}
                </Typography>
                {selectedSection && (
                    <Button variant="outlined" onClick={handleBack}>
                        Voltar
                    </Button>
                )}
            </Box>
            {renderContent()}
        </Box>
    );
};

export default EpiArea;