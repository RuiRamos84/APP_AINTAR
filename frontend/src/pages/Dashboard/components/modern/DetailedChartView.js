import React, { useState, useMemo } from 'react';
import {
    Paper,
    Typography,
    Box,
    useTheme,
    alpha,
    Chip,
    IconButton,
    Tooltip,
    Divider
} from '@mui/material';
import {
    ShowChart as ShowChartIcon,
    TableChart as TableChartIcon,
    FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import ChartContainer from './ChartContainer';
import { DASHBOARD_CATEGORIES } from '../../constants';

const formatColumnName = (name) =>
    name.split(/[_\s]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
        .trim();

/**
 * Análise Detalhada: painel de chips com títulos dos gráficos.
 * Ao clicar num título: gráfico em cima + tabela de dados em baixo.
 */
const DetailedChartView = ({ data, selectedCategory }) => {
    const theme = useTheme();
    const [activeViewId, setActiveViewId] = useState(null);
    const [activeName, setActiveName] = useState(null); // para modo agrupado (nível 1)

    // Lista de views disponíveis (exclui views sem dados ou sem gráfico não nulo)
    const availableViews = useMemo(() => {
        if (!data) return [];
        const views = [];
        Object.entries(data).forEach(([category, categoryData]) => {
            if (!categoryData?.views) return;
            Object.entries(categoryData.views).forEach(([viewId, viewData]) => {
                if (!viewData?.data || viewData.data.length === 0) return;
                // Verificar que existe pelo menos uma coluna com valor numérico não nulo
                const cols = viewData.columns || [];
                const firstRow = viewData.data[0];
                const hasChartData = cols.some(col => {
                    const val = firstRow?.[col];
                    return typeof val === 'number' || (val !== null && val !== undefined && !isNaN(parseFloat(val)));
                });
                if (!hasChartData) return;
                views.push({ id: viewId, category, name: viewData?.name || viewId, viewData });
            });
        });
        return views;
    }, [data]);

    // Detectar se há múltiplas categorias (modo agrupado)
    const categories = useMemo(() => {
        const seen = new Set();
        availableViews.forEach(v => seen.add(v.category));
        return [...seen];
    }, [availableViews]);
    const isGrouped = categories.length > 1;

    // Nomes únicos para o modo agrupado (preserva ordem de aparecimento)
    const uniqueNames = useMemo(() => {
        if (!isGrouped) return [];
        const seen = new Set();
        return availableViews
            .map(v => v.name)
            .filter(name => { if (seen.has(name)) return false; seen.add(name); return true; });
    }, [availableViews, isGrouped]);

    // Views que correspondem ao nome activo (modo agrupado)
    const viewsForActiveName = useMemo(() => {
        if (!activeName) return [];
        return availableViews.filter(v => v.name === activeName);
    }, [availableViews, activeName]);

    // Clicar num nome no modo agrupado
    const handleNameClick = (name) => {
        if (activeName === name) {
            // fechar
            setActiveName(null);
            setActiveViewId(null);
            return;
        }
        setActiveName(name);
        const matches = availableViews.filter(v => v.name === name);
        // Seleccionar sempre o primeiro automaticamente; sub-botões permitem trocar
        setActiveViewId(matches.length > 0 ? matches[0].id : null);
    };

    // Dados da view activa para o gráfico
    const singleViewData = useMemo(() => {
        if (!activeViewId) return null;
        const view = availableViews.find(v => v.id === activeViewId);
        if (!view) return null;
        return { [view.category]: { views: { [view.id]: view.viewData } } };
    }, [activeViewId, availableViews]);

    // View activa (objecto completo)
    const currentView = useMemo(() => {
        if (!activeViewId) return null;
        const v = availableViews.find(v => v.id === activeViewId);
        if (!v?.viewData) return null;
        return {
            id: v.id,
            category: v.category,
            name: v.name,
            data: v.viewData.data || [],
            columns: v.viewData.columns || []
        };
    }, [activeViewId, availableViews]);

    // Colunas para o DataGrid
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
            const firstNonNull = currentView.data.find(r => r[key] !== null && r[key] !== undefined);
            const sample = firstNonNull ? firstNonNull[key] : null;
            const isNumeric = typeof sample === 'number';
            const isMunicipio = isMunicipioKey(key);
            return {
                field: key,
                headerName: formatColumnName(key),
                flex: 1,
                minWidth: 150,
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

    // Linhas para o DataGrid
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
        XLSX.writeFile(workbook, `${currentView.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (!availableViews.length) {
        return (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
                <ShowChartIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">Nenhum gráfico disponível</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Selecione uma categoria ou ajuste os filtros
                </Typography>
            </Paper>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
            <Paper sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, overflow: 'hidden' }}>

                {/* Painel de títulos — 2 níveis (agrupado) ou flat (uma categoria) */}
                {isGrouped ? (
                    <>
                        {/* Nível 1 — nomes únicos */}
                        <Box sx={{
                            borderBottom: 1, borderColor: 'divider',
                            backgroundColor: alpha(theme.palette.primary.main, 0.02),
                            px: 2, py: 1.5,
                            display: 'flex', flexWrap: 'wrap', gap: 1
                        }}>
                            {uniqueNames.map(name => (
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

                        {/* Nível 2 — sub-botões por categoria (só quando o título existe em múltiplas) */}
                        {activeName && viewsForActiveName.length > 1 && (
                            <Box sx={{
                                borderBottom: 1, borderColor: 'divider',
                                backgroundColor: alpha(theme.palette.secondary.main, 0.02),
                                px: 2, py: 1,
                                display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center'
                            }}>
                                <Typography variant="caption" color="text.secondary" sx={{
                                    mr: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5
                                }}>
                                    {activeName}:
                                </Typography>
                                {viewsForActiveName.map(view => {
                                    const catInfo = DASHBOARD_CATEGORIES[view.category];
                                    return (
                                        <Chip
                                            key={view.id}
                                            label={catInfo?.name || view.category}
                                            size="small"
                                            onClick={() => setActiveViewId(view.id)}
                                            variant={activeViewId === view.id ? 'filled' : 'outlined'}
                                            sx={{
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
                                                '&:hover': { backgroundColor: alpha(theme.palette.secondary.main, 0.08) }
                                            }}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    </>
                ) : (
                    // Modo flat: uma só categoria
                    <Box sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                        px: 2,
                        py: 1.5,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1
                    }}>
                        {availableViews.map((view) => (
                            <Chip
                                key={view.id}
                                label={view.name}
                                size="small"
                                onClick={() => setActiveViewId(prev => prev === view.id ? null : view.id)}
                                variant={activeViewId === view.id ? 'filled' : 'outlined'}
                                sx={{
                                    fontWeight: activeViewId === view.id ? 'bold' : 'normal',
                                    borderColor: activeViewId === view.id
                                        ? theme.palette.primary.main
                                        : alpha(theme.palette.divider, 0.5),
                                    backgroundColor: activeViewId === view.id
                                        ? alpha(theme.palette.primary.main, 0.12)
                                        : 'transparent',
                                    color: activeViewId === view.id
                                        ? theme.palette.primary.main
                                        : theme.palette.text.secondary,
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.08) }
                                }}
                            />
                        ))}
                    </Box>
                )}

                {/* Conteúdo (gráfico + tabela) */}
                <AnimatePresence mode="sync">
                    {activeViewId && singleViewData ? (
                        <motion.div
                            key={activeViewId}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                        >
                            {/* Gráfico */}
                            <Box sx={{
                                px: 2, pt: 1, pb: 0,
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                                display: 'flex', alignItems: 'center', gap: 1
                            }}>
                                <ShowChartIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                                <Typography variant="body2" fontWeight={600} color="text.secondary">
                                    {currentView?.name}
                                </Typography>
                            </Box>

                            <Box sx={{ p: 2 }}>
                                <ChartContainer
                                    data={singleViewData}
                                    viewMode="detailed"
                                    selectedCategory={selectedCategory}
                                />
                            </Box>

                            {/* Separador */}
                            <Divider />

                            {/* Cabeçalho da tabela */}
                            <Box sx={{
                                px: 2, py: 1,
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.15)}`,
                                backgroundColor: alpha(theme.palette.background.default, 0.4),
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TableChartIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
                                    <Typography variant="body2" color="text.secondary">
                                        <strong>{currentView?.data?.length ?? 0}</strong> registos •{' '}
                                        <strong>{gridColumns.length}</strong> colunas
                                    </Typography>
                                </Box>
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

                            {/* Tabela */}
                            <Box sx={{ height: 480, width: '100%' }}>
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
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                        >
                            <Box sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
                                <ShowChartIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
                                <>
                                        <Typography variant="body1" fontWeight={500}>
                                            Selecione um gráfico acima para visualizar
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.7 }}>
                                            {availableViews.length} gráfico{availableViews.length !== 1 ? 's' : ''} disponível{availableViews.length !== 1 ? 'is' : ''}
                                        </Typography>
                                    </>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Paper>
        </motion.div>
    );
};

export default DetailedChartView;
