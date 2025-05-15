import * as XLSX from "xlsx-js-style";

export const exportToExcel = (filteredData, selectedView) => {
    if (!filteredData[selectedView]) return;

    const workbook = XLSX.utils.book_new();

    const excelColumns = [
        { header: "Nº de Registo", key: "regnumber" },
        { header: "Requerente", key: "ts_entity" },
        { header: "Contacto", key: "phone" },
        { header: "Morada do pedido", key: "address" },
        { header: "Porta", key: "door" },
        { header: "Freguesia", key: "nut3" },
        { header: "Localidade", key: "nut4" },
        { header: "Nº Cisternas", key: "n_cisternas" },
        { header: "Gratuita", key: "gratuita" },
        {
            header: "Existe saneamento na rua até 20 metros?",
            key: "saneamento_proximo",
        },
        { header: "Existe rede de água no local?", key: "rede_agua" },
        { header: "Local de Descarga / ETAR", key: "local_descarga" },
        { header: "Observações", key: "memo" },
    ];

    const createWorksheet = (data, title) => {
        if (!data || data.length === 0) {
            return XLSX.utils.aoa_to_sheet([["Sem Dados"]]);
        }

        const headers = excelColumns.map((col) => col.header || "Desconhecido");
        const ws = XLSX.utils.aoa_to_sheet([[title], headers]);

        const dataToAdd = data.map((row) =>
            excelColumns.map((col) =>
                row[col.key] !== undefined ? row[col.key] : ""
            )
        );
        XLSX.utils.sheet_add_aoa(ws, dataToAdd, { origin: "A3" });

        // Merge cells for title
        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        ];

        // Define styles
        const titleStyle = {
            font: { sz: 18, bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "DDDDDD" } },
            border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            },
        };

        const headerStyle = {
            font: { sz: 12, bold: true },
            alignment: {
                horizontal: "center",
                vertical: "center",
                wrapText: true,
            },
            fill: { fgColor: { rgb: "E0E0E0" } },
            border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            },
        };

        const bodyStyle = {
            font: { sz: 14 },
            alignment: { vertical: "center", wrapText: true },
            border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
            },
        };

        // Apply styles
        const range = XLSX.utils.decode_range(ws["!ref"]);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[cellRef]) {
                    ws[cellRef] = { v: "", t: "s" };
                }

                if (R === 0) {
                    ws[cellRef].s = titleStyle;
                } else if (R === 1) {
                    ws[cellRef].s = headerStyle;
                } else {
                    ws[cellRef].s = bodyStyle;
                    if (
                        [
                            "Nº Cisternas",
                            "Gratuita",
                            "Existe saneamento na rua até 20 metros?",
                            "Existe rede de água no local?",
                        ].includes(headers[C])
                    ) {
                        ws[cellRef].s = {
                            ...bodyStyle,
                            alignment: { ...bodyStyle.alignment, horizontal: "center" },
                        };
                    }
                }
            }
        }

        // Set column widths
        ws["!cols"] = [
            { wch: 21 }, // Nº de Registo
            { wch: 30 }, // Requerente
            { wch: 13 }, // Contacto
            { wch: 30 }, // Morada do pedido
            { wch: 5 },  // Porta
            { wch: 28 }, // Freguesia
            { wch: 20 }, // Localidade
            { wch: 6 },  // Nº Cisternas
            { wch: 6 },  // Gratuita
            { wch: 6 },  // Existe saneamento
            { wch: 6 },  // Existe rede de água
            { wch: 15 }, // Local de Descarga
            { wch: 40 }, // Observações
        ];

        // Set row heights
        ws["!rows"] = [{ hpt: 30 }, { hpt: 45 }];

        return ws;
    };

    const currentDate = new Date().toLocaleDateString("pt-PT");
    const allData = filteredData[selectedView].data;

    // Create "Todos" sheet
    const allDataTitle = `Ordens de Serviço ${filteredData[selectedView].name} Todos ${currentDate}`;
    const allDataSheet = createWorksheet(allData, allDataTitle);
    XLSX.utils.book_append_sheet(workbook, allDataSheet, "Todos");

    // Create sheets for each associate
    const associateGroups = allData.reduce((groups, item) => {
        const associate = item.ts_associate || "Sem Associado";
        if (!groups[associate]) groups[associate] = [];
        groups[associate].push(item);
        return groups;
    }, {});

    Object.entries(associateGroups).forEach(([associate, data]) => {
        const sheetTitle = `Ordens de Serviço ${filteredData[selectedView].name} ${associate} ${currentDate}`;
        const sheet = createWorksheet(data, sheetTitle);
        XLSX.utils.book_append_sheet(
            workbook,
            sheet,
            associate.substring(0, 31)
        );
    });

    // Generate and save file
    const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
    });
    const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const fileName = `Ordens_de_Servico_${filteredData[
        selectedView
    ].name.replace(/\s/g, "_")}_${currentDate.replace(/\//g, "-")}.xlsx`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
};