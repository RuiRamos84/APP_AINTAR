// src/utils/dateUtils.js

/**
 * Formata uma data para o formato dd/mm/yyyy
 * @param {Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export const formatDateToString = (date) => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Formata uma data e hora para o formato dd/mm/yyyy HH:mm
 * @param {Date} date - Data a ser formatada
 * @returns {string} Data e hora formatada
 */
export const formatDateTimeToString = (date) => {
  if (!date) return "";

  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Converte uma string de data no formato dd/mm/yyyy para um objeto Date
 * @param {string} dateString - Data em string no formato dd/mm/yyyy
 * @returns {Date} Objeto Date
 */
export const parseDateString = (dateString) => {
  if (!dateString) return null;

  const [day, month, year] = dateString.split("/");
  return new Date(year, month - 1, day);
};

/**
 * Converte uma string de data e hora no formato dd/mm/yyyy HH:mm para um objeto Date
 * @param {string} dateTimeString - Data e hora em string no formato dd/mm/yyyy HH:mm
 * @returns {Date} Objeto Date
 */

export const getCurrentDateTime = () => {
    const now = new Date();
    // formato: YYYY-MM-DDThh:mm
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
};

export const getDaysSinceSubmission = (submissionDate) => {
  if (!submissionDate) return { days: 0, formatted: '0 dias' };

  try {
    // Suportar três formatos:
    // 1. "2025-04-11 às 14:30" (formato submission)
    // 2. "2025-07-04 15:44:00.336" (formato SQL timestamp)
    // 3. "Mon, 03 Nov 2025 14:25:59 GMT" (formato GMT)
    let submission;

    if (submissionDate.includes('GMT') || (submissionDate.includes(',') && !submissionDate.includes('-'))) {
      // Formato GMT - usar Date constructor
      submission = new Date(submissionDate);
      submission.setHours(0, 0, 0, 0);
    } else {
      // Formatos 1 e 2 (baseados em YYYY-MM-DD)
      let datePart;
      if (submissionDate.includes(' às ')) {
        datePart = submissionDate.split(' às ')[0];
      } else {
        // Pega apenas a parte da data (YYYY-MM-DD)
        datePart = submissionDate.split(' ')[0];
      }
      const [year, month, day] = datePart.split('-').map(Number);
      submission = new Date(year, month - 1, day);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDays = Math.floor((today - submission) / (1000 * 60 * 60 * 24));
    if (totalDays <= 0) return { days: 0, formatted: '0 dias' };

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = (totalDays % 365) % 30;

    let formatted = '';
    if (years > 0) formatted += `${years} ano${years > 1 ? 's' : ''}`;
    if (months > 0) formatted += `${formatted ? ' ' : ''}${months} mes${months > 1 ? 'es' : ''}`;
    if (days > 0 || !formatted) formatted += `${formatted ? ' ' : ''}${days} dia${days !== 1 ? 's' : ''}`;

    return { days: totalDays, formatted };
  } catch (error) {
    return { days: 0, formatted: '0 dias' };
  }
};

/**
 * Calcula o número de dias úteis entre duas datas (excluindo sábados e domingos)
 */
export const getBusinessDaysSince = (submissionDate) => {
  if (!submissionDate) return { days: 0, formatted: '0 dias' };

  try {
    // Suportar três formatos de data
    let startDate;

    if (submissionDate.includes('GMT') || (submissionDate.includes(',') && !submissionDate.includes('-'))) {
      startDate = new Date(submissionDate);
    } else {
      let datePart;
      if (submissionDate.includes(' às ')) {
        datePart = submissionDate.split(' às ')[0];
      } else {
        datePart = submissionDate.split(' ')[0];
      }
      const [year, month, day] = datePart.split('-').map(Number);
      startDate = new Date(year, month - 1, day);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    // Contar dias úteis
    let businessDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dayOfWeek = currentDate.getDay();
      // 0 = domingo, 6 = sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Formatar
    const years = Math.floor(businessDays / 252); // ~252 dias úteis por ano
    const remainingDays = businessDays % 252;
    const months = Math.floor(remainingDays / 21); // ~21 dias úteis por mês
    const days = remainingDays % 21;

    let formatted = '';
    if (years > 0) formatted += `${years} ano${years > 1 ? 's' : ''}`;
    if (months > 0) formatted += `${formatted ? ', ' : ''}${months} mês${months > 1 ? 'es' : ''}`;
    if (days > 0 || !formatted) formatted += `${formatted ? ' e ' : ''}${days} dia${days !== 1 ? 's' : ''} úteis`;

    return { days: businessDays, formatted };
  } catch (error) {
    return { days: 0, formatted: '0 dias' };
  }
};
