import { getStatusColor, getStatusName } from './statusUtils';
import { normalizeText } from '../../../utils/textUtils';

/**
 * Processa a resposta da API normalizando a estrutura dos documentos
 * @param {Object} response - Resposta da API
 * @returns {Array} - Array de documentos processados
 */
export const processApiResponse = (response) => {
    try {
        // Verificar onde estão os documentos na resposta
        let documents = [];

        if (response?.data?.documents && Array.isArray(response.data.documents)) {
            documents = response.data.documents;
        } else if (response?.data?.document_self && Array.isArray(response.data.document_self)) {
            documents = response.data.document_self;
        } else if (response?.data?.document_owner && Array.isArray(response.data.document_owner)) {
            documents = response.data.document_owner;
        } else if (Array.isArray(response?.data)) {
            documents = response.data;
        }

        // Processar cada documento para normalização
        return documents.map(processDocument);
    } catch (error) {
        console.error('Erro ao processar resposta da API:', error);
        return [];
    }
};

/**
 * Processa um documento individual para garantir uma estrutura consistente
 * @param {Object} doc - Documento da API
 * @returns {Object} - Documento processado
 */
export const processDocument = (doc) => {
    if (!doc) return null;

    return {
        // Propriedades obrigatórias
        pk: doc.pk || 0,
        regnumber: doc.regnumber || 'Sem número',
        ts_entity: doc.ts_entity || 'Desconhecido',
        ts_associate: doc.ts_associate || null,
        tt_type: doc.tt_type || 'Desconhecido',
        what: doc.what !== undefined ? doc.what : 0,

        // Formatação de datas
        submission: doc.submission || '',
        submissionDate: doc.submission ? formatDate(doc.submission) : '',

        // Dados de endereço consolidados
        address: {
            street: doc.address || '',
            door: doc.door || '',
            floor: doc.floor || '',
            postal: doc.postal || '',
            nut1: doc.nut1 || '',
            nut2: doc.nut2 || '',
            nut3: doc.nut3 || '',
            nut4: doc.nut4 || '',
            coords: (doc.glat && doc.glong) ? { lat: doc.glat, long: doc.glong } : null
        },

        // Manter propriedades originais
        ...doc
    };
};

/**
 * Encontra um valor nos metadados
 * @param {Array} metaArray - Array de metadados
 * @param {string} key - Nome da propriedade para comparação
 * @param {*} value - Valor a ser buscado
 * @returns {string} - Valor encontrado ou original
 */
export const findMetaValue = (metaArray, key, value) => {
    if (!metaArray || !Array.isArray(metaArray)) return value;
    const meta = metaArray.find(item => item.pk === value || item[key] === value);
    return meta ? meta.name || meta.step || meta.value : value;
};

/**
 * Formata uma data se for válida
 * @param {string} dateString - String com a data da API
 * @returns {string} - Data formatada ou string original
 */
export const formatDate = (dateString) => {
    if (!dateString) return '-';

    try {
        // Verificar diferentes formatos
        if (typeof dateString === 'string') {
            // Formato com "às"
            if (dateString.includes(' às ')) {
                const [datePart] = dateString.split(' às ');
                const [year, month, day] = datePart.split('-');
                return `${day}/${month}/${year}`;
            }

            // Formato ISO
            if (dateString.includes('T')) {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('pt-PT');
                }
            }

            // Formato yyyy-mm-dd
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const [year, month, day] = dateString.split('-');
                return `${day}/${month}/${year}`;
            }
        }

        // Tentativa genérica
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('pt-PT');
        }

        // Se nada funcionar, retorne a string original
        return dateString;
    } catch (error) {
        console.warn('Erro ao formatar data:', error, dateString);
        return dateString || '-';
    }
};

/**
 * Filtra documentos com base em critérios de busca
 * @param {Array} documents - Lista de documentos
 * @param {string} searchTerm - Termo de busca 
 * @returns {Array} - Documentos filtrados
 */
export const filterDocuments = (documents, searchTerm = '') => {
    if (!searchTerm?.trim() || !Array.isArray(documents)) return documents;

    const term = searchTerm.toLowerCase().trim();

    return documents.filter(doc => {
        // Pesquisar em TODOS os campos do objecto
        const normalizedTerm = normalizeText(term);
        return Object.values(doc).some(value => {
            if (value == null) return false;
            return normalizeText(String(value)).includes(normalizedTerm);
        });
    });
};

/**
 * Ordena documentos com base em campo e direção
 * @param {Array} documents - Lista de documentos
 * @param {string} sortBy - Campo para ordenação
 * @param {string} direction - Direção ('asc' ou 'desc')
 * @returns {Array} - Documentos ordenados
 */
export const sortDocuments = (documents, sortBy = 'regnumber', direction = 'desc') => {
    if (!Array.isArray(documents)) return [];

    return [...documents].sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        // Tratamento especial para datas
        if (sortBy === 'submission') {
            valA = new Date(valA || 0).getTime();
            valB = new Date(valB || 0).getTime();
        }

        // Tratamento para valores nulos
        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        // Comparação de strings
        if (typeof valA === 'string' && typeof valB === 'string') {
            const comparison = valA.localeCompare(valB);
            return direction === 'asc' ? comparison : -comparison;
        }

        // Comparação numérica
        const comparison = valA > valB ? 1 : valA < valB ? -1 : 0;
        return direction === 'asc' ? comparison : -comparison;
    });
};

/**
 * Calcula a duração entre duas datas em formato legível
 * @param {string} start - Data/hora de início
 * @param {string} stop - Data/hora de término (opcional)
 * @param {Date} currentDateTime - Data/hora atual
 * @returns {string} - Duração formatada
 */
export const calculateDuration = (start, stop, currentDateTime) => {
    if (!start) return "";

    const formatDate = (dateString) => {
        const [date, time] = dateString.split(' às ');
        return new Date(`${date}T${time}:00`);
    };

    const startTime = formatDate(start);
    const stopTime = stop ? formatDate(stop) : currentDateTime;
    const duration = (stopTime - startTime) / 1000; // duração em segundos

    const days = Math.floor(duration / (3600 * 24));
    const hours = Math.floor((duration % (3600 * 24)) / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    let result = "";
    if (days > 0) {
        result += `${days}d `;
    }
    if (hours > 0) {
        result += `${hours}h `;
    }
    if (minutes > 0 || result === "") {
        result += `${minutes}m`;
    }
    if (!stop) {
        result += ` (até ${currentDateTime.toLocaleTimeString()})`;
    }

    return result.trim();
};

/**
 * Formata um valor para exibição
 * @param {*} value - Valor a ser formatado
 * @returns {string} - Valor formatado
 */
export const formatValue = (value) => {
    return value !== null && value !== undefined ? String(value) : "";
};

/**
 * Formata um endereço completo
 * @param {Object} addressData - Dados do endereço
 * @returns {string} - Endereço formatado
 */
export const formatAddress = (addressData) => {
    if (!addressData) return '';

    const { street, door, floor, postal, nut4, nut3 } = addressData;
    const addressParts = [
        street,
        door && `Porta: ${door}`,
        floor && `Andar: ${floor}`,
        postal,
        nut4,
        nut3,
    ];

    return addressParts.filter(part => part).join(", ");
};

/**
 * Formata memo com limite de caracteres
 * @param {string} memo - Texto das observações
 * @param {number} limit - Limite de caracteres
 * @returns {string} - Texto limitado
 */
export const renderMemo = (memo, limit = 100) => {
    if (!memo) return '-';
    return memo.length > limit ? `${memo.substring(0, limit)}...` : memo;
};