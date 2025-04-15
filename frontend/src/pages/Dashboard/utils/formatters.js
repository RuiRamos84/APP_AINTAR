/**
 * Formata um número com separadores de milhar
 * 
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export const formatNumber = (value) => {
  if (value === undefined || value === null) {
    return '0';
  }

  if (typeof value !== 'number') {
    value = parseFloat(value) || 0;
  }

  return value.toLocaleString('pt-PT');
};

/**
 * Formata um número como percentagem
 * 
 * @param {number} value - Valor a ser formatado
 * @param {number} decimals - Número de casas decimais
 * @returns {string} Valor formatado como percentagem
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === undefined || value === null) {
    return '0%';
  }

  if (typeof value !== 'number') {
    value = parseFloat(value) || 0;
  }

  return (value * 100).toFixed(decimals) + '%';
};

/**
 * Formata tempo em horas para uma representação legível
 * 
 * @param {number} hours - Horas a serem formatadas
 * @returns {string} Tempo formatado
 */
export const formatTime = (hours) => {
  if (hours === undefined || hours === null) {
    return '0h';
  }

  if (typeof hours !== 'number') {
    hours = parseFloat(hours) || 0;
  }

  if (hours < 1) {
    // Converter para minutos
    const minutes = Math.round(hours * 60);
    return `${minutes}min`;
  }

  if (hours < 24) {
    // Mostrar horas e minutos
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}min`;
    }
  }

  // Mostrar dias e horas
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);

  if (remainingHours === 0) {
    return `${days} dia${days !== 1 ? 's' : ''}`;
  } else {
    return `${days} dia${days !== 1 ? 's' : ''} ${remainingHours}h`;
  }
};