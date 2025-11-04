import React, { useMemo } from 'react';
import { Paper, Typography, Box, useTheme, alpha, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { motion } from 'framer-motion';

/**
 * Container de gráficos - Renderiza visualizações baseadas nos dados
 */
const ChartContainer = ({ data, viewMode, selectedCategory }) => {
    const theme = useTheme();

    // Cores para gráficos
    const COLORS = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.info.main,
        alpha(theme.palette.primary.main, 0.7),
        alpha(theme.palette.secondary.main, 0.7)
    ];

    // Processar dados para visualização
    const processedCharts = useMemo(() => {
        if (!data) return [];

        const charts = [];

        Object.entries(data).forEach(([category, categoryData]) => {
            if (!categoryData?.views) return;

            Object.entries(categoryData.views).forEach(([viewId, viewData]) => {
                if (!viewData?.data || viewData.data.length === 0) return;

                console.log('='.repeat(80));
                console.log(`📊 VIEW: ${viewData.name || viewId}`);
                console.log('📋 Colunas disponíveis:', viewData.columns);
                console.log('📦 Exemplo de dados (primeiros 3):');
                console.log(viewData.data.slice(0, 3));
                console.log('🔢 Total de registos:', viewData.data.length);
                console.log('='.repeat(80));

                // Determinar melhor tipo de gráfico baseado nos dados
                const chartType = determineChartType(viewData);

                charts.push({
                    id: viewId,
                    category,
                    name: viewData.name || viewId,
                    chartType,
                    data: viewData.data,
                    columns: viewData.columns || [],
                    total: viewData.total
                });
            });
        });

        return charts;
    }, [data]);

    // Renderizar gráfico individual
    const renderChart = (chart) => {
        const { chartType, data: chartData, columns, name } = chart;

        // Preparar dados para o gráfico
        const preparedData = prepareChartData(chartData, columns, chartType);

        if (!preparedData || preparedData.length === 0) {
            return (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Sem dados para visualizar
                    </Typography>
                </Box>
            );
        }

        // Selecionar componente de gráfico
        switch (chartType) {
            case 'bar':
                return renderBarChart(preparedData, columns);
            case 'line':
                return renderLineChart(preparedData, columns);
            case 'pie':
                return renderPieChart(preparedData);
            case 'area':
                return renderAreaChart(preparedData, columns);
            default:
                return renderBarChart(preparedData, columns);
        }
    };

    // Renderizar gráfico de barras
    const renderBarChart = (data, columns) => {
        const dataKeys = getDataKeys(data, columns);

        return (
            <ResponsiveContainer width="100%" height={450}>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis tick={{ fill: theme.palette.text.secondary }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 8
                        }}
                    />
                    <Legend />
                    {dataKeys.map((key, index) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            name={formatColumnName(key)}
                            fill={COLORS[index % COLORS.length]}
                            radius={[8, 8, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
    };

    // Renderizar gráfico de linhas
    const renderLineChart = (data, columns) => {
        const dataKeys = getDataKeys(data, columns);

        return (
            <ResponsiveContainer width="100%" height={450}>
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={90}
                        interval={0}
                    />
                    <YAxis tick={{ fill: theme.palette.text.secondary }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 8
                        }}
                    />
                    <Legend
                        verticalAlign="top"
                        height={36}
                        wrapperStyle={{ paddingBottom: '10px' }}
                    />
                    {dataKeys.map((key, index) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={formatColumnName(key)}
                            stroke={COLORS[index % COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    };

    // Renderizar gráfico de pizza
    const renderPieChart = (data) => {
        // Label customizado para melhor espaçamento
        const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
            const RADIAN = Math.PI / 180;
            // Aumentar a distância do label (outerRadius + 30)
            const radius = outerRadius + 30;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);

            // Só mostrar se a percentagem for > 2%
            if (percent < 0.02) return null;

            return (
                <text
                    x={x}
                    y={y}
                    fill={theme.palette.text.primary}
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    style={{ fontSize: '13px', fontWeight: '500' }}
                >
                    {`${name}: ${(percent * 100).toFixed(0)}%`}
                </text>
            );
        };

        // Calcular altura necessária baseado na quantidade de itens
        // Mais itens = altura maior para acomodar a legenda
        const calculateHeight = () => {
            if (data.length <= 4) return 450;
            if (data.length <= 6) return 520;
            if (data.length <= 8) return 580;
            return 650; // Para 9+ itens
        };

        // Posição vertical do gráfico - manter mais acima para dar espaço à legenda
        const calculateCy = () => {
            if (data.length <= 4) return "45%";
            if (data.length <= 6) return "38%";
            if (data.length <= 8) return "33%";
            return "28%"; // Para muitos itens, bem acima
        };

        // Ajustar raio do gráfico
        const calculateOuterRadius = () => {
            if (data.length <= 4) return 110;
            if (data.length <= 6) return 95;
            if (data.length <= 8) return 85;
            return 75;
        };

        // Quando há muitos itens (>6), mover legenda para o topo
        const legendPosition = data.length > 6 ? "top" : "bottom";
        const legendHeight = data.length > 6 ? 100 : 36;

        return (
            <ResponsiveContainer width="100%" height={calculateHeight()}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy={calculateCy()}
                        labelLine={{
                            stroke: theme.palette.text.secondary,
                            strokeWidth: 1
                        }}
                        label={renderCustomLabel}
                        outerRadius={calculateOuterRadius()}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 8
                        }}
                    />
                    <Legend
                        verticalAlign={legendPosition}
                        height={legendHeight}
                        wrapperStyle={{
                            paddingTop: legendPosition === 'top' ? '0px' : '20px',
                            paddingBottom: legendPosition === 'bottom' ? '0px' : '20px'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    // Renderizar gráfico de área
    const renderAreaChart = (data, columns) => {
        const dataKeys = getDataKeys(data, columns);

        return (
            <ResponsiveContainer width="100%" height={450}>
                <AreaChart data={data}>
                    <defs>
                        {dataKeys.map((key, index) => (
                            <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis tick={{ fill: theme.palette.text.secondary }} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 8
                        }}
                    />
                    <Legend />
                    {dataKeys.map((key, index) => (
                        <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={formatColumnName(key)}
                            stroke={COLORS[index % COLORS.length]}
                            fillOpacity={1}
                            fill={`url(#color${key})`}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        );
    };

    if (!processedCharts || processedCharts.length === 0) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary">
                    Nenhuma visualização disponível
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Selecione uma categoria ou ajuste os filtros
                </Typography>
            </Box>
        );
    }

    return (
        <Grid container spacing={3}>
            {processedCharts.map((chart, index) => (
                <Grid
                    size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}
                    key={chart.id}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                        <Paper
                            sx={{
                                p: 3,
                                height: '100%',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    boxShadow: theme.shadows[8],
                                    transform: 'translateY(-4px)'
                                }
                            }}
                        >
                            {/* Header do gráfico */}
                            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                                        {chart.name}
                                    </Typography>
                                    <Chip
                                        label={chart.chartType.toUpperCase()}
                                        size="small"
                                        sx={{
                                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                            color: theme.palette.primary.main,
                                            fontWeight: 'bold'
                                        }}
                                    />
                                </Box>
                                <Chip
                                    label={`${chart.total} registos`}
                                    size="small"
                                    variant="outlined"
                                />
                            </Box>

                            {/* Gráfico */}
                            {renderChart(chart)}
                        </Paper>
                    </motion.div>
                </Grid>
            ))}
        </Grid>
    );
};

// Funções auxiliares

const determineChartType = (viewData) => {
    const { data, columns, name } = viewData;

    if (!data || data.length === 0) return 'bar';

    const nameStr = (name || '').toLowerCase();

    // Determinar baseado no nome
    if (nameStr.includes('por ano') || nameStr.includes('por mês') || nameStr.includes('duração')) {
        return 'line';
    }
    if (nameStr.includes('por tipo') || nameStr.includes('por estado') && data.length <= 6) {
        return 'pie';
    }
    if (nameStr.includes('metros') || nameStr.includes('quantidade')) {
        return 'area';
    }

    // Determinar baseado na quantidade de dados
    if (data.length <= 6) {
        return 'pie';
    }

    return 'bar';
};

/**
 * Identifica automaticamente qual coluna contém os nomes/labels
 */
const identifyLabelColumn = (data, columns) => {
    if (!data || data.length === 0 || !columns || columns.length === 0) return null;

    const firstRow = data[0];

    // Lista de possíveis nomes de colunas de label (em ordem de prioridade)
    const labelKeywords = [
        'passo', 'município', 'municipio', 'concelho',
        'tipo de pedido', 'tipo', 'utilizador', 'user',
        'ano', 'year', 'mes', 'mês', 'month',
        'name', 'nome', 'categoria', 'category'
    ];

    // Procurar por match exato (case insensitive)
    for (const col of columns) {
        const colLower = col.toLowerCase().trim();
        if (labelKeywords.includes(colLower)) {
            return col;
        }
    }

    // Se não encontrou, pegar a primeira coluna não numérica
    for (const col of columns) {
        const value = firstRow[col];
        if (typeof value === 'string' || value === null || value === undefined) {
            return col;
        }
    }

    // Fallback: primeira coluna
    return columns[0];
};

/**
 * Identifica colunas de valores numéricos
 */
const identifyValueColumns = (data, columns, labelColumn) => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    const valueColumns = [];

    for (const col of columns) {
        if (col === labelColumn) continue;

        const value = firstRow[col];
        // Verificar se é número ou string que representa número
        if (typeof value === 'number' || !isNaN(parseFloat(value))) {
            valueColumns.push(col);
        }
    }

    return valueColumns;
};

/**
 * Formata o nome para exibição (remove prefixos, encurta, etc.)
 */
const formatLabel = (label, maxLength = 35) => {
    if (!label) return 'N/A';

    let formatted = String(label).trim();

    // Remover prefixos comuns
    formatted = formatted
        .replace(/^Município de /gi, '')
        .replace(/^Concelho de /gi, '')
        .replace(/^Pedido de /gi, '')
        .replace(/^Caixa: /gi, '')
        .replace(/^Ramal: /gi, '')
        .replace(/^ETAR - /gi, '')
        .replace(/^Rede: /gi, '');

    // Encurtar nomes muito longos
    if (formatted.length > maxLength) {
        formatted = formatted.substring(0, maxLength - 3) + '...';
    }

    return formatted;
};

/**
 * Formata o nome de uma coluna para exibição em legendas
 */
const formatColumnName = (columnName) => {
    if (!columnName) return '';

    let formatted = String(columnName).trim();

    // Simplificar nomes de colunas complexos
    // Ex: "Duração 2023 (dias)" -> "2023"
    // Ex: "Ramal - total" -> "Ramal (total)"

    // Se contém ano (4 dígitos), extrair apenas o ano
    const yearMatch = formatted.match(/\b(20\d{2})\b/);
    if (yearMatch && formatted.includes('Duração')) {
        return yearMatch[1]; // Retorna apenas o ano
    }

    // Simplificar formato "X - Y" para "X (Y)"
    if (formatted.includes(' - ')) {
        const parts = formatted.split(' - ');
        if (parts.length === 2) {
            formatted = `${parts[0]} (${parts[1]})`;
        }
    }

    // Remover texto entre parênteses se for muito descritivo
    // Ex: "Total (dias)" -> "Total"
    formatted = formatted.replace(/\s*\([^)]*dias[^)]*\)/gi, '');

    return formatted;
};

/**
 * Prepara dados para visualização em gráficos
 */
const prepareChartData = (data, columns, chartType) => {
    if (!data || data.length === 0) return [];

    console.log('🔍 prepareChartData:', { chartType, columns, dataLength: data.length });

    // Identificar coluna de label
    const labelColumn = identifyLabelColumn(data, columns);
    console.log('🏷️ Coluna de label identificada:', labelColumn);

    // Identificar colunas de valores
    const valueColumns = identifyValueColumns(data, columns, labelColumn);
    console.log('📊 Colunas de valores:', valueColumns);

    // Para gráfico de pizza
    if (chartType === 'pie') {
        // Para pie chart, usar apenas a primeira coluna de valor
        const valueColumn = valueColumns[0] || 'Total';

        return data.slice(0, 10).map(item => {
            const label = item[labelColumn];
            const value = parseFloat(item[valueColumn]) || 0;

            return {
                name: formatLabel(label),
                value: value
            };
        });
    }

    // Para outros gráficos (bar, line, area)
    return data.slice(0, 20).map(item => {
        const result = {
            name: formatLabel(item[labelColumn])
        };

        // Adicionar todos os valores numéricos
        valueColumns.forEach(col => {
            result[col] = parseFloat(item[col]) || 0;
        });

        return result;
    });
};

/**
 * Retorna as chaves de dados (colunas numéricas) excluindo a coluna de label
 */
const getDataKeys = (data, columns) => {
    if (!data || data.length === 0) return [];

    // Identificar coluna de label
    const labelColumn = identifyLabelColumn(data, columns);

    // Retornar colunas de valores
    return identifyValueColumns(data, columns, labelColumn);
};

export default ChartContainer;
