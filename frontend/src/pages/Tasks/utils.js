import { red, orange, green } from "@mui/material/colors";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";

export const getPriorityColor = (priority) => {
    switch (priority) {
        case 1: return green[600];
        case 2: return orange[600];
        case 3: return red[600];
        default: return "#ccc";
    }
};

export const getPriorityIcons = (priority) => {
    if (!priority) return null;
    const icons = [];
    for (let i = 0; i < priority; i++) {
        icons.push(
            <PriorityHighIcon
                key={i}
                fontSize="small"
                sx={{ color: getPriorityColor(priority), marginLeft: i === 0 ? 0 : "-18px" }}
            />
        );
    }
    return <>{icons}</>;
};

/**
 * Agrupa as tarefas por cliente e status, utilizando os metadados para definir as colunas.
 * @param {Array} tasks - Array de tarefas.
 * @param {Array} metaTaskStatus - Array de objetos de status, ex: [{ pk: 1, value: "Entrada" }, ...]
 * @returns {Object} Objeto agrupado por cliente, onde cada cliente possui as colunas definidas em metaTaskStatus.
 */
export const groupTasksByPerson = (tasks, metaTaskStatus) => {
    const grouped = {};
    tasks.forEach((task) => {
        const clientName = task.ts_client_name;
        // Procura o objeto de status que tem pk igual a task.ts_notestatus
        const statusObj = metaTaskStatus.find((status) => status.pk === task.ts_notestatus);
        // Se não encontrar, utiliza o primeiro estado dos metadados como padrão
        const statusText = statusObj ? statusObj.value : metaTaskStatus[0].value;

        if (!grouped[clientName]) {
            grouped[clientName] = { name: clientName, tasks: {} };
            // Inicializa as colunas com os valores dos metadados
            metaTaskStatus.forEach((status) => {
                grouped[clientName].tasks[status.value] = [];
            });
        }
        grouped[clientName].tasks[statusText].push(task);
    });
    return grouped;
};

