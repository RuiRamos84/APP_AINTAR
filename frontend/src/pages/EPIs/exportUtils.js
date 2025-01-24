import * as XLSX from 'xlsx';

export const exportToExcel = (data, columns, filename) => {
    const worksheetData = data.map(row => {
        const formattedRow = {};
        columns.forEach(column => {
            if (column.render) {
                formattedRow[column.label] = column.render(row);
            } else {
                formattedRow[column.label] = row[column.id];
            }
        });
        return formattedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

    // Ajustar largura das colunas
    const columnWidths = columns.map(col => ({
        wch: Math.max(
            col.label.length,
            ...worksheetData.map(row => String(row[col.label] || '').length)
        )
    }));
    worksheet['!cols'] = columnWidths;

    // Estilizar cabeçalho
    const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        worksheet[cellRef].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "E0E0E0" } }
        };
    }

    XLSX.writeFile(workbook, `${filename}_${formatDate(new Date())}.xlsx`);
};

const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};