/**
 * Serviço de exportação de tarefas para CSV e PDF
 */

import { TASK_PRIORITY, TASK_STATUS } from '../schemas/taskSchemas';

/**
 * Obter label de prioridade
 */
const getPriorityLabel = (priority) => {
  const labels = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    urgente: 'Urgente',
  };
  return labels[priority] || priority || '';
};

/**
 * Obter label de status
 */
const getStatusLabel = (status) => {
  const labels = {
    pending: 'Por Fazer',
    in_progress: 'Em Progresso',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  };
  return labels[status] || status || '';
};

/**
 * Converte array de objetos para CSV
 */
const convertToCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Header
  const header = columns.map((col) => col.label).join(',');

  // Rows
  const rows = data.map((task) => {
    return columns
      .map((col) => {
        const value = col.getValue ? col.getValue(task) : task[col.field];
        // Escapar aspas e envolver em aspas se contiver vírgula
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return [header, ...rows].join('\n');
};

/**
 * Baixar arquivo CSV
 */
export const exportToCSV = (tasks, filename = 'tarefas') => {
  const columns = [
    { field: 'pk', label: 'ID', getValue: (task) => task.pk || task.id },
    { field: 'title', label: 'Nome', getValue: (task) => task.title || task.name },
    { field: 'client_name', label: 'Cliente' },
    { field: 'owner_name', label: 'Responsável' },
    {
      field: 'when_start',
      label: 'Data Início',
      getValue: (task) =>
        task.when_start ? new Date(task.when_start).toLocaleDateString('pt-PT') : '',
    },
    {
      field: 'when_stop',
      label: 'Data Fim',
      getValue: (task) =>
        task.when_stop ? new Date(task.when_stop).toLocaleDateString('pt-PT') : '',
    },
    {
      field: 'priority',
      label: 'Prioridade',
      getValue: (task) => getPriorityLabel(task.priority),
    },
    {
      field: 'status',
      label: 'Status',
      getValue: (task) => getStatusLabel(task.status),
    },
    { field: 'description', label: 'Descrição' },
  ];

  const csv = convertToCSV(tasks, columns);
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exportar para PDF (usando impressão do navegador)
 */
export const exportToPDF = (tasks, title = 'Tarefas') => {
  // Criar HTML para impressão
  const html = generatePrintHTML(tasks, title);

  // Criar janela temporária para impressão
  const printWindow = window.open('', '', 'height=600,width=800');
  printWindow.document.write(html);
  printWindow.document.close();

  // Aguardar carregamento e abrir diálogo de impressão
  printWindow.onload = () => {
    printWindow.print();
  };
};

/**
 * Gera HTML para impressão/PDF
 */
const generatePrintHTML = (tasks, title) => {
  const rows = tasks
    .map(
      (task) => `
    <tr>
      <td>${task.pk || task.id || ''}</td>
      <td>${task.title || task.name || ''}</td>
      <td>${task.client_name || ''}</td>
      <td>${task.owner_name || ''}</td>
      <td>${task.when_start ? new Date(task.when_start).toLocaleDateString('pt-PT') : ''}</td>
      <td>${task.when_stop ? new Date(task.when_stop).toLocaleDateString('pt-PT') : ''}</td>
      <td>${getPriorityLabel(task.priority)}</td>
      <td>${getStatusLabel(task.status)}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @media print {
          @page { size: A4 landscape; margin: 1cm; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        h1 {
          text-align: center;
          margin-bottom: 30px;
          color: #1976d2;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
          font-size: 11px;
        }
        th {
          background-color: #1976d2;
          color: white;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        tr:hover {
          background-color: #f5f5f5;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 10px;
          color: #666;
        }
        .summary {
          margin-bottom: 20px;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        .summary span {
          margin-right: 20px;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="summary">
        <span><strong>Total:</strong> ${tasks.length} tarefas</span>
        <span><strong>Por Fazer:</strong> ${tasks.filter((t) => t.status === 'pending').length}</span>
        <span><strong>Em Progresso:</strong> ${tasks.filter((t) => t.status === 'in_progress').length}</span>
        <span><strong>Concluídas:</strong> ${tasks.filter((t) => t.status === 'completed').length}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nome</th>
            <th>Cliente</th>
            <th>Responsável</th>
            <th>Data Início</th>
            <th>Data Fim</th>
            <th>Prioridade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="footer">
        Gerado em ${new Date().toLocaleString('pt-PT')} | AINTAR - Sistema de Gestão
      </div>
    </body>
    </html>
  `;
};

export default {
  exportToCSV,
  exportToPDF,
};
