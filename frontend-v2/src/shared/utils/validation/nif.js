/**
 * Valida um NIF/NIPC português
 * @param {string|number} nif 
 * @returns {boolean}
 */
export const validateNIF = (nif) => {
    if (!nif) return false;
    
    const strNif = String(nif).replace(/\s/g, '');
    
    // Tem de ter 9 dígitos
    if (!/^[0-9]{9}$/.test(strNif)) return false;
    
    // O primeiro dígito tem de ser 1, 2, 3, 5, 6, 8 ou 9
    // (45 também é válido para alguns casos, mas a regra geral é esta)
    // Para simplificar e bater com legacy, validamos apenas o checksum
    
    const checkDigit = parseInt(strNif.charAt(8));
    let sum = 0;
    
    for (let i = 0; i < 8; i++) {
      sum += parseInt(strNif.charAt(i)) * (9 - i);
    }
    
    const remainder = sum % 11;
    let calculatedDigit = 11 - remainder;
    
    if (calculatedDigit >= 10) {
      calculatedDigit = 0;
    }
    
    return checkDigit === calculatedDigit;
};
