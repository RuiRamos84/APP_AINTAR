import React, { useState, useMemo } from 'react';
import {
    Paper,
    Typography,
    Box,
    useTheme,
    alpha,
    Tabs,
    Tab,
    IconButton,
    Tooltip,
    Button
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
    FileDownload as FileDownloadIcon,
    TableChart as TableChartIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

/**
 * Componente de visualização de dados em tabela
 * Usa MUI DataGrid para tabelas interativas e profissionais
 */
const DataTableView = ({ data, selectedCategory }) => {
    const theme = useTheme();
    const [selectedView, setSelectedView] = useState(0);

    // Processar views disponíveis
    const availableViews = useMemo(() => {
        if (!data) return [];

        const views = [];
        Object.entries(data).forEach(([category, categoryData]) => {
            if (!categoryData?.views) return;

            Object.entries(categoryData.views).forEach(([viewId, viewData]) => {
                if (viewData?.data && viewData.data.length > 0) {
                    views.push({
                        id: viewId,
                        category,
                        name: viewData.name || viewId,
                        data: viewData.data,
                        columns: viewData.columns || []
                    });
                }
            });
        });

        return views;
    }, [data]);

    const currentView = availableViews[selectedView];

    // Preparar colunas para DataGrid
    const gridColumns = useMemo(() => {
        if (!currentView || !currentView.data || currentView.data.length === 0) return [];

        const firstRow = currentView.data[0];
        const columns = Object.keys(firstRow).map((key) => {
            const isNumeric = typeof firstRow[key] === 'number';

            return {
                field: key,
                headerName: formatColumnName(key),
                flex: 1,
                minWidth: 150,
                type: isNumeric ? 'number' : 'string',
                align: isNumeric ? 'right' : 'left',
                headerAlign: isNumeric ? 'right' : 'left',
                valueFormatter: isNumeric
                    ? (params) => {
                        if (params.value == null) return '';
                        return Number(params.value).toLocaleString('pt-PT');
                    }
                    : undefined
            };
        });

        return columns;
    }, [currentView]);

    // Preparar linhas para DataGrid
    const gridRows = useMemo(() => {
        if (!currentView || !currentView.data) return [];

        return currentView.data.map((row, index) => ({
            id: index,
            ...row
        }));
    }, [currentView]);

    // Exportar para Excel
    const handleExportExcel = () => {
        if (!currentView || !currentView.data) return;

        const worksheet = XLSX.utils.json_to_sheet(currentView.data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');

        const fileName = `${currentView.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    if (!availableViews || availableViews.length === 0) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <TableChartIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                    Nenhuma tabela disponível
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Selecione uma categoria ou ajuste os filtros
                </Typography>
            </Paper>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <Paper
                sx={{
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    overflow: 'hidden'
                }}
            >
                {/* Header com tabs */}
                <Box
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        backgroundColor: alpha(theme.palette.primary.main, 0.02)
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2 }}>
                        <Tabs
                            value={selectedView}
                            onChange={(e, newValue) => setSelectedView(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                            sx={{ flexGrow: 1 }}
                        >
                            {availableViews.map((view, index) => (
                                <Tab
                                    key={view.id}
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold">
                                                {view.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {view.data.length} registos
                                            </Typography>
                                        </Box>
                                    }
                                />
                            ))}
                        </Tabs>

                        {/* Botão de exportação */}
                        <Tooltip title="Exportar para Excel">
                            <IconButton
                                onClick={handleExportExcel}
                                sx={{
                                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.success.main, 0.2)
                                    }
                                }}
                            >
                                <FileDownloadIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Tabela de dados */}
                <Box sx={{ height: 600, width: '100%' }}>
                    <DataGrid
                        rows={gridRows}
                        columns={gridColumns}
                        pageSize={10}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                        disableSelectionOnClick
                        density="comfortable"
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-cell': {
                                borderColor: alpha(theme.palette.divider, 0.1)
                            },
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                borderBottom: `2px solid ${theme.palette.primary.main}`,
                                fontWeight: 'bold'
                            },
                            '& .MuiDataGrid-row:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.05)
                            },
                            '& .MuiDataGrid-footerContainer': {
                                borderTop: `2px solid ${alpha(theme.palette.divider, 0.2)}`,
                                backgroundColor: alpha(theme.palette.background.default, 0.5)
                            }
                        }}
                    />
                </Box>

                {/* Footer com estatísticas */}
                <Box
                    sx={{
                        p: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                        backgroundColor: alpha(theme.palette.background.default, 0.5),
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <Typography variant="body2" color="text.secondary">
                        <strong>{currentView?.data.length || 0}</strong> registos •{' '}
                        <strong>{gridColumns.length}</strong> colunas
                    </Typography>

                    <Button
                        size="small"
                        startIcon={<FileDownloadIcon />}
                        onClick={handleExportExcel}
                        variant="outlined"
                    >
                        Exportar Excel
                    </Button>
                </Box>
            </Paper>
        </motion.div>
    );
};

// Função auxiliar para formatar nomes de colunas
const formatColumnName = (name) => {
    // Capitalizar primeira letra e substituir underscores
    return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();
};

export default DataTableView;
