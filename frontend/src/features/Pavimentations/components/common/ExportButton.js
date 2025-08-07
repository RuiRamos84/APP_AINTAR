// frontend/src/features/Pavimentations/components/common/ExportButton.js

import React, { useState } from 'react';
import {
    Button,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    CircularProgress,
    Tooltip,
    Alert,
    Snackbar,
    Typography,
    Divider,
    Box
} from '@mui/material';
import {
    GetApp as ExportIcon,
    TableChart as ExcelIcon,
    PictureAsPdf as PdfIcon,
    Assessment as CsvIcon,
    KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { pavimentationService } from '../../services/pavimentationService';
import { StatusUtils, EXPORT_CONFIG } from '../../constants/pavimentationTypes';
import { notifySuccess, notifyError } from '../../../../components/common/Toaster/ThemedToaster';

/**
 * Componente para exportação de dados de pavimentações
 */
const ExportButton = ({
    data = [],
    status,
    filters = {},
    children = 'Exportar',
    variant = 'contained',
    size = 'medium',
    color = 'primary',
    disabled = false,
    showFormats = true,
    formats = ['excel', 'csv'],
    onExportStart,
    onExportComplete,
    onExportError,
    sx = {},
    ...buttonProps
}) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const open = Boolean(anchorEl);
    const statusConfig = StatusUtils.getStatusConfig(status);

    /**
     * Abrir menu de formatos
     */
    const handleClick = (event) => {
        if (showFormats && formats.length > 1) {
            setAnchorEl(event.currentTarget);
        } else {
            // Se só tem um formato, exportar diretamente
            const defaultFormat = formats[0] || 'excel';
            handleExport(defaultFormat);
        }
    };

    /**
     * Fechar menu
     */
    const handleClose = () => {
        setAnchorEl(null);
    };

    /**
     * Executar exportação
     */
    const handleExport = async (format) => {
        try {
            setLoading(true);
            setError(null);
            handleClose();

            if (onExportStart) {
                onExportStart(format);
            }

            console.log(`📊 Iniciando exportação: ${format}`);

            // Preparar dados para exportação
            const exportData = await pavimentationService.exportPavimentations(
                status,
                data,
                filters
            );

            if (!exportData.data || exportData.data.length === 0) {
                throw new Error('Nenhum dado disponível para exportação');
            }

            // Executar exportação baseada no formato
            switch (format) {
                case 'excel':
                    await exportToExcel(exportData);
                    break;
                case 'csv':
                    await exportToCsv(exportData);
                    break;
                case 'pdf':
                    await exportToPdf(exportData);
                    break;
                default:
                    throw new Error(`Formato não suportado: ${format}`);
            }

            notifySuccess(`Dados exportados com sucesso! (${exportData.filteredRecords} registros)`);

            if (onExportComplete) {
                onExportComplete(format, exportData);
            }

        } catch (err) {
            console.error('Erro na exportação:', err);
            setError(err.message);
            notifyError(`Erro na exportação: ${err.message}`);

            if (onExportError) {
                onExportError(format, err);
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Exportar para Excel
     */
    const exportToExcel = async (exportData) => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData.data);

        // Configurar larguras das colunas
        const colWidths = Object.keys(exportData.data[0] || {}).map(key => ({
            wch: Math.max(key.length, 15)
        }));
        ws['!cols'] = colWidths;

        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, exportData.sheetName);

        // Salvar arquivo
        XLSX.writeFile(wb, exportData.filename);
    };

    /**
     * Exportar para CSV
     */
    const exportToCsv = async (exportData) => {
        const ws = XLSX.utils.json_to_sheet(exportData.data);
        const csv = XLSX.utils.sheet_to_csv(ws);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', exportData.filename.replace('.xlsx', '.csv'));
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    /**
     * Exportar para PDF (implementação básica)
     */
    const exportToPdf = async (exportData) => {
        // Implementação básica - pode ser expandida com bibliotecas como jsPDF
        notifyError('Exportação para PDF ainda não implementada');
    };

    /**
     * Obter configuração do formato
     */
    const getFormatConfig = (format) => {
        const configs = {
            excel: {
                label: 'Excel (XLSX)',
                icon: ExcelIcon,
                description: 'Arquivo de Excel com formatação'
            },
            csv: {
                label: 'CSV',
                icon: CsvIcon,
                description: 'Arquivo de valores separados por vírgula'
            },
            pdf: {
                label: 'PDF',
                icon: PdfIcon,
                description: 'Documento PDF (em desenvolvimento)'
            }
        };

        return configs[format] || configs.excel;
    };

    /**
     * Verificar se há dados para exportar
     */
    const hasDataToExport = data && data.length > 0;

    return (
        <>
            <Tooltip
                title={
                    !hasDataToExport
                        ? 'Nenhum dado disponível para exportação'
                        : `Exportar ${data.length} ${data.length === 1 ? 'registro' : 'registros'}`
                }
            >
                <span>
                    <Button
                        variant={variant}
                        size={size}
                        color={color}
                        onClick={handleClick}
                        disabled={disabled || loading || !hasDataToExport}
                        startIcon={loading ? <CircularProgress size={16} /> : <ExportIcon />}
                        endIcon={showFormats && formats.length > 1 && <ArrowDownIcon />}
                        sx={sx}
                        {...buttonProps}
                    >
                        {loading ? 'Exportando...' : children}
                    </Button>
                </span>
            </Tooltip>

            {/* Menu de formatos */}
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: { minWidth: 220 }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                {/* Header do menu */}
                <Box sx={{ px: 2, py: 1, backgroundColor: 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Escolha o formato de exportação
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {data.length} {data.length === 1 ? 'registro' : 'registros'} • {statusConfig?.pluralLabel}
                    </Typography>
                </Box>

                <Divider />

                {/* Opções de formato */}
                {formats.map((format) => {
                    const config = getFormatConfig(format);
                    const IconComponent = config.icon;

                    return (
                        <MenuItem
                            key={format}
                            onClick={() => handleExport(format)}
                            disabled={loading}
                            sx={{ py: 1.5 }}
                        >
                            <ListItemIcon>
                                <IconComponent />
                            </ListItemIcon>
                            <ListItemText
                                primary={config.label}
                                secondary={config.description}
                                secondaryTypographyProps={{
                                    variant: 'caption',
                                    color: 'text.secondary'
                                }}
                            />
                        </MenuItem>
                    );
                })}

                {/* Informações adicionais */}
                <Divider />
                <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Os dados serão exportados com os filtros aplicados
                    </Typography>
                </Box>
            </Menu>

            {/* Snackbar de erro */}
            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setError(null)}
                    severity="error"
                    variant="filled"
                >
                    {error}
                </Alert>
            </Snackbar>
        </>
    );
};

/**
 * Componente simplificado para exportação rápida
 */
export const QuickExportButton = ({ data, status, ...props }) => (
    <ExportButton
        data={data}
        status={status}
        showFormats={false}
        formats={['excel']}
        variant="outlined"
        size="small"
        {...props}
    >
        Excel
    </ExportButton>
);

/**
 * Hook para exportação programática
 */
export const useExport = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const exportData = async (data, status, format = 'excel', filters = {}) => {
        try {
            setLoading(true);
            setError(null);

            const exportData = await pavimentationService.exportPavimentations(
                status,
                data,
                filters
            );

            if (format === 'excel') {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(exportData.data);
                XLSX.utils.book_append_sheet(wb, ws, exportData.sheetName);
                XLSX.writeFile(wb, exportData.filename);
            }

            return exportData;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        exportData,
        loading,
        error,
        clearError: () => setError(null)
    };
};

export default ExportButton;