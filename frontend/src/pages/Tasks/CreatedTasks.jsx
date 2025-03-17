import React from "react";
import TaskBoardLayout from "./TaskBoardLayout";

/**
 * Componente para exibir as tarefas criadas pelo usuário atual
 * usando o layout de quadro Kanban
 */
const CreatedTasks = () => {
  return <TaskBoardLayout fetchType="created" title="Tarefas Onde Sou Responsável" />;
};

export default CreatedTasks;