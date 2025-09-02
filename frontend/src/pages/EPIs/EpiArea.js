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
    Fade,
    CardActionArea,
    Grow
} from "@mui/material";
import {
    Settings,
    Security,
    Checkroom,
    Assessment
} from "@mui/icons-material";
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
            description: "Gestão de Tamanhos de EPI's e Fardamento",
            needsEmployee: true,
            icon: Settings,
            color: '#1976d2'
        },
        {
            id: 'epis',
            name: 'EPIs',
            description: "Gestão de Entrega de EPI's",
            needsEmployee: true,
            icon: Security,
            color: '#d32f2f'
        },
        {
            id: 'uniforms',
            name: 'Fardamento',
            description: 'Gestão de Entrega de Fardamento',
            needsEmployee: true,
            icon: Checkroom,
            color: '#388e3c'
        },
        {
            id: 'summary',
            name: 'Resumo de Entregas',
            description: 'Resumo de Entregas por Colaborador',
            needsEmployee: false,
            icon: Assessment,
            color: '#f57c00'
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
            return section ? section.description : "Gestão de Fardamento e EPI's";
        }
        return "Gestão de Fardamento e EPI's";
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
            case 'uniforms':
                return <UniformSection metaData={metaData} selectedEmployee={selectedEmployee} />;
            case 'epis':
                return <EpiSection metaData={metaData} selectedEmployee={selectedEmployee} />;
            case 'summary':
                return <EpiSummarySection metaData={metaData} selectedYear={selectedYear} onYearChange={setSelectedYear} />;
            default:
                return (
                    <Grid container spacing={3}>
                        {sections.map((section, index) => {
                            const IconComponent = section.icon;
                            return (
                                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={section.id}>
                                    <Grow
                                        in={true}
                                        timeout={600 + index * 200}
                                        style={{ transformOrigin: '0 0 0' }}
                                    >
                                        <Card
                                            sx={{
                                                cursor: "pointer",
                                                height: '100%',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                position: 'relative',
                                                overflow: 'hidden',
                                                background: `linear-gradient(135deg, ${section.color}15 0%, ${section.color}08 100%)`,
                                                border: `1px solid ${section.color}20`,
                                                "&:hover": {
                                                    transform: "translateY(-8px) scale(1.02)",
                                                    boxShadow: `0 12px 24px ${section.color}25`,
                                                    border: `1px solid ${section.color}40`
                                                },
                                                "&:active": {
                                                    transform: "translateY(-4px) scale(1.01)"
                                                }
                                            }}
                                        >
                                            <CardActionArea
                                                onClick={() => setSelectedSection(section.id)}
                                                sx={{ height: '100%', p: 0 }}
                                            >
                                                <CardContent sx={{
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    position: 'relative',
                                                    p: 3
                                                }}>
                                                    {/* Ícone no canto superior direito */}
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: 16,
                                                        right: 16,
                                                        '& .card-icon': {
                                                            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                            color: section.color
                                                        },
                                                        '&:hover .card-icon': {
                                                            transform: 'scale(1.6)',
                                                            filter: 'brightness(1.3)'
                                                        }
                                                    }}>
                                                        <IconComponent
                                                            className="card-icon"
                                                            sx={{ fontSize: 32 }}
                                                        />
                                                    </Box>

                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 600,
                                                            color: 'text.primary',
                                                            mb: 1
                                                        }}
                                                    >
                                                        {section.name}
                                                    </Typography>

                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: 'text.secondary',
                                                            flexGrow: 1,
                                                            lineHeight: 1.4
                                                        }}
                                                    >
                                                        {section.description}
                                                    </Typography>

                                                    {/* Decoração */}
                                                    <Box sx={{
                                                        position: 'absolute',
                                                        top: -20,
                                                        right: -20,
                                                        width: 80,
                                                        height: 80,
                                                        borderRadius: '50%',
                                                        background: `${section.color}08`,
                                                        transition: 'all 0.3s ease',
                                                        transform: 'scale(0.8)',
                                                        '.MuiCard-root:hover &': {
                                                            transform: 'scale(1.2)',
                                                            background: `${section.color}12`
                                                        }
                                                    }} />
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    </Grow>
                                </Grid>
                            );
                        })}
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
                    <Button variant="outlined" onClick={handleBack}>
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
                    shoeTypes={metaData?.epi_shoe_types || []}
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