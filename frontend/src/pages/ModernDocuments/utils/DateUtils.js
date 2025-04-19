/**
 * Utilitários para manipulação de datas no formato da aplicação
 * Versão otimizada e mais robusta para o formato "YYYY-MM-DD às HH:MM"
 */

/**
 * Extrai a data de uma string no formato "YYYY-MM-DD às HH:MM"
 * @param {String} dateString - String de data no formato da aplicação
 * @returns {Object|null} - Objeto com ano, mês e dia, ou null se inválido
 */
export const extractDateParts = (dateString) => {
    if (!dateString) return null;

    try {
        // Extrair apenas a parte da data (antes de "às")
        const datePartStr = dateString.split(' às ')[0];
        if (!datePartStr) return null;

        const dateParts = datePartStr.split('-');
        if (dateParts.length !== 3) return null;

        return {
            year: parseInt(dateParts[0], 10),
            month: parseInt(dateParts[1], 10),
            day: parseInt(dateParts[2], 10)
        };
    } catch (error) {
        console.error(`Erro ao extrair partes da data: ${dateString}`, error);
        return null;
    }
};

/**
 * Verifica se uma data é anterior a outra
 * @param {Object} date1 - Primeira data (objeto com year, month, day)
 * @param {Object} date2 - Segunda data (objeto com year, month, day)
 * @returns {Boolean} - true se date1 < date2, false caso contrário
 */
export const isDateBefore = (date1, date2) => {
    if (!date1 || !date2) return false;

    if (date1.year < date2.year) return true;
    if (date1.year > date2.year) return false;

    // Mesmo ano
    if (date1.month < date2.month) return true;
    if (date1.month > date2.month) return false;

    // Mesmo ano e mês
    return date1.day < date2.day;
};

/**
 * Verifica se uma data é posterior a outra
 * @param {Object} date1 - Primeira data (objeto com year, month, day)
 * @param {Object} date2 - Segunda data (objeto com year, month, day)
 * @returns {Boolean} - true se date1 > date2, false caso contrário
 */
export const isDateAfter = (date1, date2) => {
    if (!date1 || !date2) return false;

    if (date1.year > date2.year) return true;
    if (date1.year < date2.year) return false;

    // Mesmo ano
    if (date1.month > date2.month) return true;
    if (date1.month < date2.month) return false;

    // Mesmo ano e mês
    return date1.day > date2.day;
};

/**
 * Formata uma data para exibição no formato DD/MM/YYYY
 * @param {String} dateString - String de data no formato da aplicação "YYYY-MM-DD às HH:MM"
 * @returns {String} - Data formatada ou string vazia se inválida
 */
export const formatDisplayDate = (dateString) => {
    const dateParts = extractDateParts(dateString);
    if (!dateParts) return '';

    return `${dateParts.day.toString().padStart(2, '0')}/${dateParts.month.toString().padStart(2, '0')}/${dateParts.year}`;
};

/**
 * Converte uma string de data ISO para o formato da aplicação "YYYY-MM-DD às HH:MM"
 * @param {String} isoString - Data no formato ISO
 * @returns {String} - Data no formato da aplicação
 */
export const convertISOToAppFormat = (isoString) => {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');

        return `${year}-${month}-${day} às ${hours}:${minutes}`;
    } catch (error) {
        console.error('Erro ao converter data ISO para formato da aplicação:', error);
        return '';
    }
};

/**
 * Compara duas datas no formato da aplicação
 * @param {String} dateStr1 - Primeira data no formato da aplicação
 * @param {String} dateStr2 - Segunda data no formato da aplicação
 * @returns {Number} - Negativo se dateStr1 < dateStr2, positivo se dateStr1 > dateStr2, 0 se iguais
 */
export const compareDates = (dateStr1, dateStr2) => {
    const date1 = extractDateParts(dateStr1);
    const date2 = extractDateParts(dateStr2);

    if (!date1 && !date2) return 0;
    if (!date1) return -1;
    if (!date2) return 1;

    // Comparar ano
    if (date1.year !== date2.year) {
        return date1.year - date2.year;
    }

    // Comparar mês
    if (date1.month !== date2.month) {
        return date1.month - date2.month;
    }

    // Comparar dia
    return date1.day - date2.day;
};

/**
 * Converte uma string YYYY-MM-DD para o formato da aplicação
 * @param {String} dateStr - Data no formato YYYY-MM-DD
 * @returns {String} - Data no formato da aplicação
 */
export const convertSimpleDateToAppFormat = (dateStr) => {
    if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return '';

    try {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');

        return `${dateStr} às ${hours}:${minutes}`;
    } catch (error) {
        console.error('Erro ao converter data simples para formato da aplicação:', error);
        return '';
    }
};

/**
 * Valida se uma data está dentro de um intervalo
 * @param {String} dateStr - Data no formato da aplicação
 * @param {String} startDateStr - Data inicial (YYYY-MM-DD)
 * @param {String} endDateStr - Data final (YYYY-MM-DD)
 * @returns {Boolean} - true se a data está dentro do intervalo, false caso contrário
 */
export const isDateInRange = (dateStr, startDateStr, endDateStr) => {
    const dateParts = extractDateParts(dateStr);
    if (!dateParts) return false;

    if (startDateStr) {
        const startParts = startDateStr.split('-');
        if (startParts.length === 3) {
            const startYear = parseInt(startParts[0], 10);
            const startMonth = parseInt(startParts[1], 10);
            const startDay = parseInt(startParts[2], 10);

            if (isDateBefore(dateParts, { year: startYear, month: startMonth, day: startDay })) {
                return false;
            }
        }
    }

    if (endDateStr) {
        const endParts = endDateStr.split('-');
        if (endParts.length === 3) {
            const endYear = parseInt(endParts[0], 10);
            const endMonth = parseInt(endParts[1], 10);
            const endDay = parseInt(endParts[2], 10);

            if (isDateAfter(dateParts, { year: endYear, month: endMonth, day: endDay })) {
                return false;
            }
        }
    }

    return true;
};