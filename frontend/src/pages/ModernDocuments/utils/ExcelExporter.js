/**
 * Utilitário otimizado para exportação de documentos para Excel
 */
import * as XLSX from 'xlsx';
import { getStatusName } from './statusUtils';
import { notifySuccess, notifyError, notifyWarning } from "../../../components/common/Toaster/ThemedToaster.js";

/**
 * Exporta documentos filtrados para Excel com melhor desempenho e robustez
 * @param {Array} documents - Lista de documentos a exportar
 * @param {Object} metaData - Metadados para mapeamento de valores
 * @param {String} tabName - Nome da tab atual (para o nome do ficheiro)
 * @param {Function} showNotification - (Deprecated) Use ThemedToaster notifications instead
 * @param {Object} options - Opções adicionais de exportação
 * @returns {Boolean} - true se a exportação foi bem-sucedida, false caso contrário
 */
export const exportDocumentsToExcel = (documents, metaData, tabName, showNotification, options = {}) => {
    try {
        if (!Array.isArray(documents) || documents.length === 0) {
            notifyWarning('Não existem documentos para exportar');
            return false;
        }

        // Configurações padrão que podem ser substituídas
        const config = {
            filename: options.filename,
            sheetName: options.sheetName || 'Pedidos',
            includeColumns: options.includeColumns || [
                'regnumber', 'submission', 'ts_entity', 'ts_associate',
                'what', 'tt_type', 'creator'
            ],
            columnHeaders: options.columnHeaders || {
                'regnumber': 'Número',
                'submission': 'Data',
                'ts_entity': 'Entidade',
                'ts_associate': 'Associado',
                'what': 'Status',
                'tt_type': 'Tipo',
                'creator': 'Criador'
            },
            columnWidths: options.columnWidths || [15, 15, 25, 25, 20, 25, 20]
        };

        // Formatar documentos para Excel de forma otimizada
        const excelData = documents.map(doc => {
            const row = {};

            // Preencher apenas as colunas solicitadas
            config.includeColumns.forEach((column, index) => {
                const header = config.columnHeaders[column] || column;
                let value = doc[column] || '';

                // Processamento especial para status (what)
                if (column === 'what' && metaData?.what) {
                    value = getStatusName(doc[column], metaData.what);
                }

                row[header] = value;
            });

            return row;
        });

        // Criar planilha
        const worksheet = XLSX.utils.json_to_sheet(excelData);

        // Definir larguras das colunas
        const columnWidths = config.columnWidths.map(width => ({ wch: width }));
        worksheet['!cols'] = columnWidths;

        // Criar workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName);

        // Nome de ficheiro com data atual
        const date = new Date().toISOString().split('T')[0];
        const filename = config.filename || `Pedidos_${tabName || 'Exportacao'}_${date}.xlsx`;

        // Exportar ficheiro
        XLSX.writeFile(workbook, filename);

        // Notificar sucesso
        notifySuccess('Exportação para Excel concluída com sucesso');
        return true;
    } catch (error) {
        console.error('Erro ao exportar para Excel:', error);
        notifyError('Erro ao exportar dados para Excel');
        return false;
    }
};

/**
 * Exporta documentos para CSV (mais leve que Excel para grandes conjuntos)
 * @param {Array} documents - Lista de documentos a exportar 
 * @param {Object} metaData - Metadados para mapeamento de valores
 * @param {String} filename - Nome do arquivo (opcional)
 * @returns {String} - URL do arquivo CSV gerado
 */
export const exportDocumentsToCSV = (documents, metaData, filename) => {
    try {
        if (!Array.isArray(documents) || documents.length === 0) {
            return null;
        }

        // Cabeçalhos padrão
        const headers = [
            'Número', 'Data', 'Entidade', 'Associado', 'Status', 'Tipo', 'Criador'
        ];

        // Converter documentos para linhas CSV
        const rows = documents.map(doc => [
            doc.regnumber || '',
            doc.submission || '',
            doc.ts_entity || '',
            doc.ts_associate || '',
            getStatusName(doc.what, metaData?.what) || '',
            doc.tt_type || '',
            doc.creator || ''
        ]);

        // Adicionar cabeçalhos
        rows.unshift(headers);

        // Converter para texto CSV
        const csvContent = rows
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        // Criar blob e URL
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Criar link e baixar
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute('download', filename || `pedidos_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return url;
    } catch (error) {
        console.error('Erro ao exportar para CSV:', error);
        return null;
    }
};