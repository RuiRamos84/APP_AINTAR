import React from "react";
import { useOutletContext } from "react-router-dom";
import TaskBoardLayout from "./TaskBoardLayout";

const MyTasks = () => {
  const { searchTerm } = useOutletContext();
  return <TaskBoardLayout fetchType="my" title="Minhas Tarefas" searchTerm={searchTerm} />;
};

export default MyTasks;
