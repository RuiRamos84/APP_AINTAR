/**
 * Excel Export Utility for Documents
 * Uses xlsx library (SheetJS) for client-side export
 */
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getStatusName } from './statusUtils';

const DEFAULT_COLUMNS = [
  'regnumber',
  'submission',
  'ts_entity',
  'ts_associate',
  'what',
  'tt_type',
  'creator',
];

const DEFAULT_HEADERS = {
  regnumber: 'Número',
  submission: 'Data',
  ts_entity: 'Entidade',
  ts_associate: 'Associado',
  what: 'Status',
  tt_type: 'Tipo',
  creator: 'Criador',
};

const DEFAULT_WIDTHS = [15, 15, 25, 25, 20, 25, 20];

/**
 * Export documents to Excel (.xlsx)
 * @param {Array} documents - Documents to export
 * @param {Object} metaData - Metadata for status name mapping
 * @param {string} tabName - Current tab name (for filename)
 * @param {Object} [options] - Override columns, headers, widths, filename, sheetName
 * @returns {boolean} Success
 */
export const exportDocumentsToExcel = (documents, metaData, tabName, options = {}) => {
  try {
    if (!Array.isArray(documents) || documents.length === 0) {
      toast.warning('Não existem documentos para exportar');
      return false;
    }

    const columns = options.includeColumns || DEFAULT_COLUMNS;
    const headers = options.columnHeaders || DEFAULT_HEADERS;
    const widths = options.columnWidths || DEFAULT_WIDTHS;
    const sheetName = options.sheetName || 'Pedidos';

    // Map documents to rows
    const excelData = documents.map((doc) => {
      const row = {};
      columns.forEach((column) => {
        const header = headers[column] || column;
        let value = doc[column] || '';

        // Resolve status name from metadata
        if (column === 'what' && metaData?.what) {
          value = getStatusName(doc[column], metaData.what);
        }

        row[header] = value;
      });
      return row;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = widths.map((width) => ({ wch: width }));

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = options.filename || `Pedidos_${tabName || 'Exportacao'}_${date}.xlsx`;

    // Write file (triggers download)
    XLSX.writeFile(workbook, filename);

    toast.success('Exportação para Excel concluída');
    return true;
  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    toast.error('Erro ao exportar dados para Excel');
    return false;
  }
};

/**
 * Export documents to CSV
 * @param {Array} documents - Documents to export
 * @param {Object} metaData - Metadata for status name mapping
 * @param {string} [filename] - Custom filename
 * @returns {boolean} Success
 */
export const exportDocumentsToCSV = (documents, metaData, filename) => {
  try {
    if (!Array.isArray(documents) || documents.length === 0) {
      toast.warning('Não existem documentos para exportar');
      return false;
    }

    const headerRow = ['Número', 'Data', 'Entidade', 'Associado', 'Status', 'Tipo', 'Criador'];

    const rows = documents.map((doc) => [
      doc.regnumber || '',
      doc.submission || '',
      doc.ts_entity || '',
      doc.ts_associate || '',
      getStatusName(doc.what, metaData?.what) || '',
      doc.tt_type || '',
      doc.creator || '',
    ]);

    rows.unshift(headerRow);

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      filename || `pedidos_${new Date().toISOString().slice(0, 10)}.csv`
    );
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success('Exportação CSV concluída');
    return true;
  } catch (error) {
    console.error('Erro ao exportar para CSV:', error);
    toast.error('Erro ao exportar dados para CSV');
    return false;
  }
};
