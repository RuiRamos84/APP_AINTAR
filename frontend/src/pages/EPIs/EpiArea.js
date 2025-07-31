import React, { useState } from "react";
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Fade
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useMetaData } from "../../contexts/MetaDataContext";
import EmployeeSelector from "./EmployeeSelector";
import PreferencesSection from "./PreferencesSection";
import EpiSection from "./EpiSection";
import UniformSection from "./UniformSection";
import EpiSummarySection from "./EpiSummarySection";

const EpiArea = () => {
    const { metaData } = useMetaData();
    const [selectedSection, setSelectedSection] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const sections = [
        {
            id: 'preferences',
            name: 'Registo de Tamanhos',
            description: "Gestão de Tamanhos de Fardamento e EPI's",
            needsEmployee: true
        },
        {
            id: 'epis',
            name: 'EPIs',
            description: "Gestão de Entrega de EPI's",
            needsEmployee: true
        },
        {
            id: 'uniforms',
            name: 'Fardamento',
            description: 'Gestão de Entrega de Fardamento',
            needsEmployee: true
        },
        {
            id: 'summary',
            name: 'Resumo de Entregas',
            description: 'Resumo de Entregas por Colaborador',
            needsEmployee: false
        }
    ];

    const handleBack = () => {
        setSelectedSection(null);
        setSelectedEmployee("");
        setSelectedYear(new Date().getFullYear());
    };

    const getPageDescription = () => {
        if (selectedSection) {
            const section = sections.find(s => s.id === selectedSection);
            return section ? section.description : "Gestão de EPI's e Fardamento";
        }
        return "Gestão de EPI's e Fardamento";
    };

    const getEmployeeName = () => {
        if (!selectedEmployee) return "";
        const employee = metaData?.epi_list?.find(emp => emp.pk === selectedEmployee);
        return employee ? `${employee.pk} - ${employee.name}` : "";
    };

    const getCurrentSection = () => sections.find(s => s.id === selectedSection);

    const renderContent = () => {
        const currentSection = getCurrentSection();

        // Se precisa de funcionário mas não está seleccionado, não renderiza conteúdo
        if (currentSection?.needsEmployee && !selectedEmployee) {
            return null;
        }

        switch (selectedSection) {
            case 'preferences':
                return <PreferencesSection selectedEmployee={selectedEmployee} />;
            case 'epis':
                return <EpiSection metaData={metaData} selectedEmployee={selectedEmployee} />;
            case 'uniforms':
                return <UniformSection metaData={metaData} selectedEmployee={selectedEmployee} />;
            case 'summary':
                return <EpiSummarySection metaData={metaData} selectedYear={selectedYear} onYearChange={setSelectedYear} />;
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
            {/* Header com título, select e botão voltar */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4">
                    {getPageDescription()}
                </Typography>

                {/* Select no header para funcionário */}
                {selectedSection && getCurrentSection()?.needsEmployee && selectedEmployee && (
                    <Box sx={{ mx: 2, minWidth: '300px' }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Funcionário</InputLabel>
                            <Select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                label="Funcionário"
                            >
                                {metaData?.epi_list?.map((emp) => (
                                    <MenuItem key={emp.pk} value={emp.pk}>
                                        {emp.pk} - {emp.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {/* Select no header para ano (apenas no resumo) */}
                {selectedSection === 'summary' && (
                    <Box sx={{ mx: 2, minWidth: '150px' }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Ano</InputLabel>
                            <Select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                label="Ano"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <MenuItem key={year} value={year}>
                                        {year}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                )}

                {selectedSection && (
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleBack}
                        sx={{ flexShrink: 0 }}
                    >
                        Voltar
                    </Button>
                )}
            </Box>

            {/* Select centralizado apenas quando não há funcionário */}
            {selectedSection && getCurrentSection()?.needsEmployee && !selectedEmployee && (
                <EmployeeSelector
                    employees={metaData?.epi_list || []}
                    selectedEmployee={selectedEmployee}
                    onChange={setSelectedEmployee}
                />
            )}

            {/* Conteúdo principal */}
            <Fade in={!getCurrentSection()?.needsEmployee || !!selectedEmployee} timeout={800}>
                <Box>
                    {renderContent()}
                </Box>
            </Fade>
        </Box>
    );
};

export default EpiArea;