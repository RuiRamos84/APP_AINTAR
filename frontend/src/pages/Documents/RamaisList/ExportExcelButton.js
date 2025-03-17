import React from "react";
import { Button } from "@mui/material";
import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import * as XLSX from "xlsx";

const ExportExcelButton = ({ data, fileName, buttonProps }) => {
    const exportToExcel = () => {
        if (!data || data.length === 0) {
            alert("Não há dados para exportar");
            return;
        }

        // Criar uma workbook
        const wb = XLSX.utils.book_new();

        // Converter os dados para uma worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Adicionar a worksheet à workbook
        XLSX.utils.book_append_sheet(wb, ws, "Dados");

        // Gerar um nome de arquivo com data atual se não for fornecido
        const defaultFileName = fileName || `exportacao_${new Date().toISOString().slice(0, 10)}.xlsx`;

        // Salvar o arquivo
        XLSX.writeFile(wb, defaultFileName);
    };

    return (
        <Button
            variant="contained"
            color="primary"
            startIcon={<FileDownloadIcon />}
            onClick={exportToExcel}
            {...buttonProps}
        >
            Exportar Excel
        </Button>
    );
};

export default ExportExcelButton;