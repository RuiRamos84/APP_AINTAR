/**
 * Prepara os dados dos ramais para exportação Excel.
 */
export const prepareRamaisDataForExport = (documents, type) => {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
        return [];
    }

    return documents.map(doc => {
        // Calcular totais sempre da mesma forma
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

        // Base comum
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
            "Observações": doc.memo || "",
            "Comprimento Total (m)": totalComprimento,
            "Área Total (m²)": totalArea,
        };

        // Campos específicos por tipo
        if (type === 'active') {
            return {
                ...baseData,
                "Comprimento Betuminoso (m)": doc.comprimento_bet || "0.00",
                "Área Betuminoso (m²)": doc.area_bet || "0.00",
                "Comprimento Paralelos (m)": doc.comprimento_gra || "0.00",
                "Área Paralelos (m²)": doc.area_gra || "0.00",
                "Comprimento Pavê (m)": doc.comprimento_pav || "0.00",
                "Área Pavê (m²)": doc.area_pav || "0.00",
                "Data de Submissão": doc.submission || ""
            };
        }

        if (type === 'concluded') {
            return {
                ...baseData,
                "Comprimento Betuminoso (m)": doc.comprimento_bet || "0.00",
                "Área Betuminoso (m²)": doc.area_bet || "0.00",
                "Comprimento Paralelos (m)": doc.comprimento_gra || "0.00",
                "Área Paralelos (m²)": doc.area_gra || "0.00",
                "Comprimento Pavê (m)": doc.comprimento_pav || "0.00",
                "Área Pavê (m²)": doc.area_pav || "0.00",
                "Data de Conclusão": doc.submission || ""
            };
        }

        return baseData;
    });
};

export const generateExcelFileName = (prefix) => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");
    return `${prefix}_${date}_${time}.xlsx`;
};