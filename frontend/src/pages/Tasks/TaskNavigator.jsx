import React from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Componente de navegação entre as diferentes vistas de tarefas
 * @returns {JSX.Element}
 */
const TaskNavigator = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determinar qual tab está ativa com base na rota atual
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes("/tasks/my")) return 0;
    if (path.includes("/tasks/created")) return 1;
    if (path.includes("/tasks/all")) return 2;
    return 0;
  };
  
  const handleTabChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        navigate("/tasks/my");
        break;
      case 1:
        navigate("/tasks/created");
        break;
      case 2:
        navigate("/tasks/all");
        break;
      default:
        navigate("/tasks/my");
    }
  };
  
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={getActiveTab()}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="task view navigation tabs"
      >
        <Tab label="Minhas Tarefas (Como Cliente)" />
        <Tab label="Tarefas Onde Sou Responsável" />
        <Tab label="Todas as Tarefas" />
      </Tabs>
    </Box>
  );
};

export default TaskNavigator;