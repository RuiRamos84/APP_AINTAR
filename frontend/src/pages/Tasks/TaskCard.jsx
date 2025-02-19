import React from "react";
import { Card, CardContent, Typography, Tooltip, Box, Badge } from "@mui/material";
import { useDrag } from "react-dnd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { getPriorityIcons } from "./utils";

const ItemTypes = {
  TASK: "task",
};

const TaskCard = ({ task, openModal, isDarkMode }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { id: task.pk },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const startDate = task.when_start ? new Date(task.when_start).toLocaleDateString() : "-";

  return (
    <Badge
      color="error"
      variant="dot"
      invisible={task.notification === 1}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Card
        ref={drag}
        onClick={() => openModal(task)}
        sx={{
          boxShadow: 3,
          p: 1,
          opacity: isDragging ? 0.5 : 1,
          mb: 1,
          background: isDarkMode ? "#2c2c2c" : "#fff",
          color: isDarkMode ? "#fff" : "#000",
          transition: "all 0.3s",
          cursor: "pointer",
          "&:hover": {
            transform: "scale(1.05)",
            boxShadow: 12,
            backgroundColor: isDarkMode ? "#3c3c3c" : "#f9f9f9",
          },
        }}
      >
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Tooltip title={`Data de Início: ${startDate}`}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarMonthIcon fontSize="small" />
                <Typography variant="body2">{startDate}</Typography>
              </Box>
            </Tooltip>
            <Tooltip title={`Prioridade: ${task.ts_priority || "Indefinida"}`}>
              <Box>{getPriorityIcons(task.ts_priority)}</Box>
            </Tooltip>
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
            {task.name}
          </Typography>
          {task.memo && <Typography variant="body2">{task.memo}</Typography>}
        </CardContent>
      </Card>
    </Badge>
  );
};

export default TaskCard;
