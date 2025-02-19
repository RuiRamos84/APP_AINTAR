import api from "./api";

// Função auxiliar para tratar a resposta da API
const handleResponse = (response) => {
    if (response.data.tasks) {
        return response.data.tasks;
    } else if (response.data.history) {
        return response.data.history;
    } else if (response.data.message) {
        console.log(response.data.message);
        return [];
    } else {
        return response.data || [];
    }
};

// Formata datas e outros campos necessários
const mapTasks = (data) => {
    if (!Array.isArray(data)) {
        return [];
    }
    return data.map((task) => ({
        ...task,
        startDate: task.when_start
            ? new Date(task.when_start).toLocaleDateString()
            : "",
        endDate: task.when_stop
            ? new Date(task.when_stop).toLocaleDateString()
            : "",
    }));
};

//--------------------------------------------------------
// Métodos de listagem
//--------------------------------------------------------

// 1) Listar todas as tarefas 
export const getTasks = async () => {
    try {
        const response = await api.get("/tasks");
        return mapTasks(handleResponse(response));
    } catch (error) {
        console.error("Erro ao buscar tarefas:", error);
        throw error;
    }
};

//--------------------------------------------------------
// Métodos de manipulação das tarefas
//--------------------------------------------------------

// 2) Criar uma nova tarefa
export const createTask = async (taskData) => {
    try {
        const response = await api.post("/tasks", taskData);
        return handleResponse(response);
    } catch (error) {
        console.error("Erro ao criar tarefa:", error);
        throw error;
    }
};

// 3) Atualizar uma tarefa
export const updateTask = async (taskId, taskData) => {
    try {
        const response = await api.put(`/tasks/${taskId}`, taskData);
        return handleResponse(response);
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        throw error;
    }
};

// 4) Adicionar uma nota a uma tarefa
export const addTaskNote = async (taskId, note) => {
    try {
        const response = await api.post(`/tasks/${taskId}/notes`, { memo: note });
        return handleResponse(response);
    } catch (error) {
        console.error("Erro ao adicionar nota à tarefa:", error);
        throw error;
    }
};

// 5) Fechar uma tarefa
export const closeTask = async (taskId) => {
    try {
        const response = await api.post(`/tasks/${taskId}/close`);
        return handleResponse(response);
    } catch (error) {
        console.error("Erro ao fechar tarefa:", error);
        throw error;
    }
};

// 6) Consultar o histórico de notas de uma tarefa
export const getTaskHistory = async (taskId) => {
    try {
        const response = await api.get(`/tasks/${taskId}/history`);
        return handleResponse(response);
    } catch (error) {
        console.error("Erro ao buscar histórico de tarefa:", error);
        throw error;
    }
};

// 7) Atualizar o status de uma tarefa
export const updateTaskStatus = async (taskId, statusId) => {
    try {
        const response = await api.put(`/tasks/${taskId}/status`, { status_id: statusId });
        return handleResponse(response);
    } catch (error) {
        console.error("Erro ao atualizar status da tarefa:", error);
        throw error;
    }
};

// 8) Atualizar a notificação da tarefa (marcar como lida)
export const updateTaskNotification = async (taskId) => {
    try {
        const response = await api.put(`/tasks/${taskId}/notification`);
        return handleResponse(response);
    } catch (error) {
        console.error("Erro ao atualizar notificação da tarefa:", error);
        throw error;
    }
};
