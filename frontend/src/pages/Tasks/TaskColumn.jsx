import React from "react";
import { Box, Typography } from "@mui/material";
import { useDrop } from "react-dnd";
import TaskCard from "./TaskCard";

const ItemTypes = {
  TASK: "task",
};

const TaskColumn = ({ columnName, tasks, moveTask, clientName, openModal, isDarkMode }) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.TASK,
    drop: (item) => moveTask(item.id, columnName, clientName),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const backgroundColor = isOver ? (isDarkMode ? "#444" : "#ddd") : (isDarkMode ? "#333" : "#eee");

  return (
    <Box ref={drop} sx={{ p: 2, borderRadius: 2, backgroundColor }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {columnName} ({tasks.length})
      </Typography>
      {tasks.length ? (
        tasks.map((task) => (
          <TaskCard key={task.pk} task={task} openModal={openModal} isDarkMode={isDarkMode} />
        ))
      ) : (
        <Typography variant="body2">Nenhuma Tarefa</Typography>
      )}
    </Box>
  );
};

export default TaskColumn;
