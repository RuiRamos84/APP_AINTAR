import React from "react";
import TaskBoardLayout from "./TaskBoardLayout";

/**
 * Componente para exibir todas as tarefas
 * usando o layout de quadro Kanban
 */
const AllTasks = () => {
  return <TaskBoardLayout fetchType="all" title="Todas as Tarefas" />;
};

export default AllTasks;