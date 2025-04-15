import React from "react";
import { useOutletContext } from "react-router-dom";
import TaskBoardLayout from "./TaskBoardLayout";

const AllTasks = () => {
  const { searchTerm } = useOutletContext();
  return <TaskBoardLayout fetchType="all" title="Todas as Tarefas" searchTerm={searchTerm} />;
};

export default AllTasks;