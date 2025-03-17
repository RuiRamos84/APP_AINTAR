/**
 * Prepara os dados dos ramais para exportação Excel.
 * 
 * @param {Array} documents Lista de documentos/ramais
 * @param {String} type Tipo de lista ('active' ou 'concluded')
 * @returns {Array} Dados formatados para exportação
 */
export const prepareRamaisDataForExport = (documents, type) => {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return [];
    }

    return documents.map(doc => {
        // Base de dados comum para ambos os tipos
        const baseData = {
            "Número": doc.regnumber || "",
            "Entidade": doc.ts_entity || "",
            "Localidade": doc.nut4 || "",
            "Freguesia": doc.nut3 || "",
            "Concelho": doc.nut2 || "",
            "Morada": doc.address || "",
            "Porta": doc.door || "",
            "Andar": doc.floor || "",
            "Código Postal": doc.postal || "",
            "Contacto": doc.phone || "",
            "Observações": doc.memo || ""
        };

        // Dados específicos para ramais ativos (a serem concluídos)
        if (type === 'active') {
            const totalComprimento = (
                parseFloat(doc.comprimento_bet || 0) +
                parseFloat(doc.comprimento_gra || 0) +
                parseFloat(doc.comprimento_pav || 0)
            ).toFixed(2);

            const totalArea = (
                parseFloat(doc.area_bet || 0) +
                parseFloat(doc.area_gra || 0) +
                parseFloat(doc.area_pav || 0)
            ).toFixed(2);

            return {
                ...baseData,
                "Comprimento Total (m)": totalComprimento,
                "Área Total (m²)": totalArea,
                "Comprimento Betuminoso (m)": doc.comprimento_bet || "0.00",
                "Área Betuminoso (m²)": doc.area_bet || "0.00",
                "Comprimento Gravilha (m)": doc.comprimento_gra || "0.00",
                "Área Gravilha (m²)": doc.area_gra || "0.00",
                "Comprimento Pavê (m)": doc.comprimento_pav || "0.00",
                "Área Pavê (m²)": doc.area_pav || "0.00",
                "Data de Submissão": doc.submission || ""
            };
        }

        // Dados específicos para ramais concluídos
        else if (type === 'concluded') {
            return {
                ...baseData,
                "Comprimento (m)": doc.comprimento ? parseFloat(doc.comprimento).toFixed(2) : "0.00",
                "Área (m²)": doc.area ? parseFloat(doc.area).toFixed(2) : "0.00",
                "Data de Conclusão": doc.submission || ""
            };
        }

        return baseData;
    });
};

/**
 * Gera um nome de arquivo para exportação Excel.
 * 
 * @param {String} prefix Prefixo para o nome do arquivo
 * @returns {String} Nome do arquivo com timestamp
 */
export const generateExcelFileName = (prefix) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");

    return `${prefix}_${date}_${time}.xlsx`;
};