/**
 * Serviço de exportação de tarefas para CSV e PDF
 */

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
        if (stringValue.includes(',') || stringValue.includes('"')) {
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
    { field: 'pk', label: 'ID' },
    { field: 'name', label: 'Nome' },
    { field: 'ts_client_name', label: 'Cliente' },
    { field: 'owner_name', label: 'Responsável' },
    {
      field: 'when_start',
      label: 'Data Início',
      getValue: (task) => task.when_start ? new Date(task.when_start).toLocaleDateString() : ''
    },
    {
      field: 'when_stop',
      label: 'Data Fim',
      getValue: (task) => task.when_stop ? new Date(task.when_stop).toLocaleDateString() : ''
    },
    {
      field: 'ts_priority',
      label: 'Prioridade',
      getValue: (task) => {
        switch (task.ts_priority) {
          case 1:
            return 'Baixa';
          case 2:
            return 'Média';
          case 3:
            return 'Alta';
          default:
            return '';
        }
      }
    },
    { field: 'memo', label: 'Descrição' }
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
};

/**
 * Exportar para PDF (básico usando impressão do navegador)
 * Para PDF mais avançado, seria necessário usar uma biblioteca como jsPDF
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
    // Fechar janela após impressão (opcional)
    // printWindow.close();
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
      <td>${task.pk}</td>
      <td>${task.name || ''}</td>
      <td>${task.ts_client_name || ''}</td>
      <td>${task.owner_name || ''}</td>
      <td>${task.when_start ? new Date(task.when_start).toLocaleDateString() : ''}</td>
      <td>${task.when_stop ? new Date(task.when_stop).toLocaleDateString() : ''}</td>
      <td>${getPriorityLabel(task.ts_priority)}</td>
      <td>${task.memo || ''}</td>
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
          font-size: 10px;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 10px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
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
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div class="footer">
        Gerado em ${new Date().toLocaleString()} | Total de tarefas: ${tasks.length}
      </div>
    </body>
    </html>
  `;
};

/**
 * Helper para obter label de prioridade
 */
const getPriorityLabel = (priority) => {
  switch (priority) {
    case 1:
      return 'Baixa';
    case 2:
      return 'Média';
    case 3:
      return 'Alta';
    default:
      return '';
  }
};

export default {
  exportToCSV,
  exportToPDF
};
