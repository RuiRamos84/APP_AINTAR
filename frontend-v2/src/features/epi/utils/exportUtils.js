/**
 * Export Utilities para EPI
 *
 * Funções para exportar dados para Excel
 */

import * as XLSX from 'xlsx';

/**
 * Exporta dados para arquivo Excel
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 */
export const exportToExcel = (data, filename) => {
  if (!data || data.length === 0) {
    console.warn('Nenhum dado para exportar');
    return;
  }

  // Criar worksheet a partir dos dados
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Criar workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

  // Ajustar largura das colunas baseado no conteúdo
  const columns = Object.keys(data[0]);
  const columnWidths = columns.map((col) => {
    const maxLength = Math.max(
      col.length,
      ...data.map((row) => String(row[col] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) }; // Max 50 caracteres
  });
  worksheet['!cols'] = columnWidths;

  // Gerar nome do arquivo com data
  const dateStr = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${dateStr}.xlsx`;

  // Escrever arquivo
  XLSX.writeFile(workbook, fullFilename);
};

/**
 * Formata data para exibição
 * @param {Date|string} date - Data
 * @returns {string}
 */
export const formatDateForExport = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pt-PT');
};

export default {
  exportToExcel,
  formatDateForExport,
};
