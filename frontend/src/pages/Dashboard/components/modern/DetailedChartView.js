import React, { useState, useMemo, useEffect } from 'react';
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
import {
    ShowChart as ShowChartIcon,
    TableChart as TableChartIcon,
    FileDownload as FileDownloadIcon,
    BarChart as BarChartIcon,
    ChevronRight as ChevronRightIcon
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
const DetailedChartView = ({ data, selectedCategory, initialChartId }) => {
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
                // (varrer todas as linhas para não excluir charts onde a 1ª linha tem nulos, ex: duration_bar)
                const cols = viewData.columns || [];
                const hasChartData = cols.some(col =>
                    viewData.data.some(row => {
                        const val = row[col];
                        return typeof val === 'number' || (val !== null && val !== undefined && !isNaN(parseFloat(val)));
                    })
                );
                if (!hasChartData) return;
                views.push({ id: viewId, category, name: viewData?.name || viewId, viewData });
            });
        });
        return views;
    }, [data]);

    // Scroll para o topo quando o componente monta (vindo da Visão Geral)
    useEffect(() => {
        const main = document.querySelector('main');
        if (main) main.scrollTo({ top: 0, behavior: 'instant' });
        else window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Selecionar automaticamente o gráfico quando vindo da Visão Geral
    useEffect(() => {
        if (!initialChartId || !availableViews.length) return;
        const view = availableViews.find(v => v.id === initialChartId);
        if (!view) return;
        setActiveViewId(initialChartId);
        const cats = new Set(availableViews.map(v => v.category));
        if (cats.size > 1) setActiveName(view.name);
    }, [initialChartId, availableViews]); // eslint-disable-line react-hooks/exhaustive-deps

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

                {/* ── Barra de títulos no topo ── */}
                {isGrouped ? (
                    <>
                        {/* Nível 1 */}
                        <Box sx={{
                            borderBottom: 1, borderColor: 'divider',
                            backgroundColor: alpha(theme.palette.primary.main, 0.02),
                            px: 2, py: 1.5,
                            display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center'
                        }}>
                            <BarChartIcon sx={{ fontSize: 15, color: theme.palette.text.disabled, mr: 0.5 }} />
                            {uniqueNames.map((name, idx) => {
                                const isActive = activeName === name;
                                return (
                                    <Box
                                        key={name}
                                        onClick={() => handleNameClick(name)}
                                        sx={{
                                            display: 'flex', alignItems: 'center', gap: 0.75,
                                            px: 1.5, py: 0.6,
                                            borderRadius: 2,
                                            cursor: 'pointer',
                                            border: `1px solid`,
                                            borderColor: isActive ? theme.palette.primary.main : alpha(theme.palette.divider, 0.5),
                                            backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                            transition: 'all 0.15s ease',
                                            '&:hover': {
                                                borderColor: theme.palette.primary.main,
                                                backgroundColor: alpha(theme.palette.primary.main, isActive ? 0.14 : 0.05),
                                            }
                                        }}
                                    >
                                        <Box sx={{
                                            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: isActive ? theme.palette.primary.main : alpha(theme.palette.text.disabled, 0.2),
                                            transition: 'background-color 0.15s'
                                        }}>
                                            <Typography sx={{ fontSize: 9, fontWeight: 700, color: isActive ? '#fff' : theme.palette.text.secondary, lineHeight: 1 }}>
                                                {idx + 1}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{
                                            fontWeight: isActive ? 600 : 400,
                                            fontSize: '0.8rem',
                                            color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                        }}>
                                            {name}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>

                        {/* Nível 2 */}
                        {activeName && viewsForActiveName.length > 1 && (
                            <Box sx={{
                                borderBottom: 1, borderColor: 'divider',
                                backgroundColor: alpha(theme.palette.secondary.main, 0.02),
                                px: 2, py: 1,
                                display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center'
                            }}>
                                <Typography variant="caption" color="text.disabled" sx={{ mr: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {activeName}:
                                </Typography>
                                {viewsForActiveName.map(view => {
                                    const catInfo = DASHBOARD_CATEGORIES[view.category];
                                    const isActiveSub = activeViewId === view.id;
                                    return (
                                        <Box
                                            key={view.id}
                                            onClick={() => setActiveViewId(view.id)}
                                            sx={{
                                                display: 'flex', alignItems: 'center', gap: 0.5,
                                                px: 1.25, py: 0.5, borderRadius: 2, cursor: 'pointer',
                                                border: '1px solid',
                                                borderColor: isActiveSub ? theme.palette.secondary.main : alpha(theme.palette.divider, 0.5),
                                                backgroundColor: isActiveSub ? alpha(theme.palette.secondary.main, 0.1) : 'transparent',
                                                transition: 'all 0.15s',
                                                '&:hover': { borderColor: theme.palette.secondary.main, backgroundColor: alpha(theme.palette.secondary.main, 0.06) }
                                            }}
                                        >
                                            <Typography variant="caption" sx={{
                                                fontWeight: isActiveSub ? 600 : 400,
                                                color: isActiveSub ? theme.palette.secondary.main : theme.palette.text.secondary
                                            }}>
                                                {catInfo?.name || view.category}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </>
                ) : (
                    <Box sx={{
                        borderBottom: 1, borderColor: 'divider',
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                        px: 2, py: 1.5,
                        display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center'
                    }}>
                        <BarChartIcon sx={{ fontSize: 15, color: theme.palette.text.disabled, mr: 0.5 }} />
                        {availableViews.map((view, idx) => {
                            const isActive = activeViewId === view.id;
                            return (
                                <Box
                                    key={view.id}
                                    onClick={() => setActiveViewId(prev => prev === view.id ? null : view.id)}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 0.75,
                                        px: 1.5, py: 0.6,
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        border: '1px solid',
                                        borderColor: isActive ? theme.palette.primary.main : alpha(theme.palette.divider, 0.5),
                                        backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                        transition: 'all 0.15s ease',
                                        '&:hover': {
                                            borderColor: theme.palette.primary.main,
                                            backgroundColor: alpha(theme.palette.primary.main, isActive ? 0.14 : 0.05),
                                        }
                                    }}
                                >
                                    <Box sx={{
                                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        backgroundColor: isActive ? theme.palette.primary.main : alpha(theme.palette.text.disabled, 0.2),
                                        transition: 'background-color 0.15s'
                                    }}>
                                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: isActive ? '#fff' : theme.palette.text.secondary, lineHeight: 1 }}>
                                            {idx + 1}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{
                                        fontWeight: isActive ? 600 : 400,
                                        fontSize: '0.8rem',
                                        color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                                    }}>
                                        {view.name}
                                    </Typography>
                                    {view.viewData?.total != null && (
                                        <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: '0.68rem' }}>
                                            {view.viewData.total}
                                        </Typography>
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* ── Conteúdo (gráfico + tabela) ── */}
                <AnimatePresence mode="sync">
                    {activeViewId && singleViewData ? (
                        <motion.div
                            key={activeViewId}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                        >
                            {/* Cabeçalho do gráfico */}
                            <Box sx={{
                                px: 2.5, py: 1.25,
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                backgroundColor: alpha(theme.palette.primary.main, 0.03),
                                display: 'flex', alignItems: 'center', gap: 1.5
                            }}>
                                <ShowChartIcon sx={{ fontSize: 17, color: theme.palette.primary.main }} />
                                <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                                    {currentView?.name}
                                </Typography>
                                <Chip
                                    label={`${currentView?.data?.length ?? 0} registos`}
                                    size="small"
                                    sx={{
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main,
                                        fontWeight: 600, fontSize: '0.7rem', height: 22
                                    }}
                                />
                            </Box>

                            <Box sx={{ p: 2 }}>
                                <ChartContainer
                                    data={singleViewData}
                                    viewMode="detailed"
                                    selectedCategory={selectedCategory}
                                />
                            </Box>

                            {/* Cabeçalho da tabela */}
                            <Box sx={{
                                px: 2.5, py: 1.25,
                                borderTop: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                                backgroundColor: alpha(theme.palette.background.default, 0.5),
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TableChartIcon sx={{ fontSize: 15, color: theme.palette.secondary.main }} />
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
                                <ShowChartIcon sx={{ fontSize: 48, color: alpha(theme.palette.primary.main, 0.2), mb: 2 }} />
                                <Typography variant="body1" fontWeight={500}>
                                    Selecione um gráfico acima para visualizar
                                </Typography>
                                <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.7 }}>
                                    {availableViews.length} gráfico{availableViews.length !== 1 ? 's' : ''} disponível{availableViews.length !== 1 ? 'is' : ''}
                                </Typography>
                            </Box>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Paper>
        </motion.div>
    );
};

export default DetailedChartView;
