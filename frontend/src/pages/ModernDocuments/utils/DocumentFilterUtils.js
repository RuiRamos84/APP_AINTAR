/**
 * Utilitários otimizados para filtros de documentos
 * Combinando as funções existentes com melhorias de desempenho
 */
import { extractDateParts, isDateBefore, isDateAfter, isDateInRange } from './DateUtils';
import { normalizeText } from '../../../utils/textUtils';

/**
 * Filtra documentos por intervalo de datas com melhor desempenho
 * @param {Array} documents - Lista de documentos
 * @param {Object} dateRange - Objeto com startDate e endDate (YYYY-MM-DD)
 * @returns {Array} - Documentos filtrados
 */
export const filterDocumentsByDateRange = (documents, dateRange) => {
    if (!dateRange || (!dateRange.startDate && !dateRange.endDate)) return documents;

    return documents.filter(doc => {
        if (!doc.submission) return true;

        return isDateInRange(doc.submission, dateRange.startDate, dateRange.endDate);
    });
};

/**
 * Filtra documentos por status com melhoria na comparação de tipos
 * @param {Array} documents - Lista de documentos
 * @param {String|Number} statusFilter - ID do status para filtrar
 * @returns {Array} - Documentos filtrados
 */
export const filterDocumentsByStatus = (documents, statusFilter) => {
    if (!statusFilter || statusFilter === '') return documents;

    const statusValue = Number(statusFilter);
    return documents.filter(doc => {
        const docWhat = typeof doc.what === 'number' ? doc.what : Number(doc.what);
        return docWhat === statusValue;
    });
};

/**
 * Filtra documentos por associado com comparação otimizada de textos
 * @param {Array} documents - Lista de documentos
 * @param {String|Number} associateFilter - ID do associado para filtrar
 * @param {Object} metaData - Metadados contendo informações de associados
 * @returns {Array} - Documentos filtrados
 */
export const filterDocumentsByAssociate = (documents, associateFilter, metaData) => {
    if (!associateFilter || associateFilter === '' || !documents.length) return documents;

    const selectedAssociate = metaData?.associates?.find(a => a.pk === Number(associateFilter));
    if (!selectedAssociate || !selectedAssociate.name) return documents;

    // Preparar texto do associado uma única vez para melhor desempenho
    const associateText = selectedAssociate.name.toString().trim().toLowerCase();
    const associateTextWithoutPrefix = associateText.replace('município de ', '');

    return documents.filter(doc => {
        // Não processar se não tiver associado
        if (!doc.ts_associate) return false;

        const docAssociateText = doc.ts_associate.toString().trim().toLowerCase();
        const docAssociateTextWithoutPrefix = docAssociateText.replace('município de ', '');

        return docAssociateText.includes(associateText) ||
            associateText.includes(docAssociateText) ||
            docAssociateTextWithoutPrefix.includes(associateTextWithoutPrefix) ||
            associateTextWithoutPrefix.includes(docAssociateTextWithoutPrefix);
    });
};

/**
 * Filtra documentos por tipo de documento com melhorias para tratamento de tipos
 * @param {Array} documents - Lista de documentos
 * @param {String|Number} typeFilter - ID do tipo para filtrar
 * @param {Object} metaData - Metadados contendo informações de tipos
 * @returns {Array} - Documentos filtrados
 */
export const filterDocumentsByType = (documents, typeFilter, metaData) => {
    if (!typeFilter || typeFilter === '' || !documents.length) return documents;

    const selectedType = metaData?.types?.find(t => t.pk === Number(typeFilter));
    if (!selectedType || !selectedType.tt_doctype_value) return documents;

    // Preparar texto do tipo uma única vez para melhor desempenho
    const typeText = selectedType.tt_doctype_value.toString().trim().toLowerCase();

    return documents.filter(doc => {
        // Não processar se não tiver tipo
        if (!doc.tt_type) return false;

        const docTypeText = doc.tt_type.toString().trim().toLowerCase();

        // Comparações otimizadas
        return docTypeText === typeText ||
            docTypeText.includes(typeText) ||
            typeText.includes(docTypeText);
    });
};

/**
 * Filtra documentos por notificação com conversão de tipos melhorada
 * @param {Array} documents - Lista de documentos
 * @param {String|Number} notificationFilter - Valor de notificação (0 ou 1)
 * @returns {Array} - Documentos filtrados
 */
export const filterDocumentsByNotification = (documents, notificationFilter) => {
    if (notificationFilter === undefined || notificationFilter === '' || !documents.length) {
        return documents;
    }

    const notificationValue = Number(notificationFilter);

    // Verificar se é um valor válido (0 ou 1)
    if (notificationValue !== 0 && notificationValue !== 1) {
        return documents;
    }

    return documents.filter(doc => {
        const docNotification = typeof doc.notification === 'number' ?
            doc.notification : Number(doc.notification || 0);
        return docNotification === notificationValue;
    });
};

/**
 * Filtra documentos por termo de pesquisa com melhor desempenho
 * @param {Array} documents - Lista de documentos
 * @param {string} searchTerm - Termo de pesquisa 
 * @returns {Array} - Documentos filtrados
 */
export const filterDocumentsBySearchTerm = (documents, searchTerm = '') => {
    if (!searchTerm || !documents.length) return documents;

    const search = searchTerm.toLowerCase().trim();
    if (search === '') return documents;

    return documents.filter(doc => {
        const normalizedSearch = normalizeText(search);

        // Verificação rápida dos campos mais comuns primeiro
        if (doc.regnumber && normalizeText(doc.regnumber).includes(normalizedSearch)) return true;
        if (doc.ts_entity && normalizeText(doc.ts_entity).includes(normalizedSearch)) return true;

        // Verificar outros campos apenas se necessário
        return (
            (doc.tt_type && normalizeText(doc.tt_type).includes(normalizedSearch)) ||
            (doc.ts_associate && normalizeText(doc.ts_associate).includes(normalizedSearch)) ||
            (doc.nipc && normalizeText(String(doc.nipc)).includes(normalizedSearch)) ||
            (doc.creator && normalizeText(doc.creator).includes(normalizedSearch))
        );
    });
};

/**
 * Aplica múltiplos filtros aos documentos em um único passe
 * @param {Array} documents - Lista de documentos
 * @param {Object} filters - Objeto com critérios de filtro
 * @param {Object} metaData - Metadados para referência
 * @returns {Array} - Documentos filtrados
 */
export const applyDocumentFilters = (documents, filters, metaData) => {
    if (!documents || !documents.length) return [];
    if (!filters) return documents;

    let result = [...documents];

    // Aplicar filtros em sequência otimizada
    if (filters.status) {
        result = filterDocumentsByStatus(result, filters.status);
    }

    if (filters.searchTerm) {
        result = filterDocumentsBySearchTerm(result, filters.searchTerm);
    }

    if (filters.associate) {
        result = filterDocumentsByAssociate(result, filters.associate, metaData);
    }

    if (filters.type) {
        result = filterDocumentsByType(result, filters.type, metaData);
    }

    if (filters.notification !== undefined && filters.notification !== '') {
        result = filterDocumentsByNotification(result, filters.notification);
    }

    // Filtrar por intervalo de datas
    if (filters.dateRange && (filters.dateRange.startDate || filters.dateRange.endDate)) {
        result = filterDocumentsByDateRange(result, filters.dateRange);
    }

    return result;
};