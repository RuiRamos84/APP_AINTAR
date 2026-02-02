/**
 * EpiArea - Componente principal do módulo EPI
 *
 * Hub central para navegação entre as secções:
 * - Registo de Tamanhos (Preferências)
 * - EPIs
 * - Fardamento
 * - Resumo de Entregas
 */

import { useState, useEffect } from 'react';
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
  Grow,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Settings, Security, Checkroom, Assessment, ArrowBack } from '@mui/icons-material';
import { useEpi } from '../hooks/useEpi';
import EmployeeSelector from './EmployeeSelector';
import PreferencesForm from './PreferencesForm';
import DeliveriesTable from './DeliveriesTable';
import SummarySection from './SummarySection';

// Definição das secções
const SECTIONS = [
  {
    id: 'preferences',
    name: 'Registo de Tamanhos',
    description: "Gestão de Tamanhos de EPI's e Fardamento",
    needsEmployee: true,
    icon: Settings,
    color: '#1976d2',
  },
  {
    id: 'epis',
    name: 'EPIs',
    description: "Gestão de Entrega de EPI's",
    needsEmployee: true,
    icon: Security,
    color: '#d32f2f',
  },
  {
    id: 'uniforms',
    name: 'Fardamento',
    description: 'Gestão de Entrega de Fardamento',
    needsEmployee: true,
    icon: Checkroom,
    color: '#388e3c',
  },
  {
    id: 'summary',
    name: 'Resumo de Entregas',
    description: 'Resumo de Entregas por Colaborador',
    needsEmployee: false,
    icon: Assessment,
    color: '#f57c00',
  },
];

const EpiArea = () => {
  const {
    employees,
    selectedEmployee,
    activeSection,
    selectedYear,
    loading,
    error,
    fetchEpiData,
    setSelectedEmployee,
    clearSelectedEmployee,
    setActiveSection,
    setSelectedYear,
    clearError,
  } = useEpi();

  // Estado local para controle de animação
  const [showContent, setShowContent] = useState(true);

  // Buscar dados ao montar
  useEffect(() => {
    fetchEpiData();
  }, []);

  // Handlers
  const handleSectionSelect = (sectionId) => {
    setShowContent(false);
    setTimeout(() => {
      setActiveSection(sectionId);
      setShowContent(true);
    }, 200);
  };

  const handleBack = () => {
    setShowContent(false);
    setTimeout(() => {
      setActiveSection(null);
      clearSelectedEmployee();
      setShowContent(true);
    }, 200);
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleEmployeeChange = (event) => {
    const emp = employees.find((e) => e.pk === event.target.value);
    if (emp) {
      setSelectedEmployee(emp);
    }
  };

  // Helpers
  const getCurrentSection = () => SECTIONS.find((s) => s.id === activeSection);

  const getPageDescription = () => {
    if (activeSection) {
      const section = getCurrentSection();
      return section ? section.description : "Gestão de Fardamento e EPI's";
    }
    return "Gestão de Fardamento e EPI's";
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  };

  // Render content based on selected section
  const renderContent = () => {
    const currentSection = getCurrentSection();

    // Se precisa de funcionário mas não está selecionado
    if (currentSection?.needsEmployee && !selectedEmployee) {
      return (
        <EmployeeSelector
          employees={employees}
          onSelect={handleEmployeeSelect}
          onRefresh={() => fetchEpiData(true)}
        />
      );
    }

    switch (activeSection) {
      case 'preferences':
        return <PreferencesForm />;
      case 'epis':
        return <DeliveriesTable type="epi" />;
      case 'uniforms':
        return <DeliveriesTable type="uniform" />;
      case 'summary':
        return <SummarySection />;
      default:
        return renderSectionCards();
    }
  };

  // Render section cards (home)
  const renderSectionCards = () => (
    <Grid container spacing={3}>
      {SECTIONS.map((section, index) => {
        const IconComponent = section.icon;
        return (
          <Grid size={{ xs: 12, sm: 6, md: 6, lg: 3 }} key={section.id}>
            <Grow in={true} timeout={600 + index * 200} style={{ transformOrigin: '0 0 0' }}>
              <Card
                sx={{
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  background: `linear-gradient(135deg, ${section.color}15 0%, ${section.color}08 100%)`,
                  border: `1px solid ${section.color}20`,
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: `0 12px 24px ${section.color}25`,
                    border: `1px solid ${section.color}40`,
                  },
                  '&:active': {
                    transform: 'translateY(-4px) scale(1.01)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleSectionSelect(section.id)}
                  sx={{ height: '100%', p: 0 }}
                >
                  <CardContent
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      p: 3,
                    }}
                  >
                    {/* Ícone no canto superior direito */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        '& .card-icon': {
                          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          color: section.color,
                        },
                      }}
                    >
                      <IconComponent className="card-icon" sx={{ fontSize: 32 }} />
                    </Box>

                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        mb: 1,
                      }}
                    >
                      {section.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        flexGrow: 1,
                        lineHeight: 1.4,
                      }}
                    >
                      {section.description}
                    </Typography>

                    {/* Decoração */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -20,
                        right: -20,
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: `${section.color}08`,
                        transition: 'all 0.3s ease',
                        transform: 'scale(0.8)',
                      }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grow>
          </Grid>
        );
      })}
    </Grid>
  );

  // Loading state
  if (loading && !employees.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error && !employees.length) {
    return (
      <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Cabeçalho Responsivo */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ flexGrow: 1, width: '100%', fontWeight: 'medium' }}
        >
          {getPageDescription()}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'center',
            width: { xs: '100%', md: 'auto' },
            justifyContent: 'flex-end',
          }}
        >
          {/* Select no header para funcionário */}
          {activeSection && getCurrentSection()?.needsEmployee && selectedEmployee && (
            <Box sx={{ flexGrow: { xs: 1, md: 0 }, minWidth: { xs: 150, md: 300 } }}>
              <FormControl fullWidth size="small">
                <InputLabel>Funcionário</InputLabel>
                <Select
                  value={selectedEmployee?.pk || ''}
                  onChange={handleEmployeeChange}
                  label="Funcionário"
                >
                  {employees.map((emp) => (
                    <MenuItem key={emp.pk} value={emp.pk}>
                      {emp.pk} - {emp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {/* Select no header para ano (apenas no resumo) */}
          {activeSection === 'summary' && (
            <Box sx={{ flexGrow: { xs: 1, md: 0 }, minWidth: 150 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Ano</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  label="Ano"
                >
                  {getYearOptions().map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {activeSection && (
            <Button variant="outlined" onClick={handleBack} startIcon={<ArrowBack />}>
              Voltar
            </Button>
          )}
        </Box>
      </Box>

      {/* Conteúdo principal */}
      <Fade in={showContent} timeout={400}>
        <Box>{renderContent()}</Box>
      </Fade>
    </Box>
  );
};

export default EpiArea;
