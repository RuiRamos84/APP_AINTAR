import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Button,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Modal,
    TextField,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CloseIcon from "@mui/icons-material/Close";
import Sidebar from "../../components/common/Sidebar/Sidebar";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { lightTheme, darkTheme } from "../../styles/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useMetaData } from "../../contexts/MetaDataContext";
import {
    getTasks,
    addTaskNote,
    closeTask,
    getTaskHistory,
    updateTaskStatus,
    createTask,
    updateTask,
} from "../../services/TaskService";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";
import { red, orange, green } from "@mui/material/colors";

const ItemTypes = {
    TASK: "task",
};

// Utility functions
const getPriorityColor = (priority) => {
    switch (priority) {
        case 1: return green[600];
        case 2: return orange[600];
        case 3: return red[600];
        default: return undefined;
    }
};

const getPriorityIcons = (priority) => {
    if (!priority || priority < 1) return null;

    return (
        <Box sx={{
            display: "inline-flex",
            gap: "2px"
        }}>
            {[...Array(priority)].map((_, i) => (
                <PriorityHighIcon
                    key={i}
                    fontSize="small"
                    sx={{
                        ml: i === 0 ? 0 : "-18px",
                        color: getPriorityColor(priority),
                    }}
                />
            ))}
        </Box>
    );
};

const TaskCard = ({ task, moveTask, openModal, isDarkMode }) => {
    const { metaData } = useMetaData();
    const [{ isDragging }, drag] = useDrag(() => ({
        type: "task",
        item: { id: task.pk },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const startDate = task.when_start
        ? new Date(task.when_start).toLocaleDateString()
        : "-";
    const endDate = task.when_stop
        ? new Date(task.when_stop).toLocaleDateString()
        : null;

    return (
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
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                    }}
                >
                    <Tooltip title={`Data de Início: ${startDate}`} arrow>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarMonthIcon fontSize="small" />
                            <Typography variant="body2">
                                {startDate}
                            </Typography>
                        </Box>
                    </Tooltip>

                    <Tooltip title={`Prioridade: ${task.ts_priority || "Indefinida"}`} arrow>
                        <Box>
                            {getPriorityIcons(task.ts_priority)}
                        </Box>
                    </Tooltip>
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                    {task.name}
                </Typography>

                {task.memo && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        {task.memo}
                    </Typography>
                )}

                {endDate && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Fim: {endDate}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

const TaskColumn = ({ columnName, tasks, moveTask, clientName, openModal, isDarkMode }) => {
    const [, drop] = useDrop(() => ({
        accept: ItemTypes.TASK,
        drop: (item) => moveTask(item.id, columnName, clientName),
    }));

    return (
        <Box
            ref={drop}
            sx={{
                background: isDarkMode ? "#222" : "#e0e0e0",
                padding: 2,
                minHeight: 300,
                borderRadius: 2,
                color: isDarkMode ? "#ccc" : "#000"
            }}
        >
            <Typography variant="h6" sx={{ textAlign: "center", marginBottom: 1 }}>
                {columnName}
            </Typography>
            {tasks.length > 0 ? (
                tasks.map((task) => (
                    <TaskCard
                        key={task.pk}
                        task={task}
                        moveTask={moveTask}
                        openModal={openModal}
                        isDarkMode={isDarkMode}
                    />
                ))
            ) : (
                <Typography variant="body2" sx={{ textAlign: "center", padding: 2 }}>
                    Nenhuma tarefa
                </Typography>
            )}
        </Box>
    );
};

const TaskBoard = () => {
    const [tasks, setTasks] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedClient, setExpandedClient] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskHistory, setTaskHistory] = useState([]);
    const [newNote, setNewNote] = useState("");
    const [confirmClose, setConfirmClose] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTask, setEditedTask] = useState(null);


    // New state for task creation
    const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
    const [newTaskData, setNewTaskData] = useState({
        name: '',
        client_id: null,
        priority: 1,
        memo: ''
    });

    const { user } = useAuth();
    const { metaData } = useMetaData();
    const isDarkMode = user ? user.dark_mode : false;

    useEffect(() => {
        fetchActiveTasks();
    }, []);

    const fetchActiveTasks = async () => {
        try {
            const tasksData = await getTasks();

            const groupedTasks = groupTasksByPerson(tasksData);
            setTasks(groupedTasks);
        } catch (error) {
            console.error("Erro ao carregar tarefas ativas:", error);
        }
    };

    const loadTaskHistory = async (taskId) => {
        try {
            const history = await getTaskHistory(taskId);
            setTaskHistory(history);
        } catch (error) {
            console.error("Erro ao carregar histórico da tarefa:", error);
        }
    };

    const groupTasksByPerson = (tasks) => {
        const grouped = {};

        tasks.forEach((task) => {
            const clientName = task.ts_client_name;
            const status = task.status || "A Fazer";

            if (!grouped[clientName]) {
                grouped[clientName] = {
                    name: clientName,
                    tasks: {
                        "A Fazer": [],
                        "Em Progresso": [],
                        "Concluído": [],
                    },
                    counts: {
                        "A Fazer": 0,
                        "Em Progresso": 0,
                        "Concluído": 0,
                    },
                };
            }

            grouped[clientName].counts[status] += 1;
            grouped[clientName].tasks[status].push(task);
        });

        return grouped;
    };

    const moveTask = async (taskId, newStatus, clientName) => {
        try {
            await updateTaskStatus(taskId, newStatus);
            setTasks((prevTasks) => {
                const newTasks = { ...prevTasks };
                let movedTask = null;

                Object.keys(newTasks[clientName].tasks).forEach((status) => {
                    newTasks[clientName].tasks[status] = newTasks[clientName].tasks[status].filter(
                        (task) => {
                            if (task.pk === taskId) {
                                movedTask = { ...task, status: newStatus };
                                return false;
                            }
                            return true;
                        }
                    );
                });

                if (movedTask) {
                    newTasks[clientName].tasks[newStatus].push(movedTask);
                }

                return newTasks;
            });
        } catch (error) {
            console.error("Erro ao atualizar a tarefa:", error);
        }
    };

    const handleExpandClient = (clientName) => {
        setExpandedClient(expandedClient === clientName ? null : clientName);
    };

    const openModal = async (task) => {
        setSelectedTask(task);
        setEditedTask({ ...task });  // INICIALIZA O ESTADO EDITÁVEL
        setNewNote("");
        setTaskHistory([]);
        await loadTaskHistory(task.pk);
    };



    const handleModalClose = () => {
        if (newNote.trim() !== "") {
            setConfirmClose(true);
        } else {
            closeModal();
        }
    };

    const closeModal = () => {
        setSelectedTask(null);
        setTaskHistory([]);
        setNewNote("");
        setConfirmClose(false);
    };

    const confirmCloseModal = () => {
        closeModal();
    };

    const cancelCloseModal = () => {
        setConfirmClose(false);
    };

    const handleAddNote = async () => {
        if (!selectedTask || !newNote) return;
        try {
            await addTaskNote(selectedTask.pk, newNote);
            await loadTaskHistory(selectedTask.pk);
            setNewNote("");
        } catch (error) {
            console.error("Erro ao adicionar nota:", error);
        }
    };

    const handleCloseTask = async () => {
        if (!selectedTask) return;
        try {
            await closeTask(selectedTask.pk);
            await fetchActiveTasks();
            closeModal();
        } catch (error) {
            console.error("Erro ao fechar tarefa:", error);
        }
    };

    // New task creation methods
    const handleOpenCreateTaskModal = () => {
        setIsCreateTaskModalOpen(true);
    };

    const handleCloseCreateTaskModal = () => {
        setIsCreateTaskModalOpen(false);
        setNewTaskData({
            name: '',
            client_id: null,
            priority: 1,
            memo: ''
        });
    };

    const handleCreateTask = async () => {
        try {
            await createTask(newTaskData);
            await fetchActiveTasks();
            handleCloseCreateTaskModal();
        } catch (error) {
            console.error("Erro ao criar tarefa:", error);
        }
    };

    const handleUpdateTask = async () => {
        if (!editedTask) return;

        try {
            await updateTask(selectedTask.pk, editedTask);
            await fetchActiveTasks();  // Atualiza a lista
            setIsEditing(false);
            setSelectedTask(null);  // Fecha o modal
        } catch (error) {
            console.error("Erro ao atualizar a tarefa:", error);
        }
    };



    return (
        <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <DndProvider backend={HTML5Backend}>
                <Box
                    sx={{
                        display: "flex",
                        minHeight: "100vh",
                        background: isDarkMode ? "#121212" : "#f4f6f8",
                        color: isDarkMode ? "#fff" : "#000",
                    }}
                >
                    <Sidebar
                        isOpen={sidebarOpen}
                        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />
                    <Box sx={{ position: "relative", flexGrow: 1, display: "flex", flexDirection: "column" }}>
                        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h4" component="h1" sx={{ m: 1, textAlign: "left" }}>
                                Tarefas
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleOpenCreateTaskModal}
                            >
                                Nova Tarefa
                            </Button>
                        </Box>

                        <Box
                            sx={{
                                flexGrow: 1,
                                overflowY: "auto",
                                scrollBehavior: "smooth",
                                height: {
                                    xs: "calc(100vh - 120px)",
                                    md: "calc(100vh - 64px)",
                                },
                                px: { xs: 1, md: 3 },
                                pb: 2,
                            }}
                        >
                            {Object.keys(tasks).map((clientName) => {
                                const totalUserTasks =
                                    tasks[clientName].tasks["A Fazer"].length +
                                    tasks[clientName].tasks["Em Progresso"].length +
                                    tasks[clientName].tasks["Concluído"].length;

                                return (
                                    <Accordion
                                        key={clientName}
                                        expanded={expandedClient === clientName}
                                        onChange={() => handleExpandClient(clientName)}
                                        disableGutters
                                    >
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            sx={{
                                                position: "sticky",
                                                top: 0,
                                                zIndex: 10,
                                                background: isDarkMode ? "#333" : "#f5f5f5",
                                                color: isDarkMode ? "#fff" : "#000",
                                                borderBottom: isDarkMode
                                                    ? "1px solid #444"
                                                    : "1px solid #ccc",
                                                margin: 0,
                                            }}
                                        >
                                            <Typography variant="h6" sx={{ margin: 0 }}>
                                                {clientName} ({totalUserTasks})
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Grid container spacing={2}>
                                                {Object.keys(tasks[clientName].tasks).map((columnName) => {
                                                    const totalColumnTasks =
                                                        tasks[clientName].tasks[columnName].length;
                                                    return (
                                                        <Grid item xs={12} sm={6} md={4} key={columnName}>
                                                            <TaskColumn
                                                                columnName={`${columnName} (${totalColumnTasks})`}
                                                                tasks={tasks[clientName].tasks[columnName]}
                                                                moveTask={moveTask}
                                                                clientName={clientName}
                                                                openModal={openModal}
                                                                isDarkMode={isDarkMode}
                                                            />
                                                        </Grid>
                                                    );
                                                })}
                                            </Grid>
                                        </AccordionDetails>
                                    </Accordion>
                                );
                            })}
                        </Box>
                    </Box>
                </Box>

                {/* Modal para criar nova tarefa */}
                <Modal
                    open={isCreateTaskModalOpen}
                    onClose={handleCloseCreateTaskModal}
                >
                    <Box
                        sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: { xs: "90%", md: 500 },
                            bgcolor: "background.paper",
                            boxShadow: 24,
                            p: 4,
                            borderRadius: 2
                        }}
                    >
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Criar Nova Tarefa
                        </Typography>
                        <TextField
                            label="Nome da Tarefa"
                            value={editedTask?.name || ""}
                            onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
                            fullWidth
                            disabled={!isEditing}
                        />

                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Cliente</InputLabel>
                            <Select
                                value={editedTask?.ts_client || ""}
                                onChange={(e) => setEditedTask({ ...editedTask, ts_client: e.target.value })}
                                disabled={!isEditing}
                            >
                                {metaData?.clients?.map((client) => (
                                    <MenuItem key={client.pk} value={client.pk}>
                                        {client.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                                value={editedTask?.ts_priority || ""}
                                onChange={(e) => setEditedTask({ ...editedTask, ts_priority: e.target.value })}
                                disabled={!isEditing}
                            >
                                {metaData?.task_priority?.map((priority) => (
                                    <MenuItem key={priority.pk} value={priority.pk}>
                                        {priority.value}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Descrição"
                            multiline
                            rows={3}
                            value={editedTask?.memo || ""}
                            onChange={(e) => setEditedTask({ ...editedTask, memo: e.target.value })}
                            fullWidth
                            disabled={!isEditing}
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleCreateTask}
                                disabled={!newTaskData.name || !newTaskData.client_id}
                            >
                                Criar
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleCloseCreateTaskModal}
                            >
                                Cancelar
                            </Button>
                        </Box>
                    </Box>
                </Modal>

                {/* Modal para apresentar detalhes */}
                <Modal open={Boolean(selectedTask)} onClose={handleModalClose}>
                    <Box
                        sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            background: isDarkMode ? "#333" : "#fff",
                            color: isDarkMode ? "#fff" : "#000",
                            p: 3,
                            borderRadius: 2,
                            boxShadow: 24,
                            width: { xs: "90%", md: 750 },
                            maxHeight: "80vh",
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {selectedTask && (
                            <>
                                {/* Cabeçalho do Modal */}
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        mb: 2,
                                    }}
                                >

                                    <Tooltip title="Data de Início" arrow>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            <CalendarMonthIcon fontSize="small" />
                                            <Typography variant="body2">
                                                {selectedTask.when_start
                                                    ? new Date(selectedTask.when_start).toLocaleDateString()
                                                    : "-"}
                                            </Typography>
                                        </Box>
                                    </Tooltip>
                                    <Typography variant="h6" gutterBottom>
                                        <strong>Tarefa -</strong> {selectedTask.name}
                                    </Typography>

                                    <Tooltip title={`Prioridade: ${selectedTask.ts_priority || "Indefinida"}`} arrow>
                                        <Box>
                                            {getPriorityIcons(selectedTask.ts_priority)}
                                        </Box>
                                    </Tooltip>
                                    <IconButton onClick={handleModalClose}>
                                        <CloseIcon sx={{ color: isDarkMode ? "#fff" : "#000" }} />
                                    </IconButton>
                                </Box>

                                <Button onClick={() => setIsEditing(!isEditing)}>
                                    {isEditing ? "Cancelar Edição" : "Editar"}
                                </Button>

                                {/* Campos Editáveis / Visuais */}
                                <TextField
                                    label="Nome da Tarefa"
                                    value={editedTask?.name || ""}
                                    onChange={(e) => setEditedTask({ ...editedTask, name: e.target.value })}
                                    fullWidth
                                    disabled={!isEditing}
                                    sx={{ mb: 2 }}
                                />

                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Cliente</InputLabel>
                                    <Select
                                        label="Cliente"
                                        value={editedTask?.ts_client || ""}
                                        onChange={(e) => setEditedTask({ ...editedTask, ts_client: e.target.value })}
                                        disabled={!isEditing}
                                    >
                                        {metaData?.who?.map((client) => (
                                            <MenuItem key={client.pk} value={client.pk}>
                                                {client.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>


                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel>Prioridade</InputLabel>
                                    <Select
                                        label="Prioridade"
                                        value={editedTask?.ts_priority || ""}
                                        onChange={(e) => setEditedTask({ ...editedTask, ts_priority: e.target.value })}
                                        disabled={!isEditing}
                                    >
                                        {metaData?.task_priority?.map((priority) => (
                                            <MenuItem key={priority.pk} value={priority.pk}>
                                                {priority.value}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <TextField
                                    label="Descrição"
                                    multiline
                                    rows={3}
                                    value={editedTask?.memo || ""}
                                    onChange={(e) => setEditedTask({ ...editedTask, memo: e.target.value })}
                                    fullWidth
                                    disabled={!isEditing}
                                    sx={{ mb: 2 }}
                                />

                                {isEditing && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleUpdateTask}
                                        disabled={JSON.stringify(selectedTask) === JSON.stringify(editedTask)}
                                    >
                                        Guardar Alterações
                                    </Button>
                                )}
                                {selectedTask.owner_name && (
                                    <Typography sx={{ mb: 2 }}>
                                        <strong>Proprietário:</strong> {selectedTask.owner_name}
                                    </Typography>
                                )}

                                {selectedTask.status && (
                                    <Typography sx={{ mb: 2 }}>
                                        <strong>Status:</strong> {selectedTask.status}
                                    </Typography>
                                )}

                                {selectedTask.when_stop && (
                                    <Typography sx={{ mb: 2 }}>
                                        <strong>Fim:</strong> {new Date(selectedTask.when_stop).toLocaleDateString()}
                                    </Typography>
                                )}

                                {/* Histórico de Notas */}
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="h6">Histórico de Notas:</Typography>
                                    {taskHistory.length === 0 ? (
                                        <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                                            Sem notas até ao momento.
                                        </Typography>
                                    ) : (
                                        taskHistory.map((item, idx) => (
                                            <Box
                                                key={idx}
                                                sx={{
                                                    mb: 1,
                                                    p: 1,
                                                    backgroundColor: isDarkMode ? "#444" : "#f0f0f0",
                                                    borderRadius: 1,
                                                }}
                                            >
                                                <Typography variant="body2">
                                                    <strong>Data:</strong> {new Date(item.when_submit).toLocaleString()}
                                                </Typography>
                                                <Typography variant="body2">
                                                    <strong>Autor:</strong> {item.isadmin ? "Administrador" : "Utilizador"}
                                                </Typography>
                                                <Typography variant="body2">
                                                    <strong>Nota:</strong> {item.memo}
                                                </Typography>
                                            </Box>
                                        ))
                                    )}
                                </Box>

                                {/* Adicionar Nota */}
                                <Box sx={{ mt: 2 }}>
                                    <TextField
                                        label="Nova Nota"
                                        variant="outlined"
                                        fullWidth
                                        size="small"
                                        multiline
                                        minRows={1}
                                        maxRows={6}
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        sx={{ mb: 1 }}
                                    />
                                </Box>

                                {/* Botões de Ação */}
                                <Box
                                    sx={{
                                        mt: "auto",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 2,
                                    }}
                                >
                                    <Button variant="contained" color="error" onClick={handleCloseTask}>
                                        Encerrar Tarefa
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleAddNote}
                                        disabled={!newNote.trim()}
                                    >
                                        Adicionar Nota
                                    </Button>
                                </Box>
                            </>
                        )}
                    </Box>
                </Modal>


                {/* Diálogo de confirmação de fecho do modal */}
                <Dialog
                    open={confirmClose}
                    onClose={cancelCloseModal}
                    aria-labelledby="confirm-dialog-title"
                    aria-describedby="confirm-dialog-description"
                >
                    <DialogTitle id="confirm-dialog-title">
                        Descartar Nota?
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            Existem alterações não guardadas. Deseja realmente sair sem guardar?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={cancelCloseModal} color="primary">
                            Não
                        </Button>
                        <Button onClick={confirmCloseModal} color="primary" autoFocus>
                            Sim
                        </Button>
                    </DialogActions>
                </Dialog>
            </DndProvider>
        </ThemeProvider>
    );
};

export default TaskBoard;