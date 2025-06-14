import * as XLSX from "xlsx-js-style";

const COLUMNS = [
    { header: "Nº de Registo", key: "regnumber" },
    { header: "Requerente", key: "ts_entity" },
    { header: "Contacto", key: "phone" },
    { header: "Morada", key: "address" },
    { header: "Porta", key: "door" },
    { header: "Freguesia", key: "nut3" },
    { header: "Observações", key: "memo" }
];

export const exportToExcel = (filteredData, selectedView) => {
    if (!filteredData[selectedView]?.data) return;

    const workbook = XLSX.utils.book_new();
    const data = filteredData[selectedView].data;

    // Sheet principal
    const worksheet = createWorksheet(data, filteredData[selectedView].name);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");

    // Gerar e descarregar
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    const fileName = `Operacoes_${filteredData[selectedView].name.replace(/\s/g, "_")}_${new Date().toLocaleDateString('pt-PT').replace(/\//g, "-")}.xlsx`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
};

const createWorksheet = (data, title) => {
    if (!data?.length) return XLSX.utils.aoa_to_sheet([["Sem dados"]]);

    const headers = COLUMNS.map(col => col.header);
    const ws = XLSX.utils.aoa_to_sheet([[title], headers]);

    const rows = data.map(row => COLUMNS.map(col => row[col.key] || ""));
    XLSX.utils.sheet_add_aoa(ws, rows, { origin: "A3" });

    // Estilos básicos
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
    ws["!cols"] = COLUMNS.map(() => ({ wch: 20 }));

    return ws;
};