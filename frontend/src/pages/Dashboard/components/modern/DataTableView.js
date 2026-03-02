import React, { useState, useMemo } from 'react';
import {
    Paper,
    Typography,
    Box,
    useTheme,
    alpha,
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import {
    FileDownload as FileDownloadIcon,
    TableChart as TableChartIcon,
    NavigateBefore as NavigateBeforeIcon,
    NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';

/**
 * Dados tabulares com navegação em 2 níveis:
 * 1. Botões por nome único de view (ex: "Por estado")
 * 2. Ao clicar, aparecem sub-botões por categoria (ex: Fossa | Ramal | Repavimentações)
 * 3. Ao clicar numa categoria, mostra a tabela correspondente
 */
const DataTableView = ({ data, selectedCategory }) => {
    const theme = useTheme();
    const [activeName, setActiveName] = useState(null);
    const [activeViewId, setActiveViewId] = useState(null);

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

    // Nomes únicos (preservando ordem de aparecimento)
    const uniqueNames = useMemo(() => {
        const seen = new Set();
        return availableViews
            .map(v => v.name)
            .filter(name => { if (seen.has(name)) return false; seen.add(name); return true; });
    }, [availableViews]);

    // Quando se clica num nome, seleccionar automaticamente a primeira categoria
    const handleNameClick = (name) => {
        setActiveName(name);
        const firstView = availableViews.find(v => v.name === name);
        setActiveViewId(firstView ? firstView.id : null);
    };

    // Views que correspondem ao nome activo
    const viewsForName = useMemo(() => {
        if (!activeName) return [];
        return availableViews.filter(v => v.name === activeName);
    }, [availableViews, activeName]);

    // View actualmente seleccionada para mostrar tabela
    const currentView = useMemo(() => {
        if (!activeViewId) return null;
        return availableViews.find(v => v.id === activeViewId) || null;
    }, [availableViews, activeViewId]);

    // Colunas DataGrid
    const gridColumns = useMemo(() => {
        if (!currentView?.data?.length) return [];
        const firstRow = currentView.data[0];
        const PRIORITY_KEYS = ['municipio', 'município', 'municipio_nome', 'município_nome', 'concelho'];
        const PARAM_KEYS = ['parametro', 'parâmetro', 'parametro_nome', 'parâmetro_nome', 'parameter'];
        const ANO_KEYS = ['ano', 'year'];
        const MES_KEYS = ['mes', 'mês', 'month'];
        const TOTAL_KEYS = ['total'];
        const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const keys = Object.keys(firstRow);
        const isParam = k => PARAM_KEYS.some(p => normalize(k) === normalize(p));
        const isTipo = k => normalize(k).includes('tipo');
        const isUtilizador = k => normalize(k).includes('utilizador') || normalize(k).includes('user');
        const isPasso = k => normalize(k).includes('passo') || normalize(k).includes('step');
        const isAno = k => ANO_KEYS.includes(k.toLowerCase());
        const isMes = k => MES_KEYS.includes(k.toLowerCase());
        const isTotal = k => TOTAL_KEYS.includes(k.toLowerCase());
        const isMunicipioKey = k => PRIORITY_KEYS.some(p => normalize(k) === normalize(p));
        const viewNameNorm = normalize(currentView.name || '');
        const isPorTipo = viewNameNorm.includes('por tipo');
        const isPorUtilizador = viewNameNorm.includes('por utilizador') || viewNameNorm.includes('por user') || viewNameNorm.includes('tecnico') || viewNameNorm.includes('tecnica');
        const isPorPasso = viewNameNorm.includes('passo') || viewNameNorm.includes('step');
        // Ordem: (passo | utilizador | tipo conforme vista) → parâmetro → município → ano → mes → resto → total
        const sortedKeys = [
            ...(isPorPasso ? keys.filter(k => isPasso(k)) : []),
            ...(isPorUtilizador ? keys.filter(k => isUtilizador(k)) : []),
            ...(isPorTipo ? keys.filter(k => isTipo(k)) : []),
            ...keys.filter(k => isParam(k)),
            ...keys.filter(k => isMunicipioKey(k)),
            ...keys.filter(k => isAno(k)),
            ...keys.filter(k => isMes(k)),
            ...keys.filter(k =>
                (!isPorPasso || !isPasso(k)) &&
                (!isPorUtilizador || !isUtilizador(k)) &&
                (!isPorTipo || !isTipo(k)) &&
                !isParam(k) && !isMunicipioKey(k) && !isAno(k) && !isMes(k) && !isTotal(k)
            ),
            ...keys.filter(k => isTotal(k))
        ];
        const isTwoCols = sortedKeys.length === 2;
        return sortedKeys.map((key) => {
            // Procurar primeiro valor não-nulo para detectar tipo correcto
            const firstNonNull = currentView.data.find(r => r[key] !== null && r[key] !== undefined);
            const sample = firstNonNull ? firstNonNull[key] : null;
            const isNumeric = typeof sample === 'number';
            const isMunicipio = isMunicipioKey(key);
            return {
                field: key,
                headerName: formatColumnName(key),
                ...(isTwoCols
                    ? { flex: 1, minWidth: 150 }
                    : { flex: 1, minWidth: 150 }),
                type: isNumeric ? 'number' : 'string',
                align: isTwoCols ? 'center' : (isNumeric ? 'right' : 'left'),
                headerAlign: isTwoCols ? 'center' : (isNumeric ? 'right' : 'left'),
                valueFormatter: isNumeric
                    ? (value) => value == null ? '' : Number(value).toLocaleString('pt-PT')
                    : isMunicipio
                        ? (value) => value == null ? '' : String(value).split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                        : (value) => value == null ? '' : String(value).charAt(0).toUpperCase() + String(value).slice(1).toLowerCase()
            };
        });
    }, [currentView]);

    // Linhas DataGrid
    const gridRows = useMemo(() => {
        if (!currentView?.data) return [];
        return currentView.data.map((row, i) => ({ id: i, ...row }));
    }, [currentView]);

    // Exportar Excel
    const handleExportExcel = () => {
        if (!currentView?.data) return;
        const worksheet = XLSX.utils.json_to_sheet(currentView.data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
        XLSX.writeFile(workbook, `${currentView.name}_${currentView.category}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (!availableViews.length) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <TableChartIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Nenhuma tabela disponível</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Selecione uma categoria ou ajuste os filtros
                </Typography>
            </Paper>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <Paper sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, overflow: 'hidden' }}>

                {/* Nível 1 — nomes únicos */}
                <Box sx={{
                    borderBottom: 1, borderColor: 'divider',
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    px: 2, py: 1.5,
                    display: 'flex', flexWrap: 'wrap', gap: 1
                }}>
                    {uniqueNames.map((name) => (
                        <Chip
                            key={name}
                            label={name}
                            size="small"
                            onClick={() => handleNameClick(name)}
                            variant={activeName === name ? 'filled' : 'outlined'}
                            sx={{
                                fontWeight: activeName === name ? 'bold' : 'normal',
                                borderColor: activeName === name
                                    ? theme.palette.primary.main
                                    : alpha(theme.palette.divider, 0.5),
                                backgroundColor: activeName === name
                                    ? alpha(theme.palette.primary.main, 0.12)
                                    : 'transparent',
                                color: activeName === name
                                    ? theme.palette.primary.main
                                    : theme.palette.text.secondary,
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) }
                            }}
                        />
                    ))}
                </Box>

                {/* Nível 2 — sub-botões por categoria (só aparece após clicar num nome) */}
                {activeName && viewsForName.length > 0 && (
                    <Box sx={{
                        borderBottom: 1, borderColor: 'divider',
                        backgroundColor: alpha(theme.palette.secondary.main, 0.02),
                        px: 2, py: 1,
                        display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center'
                    }}>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {activeName}:
                        </Typography>
                        {viewsForName.map((view) => (
                            <Chip
                                key={view.id}
                                label={
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <Typography variant="caption" fontWeight="bold" lineHeight={1.3} sx={{ textTransform: 'capitalize' }}>
                                            {view.category}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontSize: '0.62rem', opacity: 0.7 }}>
                                            {view.data.length} registos
                                        </Typography>
                                    </Box>
                                }
                                onClick={() => setActiveViewId(view.id)}
                                variant={activeViewId === view.id ? 'filled' : 'outlined'}
                                sx={{
                                    height: 'auto',
                                    fontWeight: activeViewId === view.id ? 'bold' : 'normal',
                                    borderColor: activeViewId === view.id
                                        ? theme.palette.secondary.main
                                        : alpha(theme.palette.divider, 0.5),
                                    backgroundColor: activeViewId === view.id
                                        ? alpha(theme.palette.secondary.main, 0.12)
                                        : 'transparent',
                                    color: activeViewId === view.id
                                        ? theme.palette.secondary.main
                                        : theme.palette.text.secondary,
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: alpha(theme.palette.secondary.main, 0.08) },
                                    '& .MuiChip-label': { px: 1.5, py: 0.4 }
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Tabela */}
                {currentView ? (
                    <>
                        <Box sx={{
                            px: 2, py: 1,
                            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                            backgroundColor: alpha(theme.palette.background.default, 0.4),
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <Typography variant="body2" color="text.secondary">
                                <strong>{currentView.data.length}</strong> registos •{' '}
                                <strong>{gridColumns.length}</strong> colunas
                            </Typography>
                            <Tooltip title="Exportar para Excel">
                                <IconButton
                                    size="small"
                                    onClick={handleExportExcel}
                                    sx={{
                                        backgroundColor: alpha(theme.palette.success.main, 0.1),
                                        '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.2) }
                                    }}
                                >
                                    <FileDownloadIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>

                        <Box sx={{ height: 520, width: '100%' }}>
                            <DataGrid
                                rows={gridRows}
                                columns={gridColumns}
                                pageSize={10}
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                disableSelectionOnClick
                                density="comfortable"
                                hideFooter
                                sx={{
                                    border: 'none',
                                    '& .MuiDataGrid-cell': { borderColor: alpha(theme.palette.divider, 0.1) },
                                    '& .MuiDataGrid-columnHeaders': {
                                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                                        borderBottom: `2px solid ${theme.palette.primary.main}`,
                                        fontWeight: 'bold'
                                    },
                                    '& .MuiDataGrid-row:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) }
                                }}
                            />
                        </Box>

                        {/* Footer customizado — navegação entre secções */}
                        {viewsForName.length > 1 && (() => {
                            const currentIdx = viewsForName.findIndex(v => v.id === activeViewId);
                            const hasPrev = currentIdx > 0;
                            const hasNext = currentIdx < viewsForName.length - 1;
                            return (
                                <Box sx={{
                                    borderTop: `2px solid ${alpha(theme.palette.divider, 0.2)}`,
                                    backgroundColor: alpha(theme.palette.background.default, 0.5),
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: 2, py: 1
                                }}>
                                    <IconButton
                                        size="small"
                                        disabled={!hasPrev}
                                        onClick={() => setActiveViewId(viewsForName[currentIdx - 1].id)}
                                    >
                                        <NavigateBeforeIcon />
                                    </IconButton>
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>{currentIdx + 1}</strong> de <strong>{viewsForName.length}</strong>
                                        {' '}— <strong>{viewsForName[currentIdx]?.category}</strong>
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        disabled={!hasNext}
                                        onClick={() => setActiveViewId(viewsForName[currentIdx + 1].id)}
                                    >
                                        <NavigateNextIcon />
                                    </IconButton>
                                </Box>
                            );
                        })()}
                    </>
                ) : activeName ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Seleciona uma categoria acima para ver a tabela
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Seleciona uma vista acima para começar
                        </Typography>
                    </Box>
                )}
            </Paper>
        </motion.div>
    );
};

const formatColumnName = (name) => {
    return name
        .split(/[_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        .trim();
};

export default DataTableView;
