import React from "react";
import { useOutletContext } from "react-router-dom";
import TaskBoardLayout from "./TaskBoardLayout";

const CreatedTasks = () => {
  const { searchTerm } = useOutletContext();
  return <TaskBoardLayout fetchType="created" title="Tarefas Onde Sou Responsável" searchTerm={searchTerm} />;
};

export default CreatedTasks;
