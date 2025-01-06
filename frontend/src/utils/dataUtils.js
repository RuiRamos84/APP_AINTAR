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
