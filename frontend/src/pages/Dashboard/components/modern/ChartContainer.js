import React, { useMemo, useState } from 'react';
import { Paper, Typography, Box, useTheme, alpha, Chip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
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
    Cell,
    Sector
} from 'recharts';
import { motion } from 'framer-motion';

/**
 * Gráfico de duração — componente puro, recebe selectedYear via props
 */
const DurationBarChart = ({ data, selectedYear, yAxisLabel = 'Dias', tooltipUnit = 'dias', isOverview = false, smallXAxis = false }) => {
    const theme = useTheme();

    const yearKeys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name') : [];
    const yearColors = [
        theme.palette.primary.main,
        theme.palette.warning.main,
        theme.palette.success.main,
    ];

    return (
        <ResponsiveContainer width="100%" height={500}>
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 40, bottom: 100 }}
                    barCategoryGap="20%"
                    barGap={3}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: theme.palette.text.secondary, fontSize: smallXAxis ? (isOverview ? 8 : 10) : 11 }}
                        angle={-40}
                        textAnchor="end"
                        height={90}
                        interval={0}
                    />
                    <YAxis
                        tick={{ fill: theme.palette.text.secondary }}
                        tickFormatter={(v) => Number(v).toFixed(0)}
                        label={{
                            value: yAxisLabel,
                            angle: -90,
                            position: 'insideLeft',
                            offset: -10,
                            style: { fill: theme.palette.text.secondary, fontSize: 13 },
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 8,
                        }}
                        formatter={(value, name) => value !== null
                            ? [tooltipUnit ? `${Number(value).toFixed(0)} ${tooltipUnit}` : Number(value).toFixed(0), name]
                            : ['Sem dados', name]
                        }
                    />
                    {!isOverview && <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />}
                    {yearKeys.map((key, idx) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            name={formatColumnName(key)}
                            fill={yearColors[idx % yearColors.length]}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={35}
                            hide={selectedYear !== null && selectedYear !== key}
                            animationDuration={400}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
    );
};

/**
 * Card completo para gráficos de duração (vds_pedido_01$016, vds_pedido_01$017)
 * Estado local — clique nos botões de ano NÃO re-renderiza ChartContainer
 */
const DurationChartCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [selectedYear, setSelectedYear] = useState(null);

    const yearColors = [
        theme.palette.primary.main,
        theme.palette.warning.main,
        theme.palette.success.main,
    ];

    const preparedData = useMemo(() => {
        let dataToProcess = chart.data;
        if (chart.id === 'vds_pedido_01$016') dataToProcess = chart.data.slice(0, 26);
        else if (chart.id === 'vds_pedido_01$017') dataToProcess = chart.data.slice(0, 30);
        return prepareChartData(dataToProcess, chart.columns, 'duration_bar');
    }, [chart]);

    const handleYearClick = (yearKey) => {
        setSelectedYear(prev => yearKey === null ? null : (prev === yearKey ? null : yearKey));
    };

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
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
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                            {chart.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <Chip
                                    label={`${chart.total} registos`}
                                    size="small"
                                    variant="outlined"
                                />
                                <Chip
                                    label="Todos"
                                    size="small"
                                    onClick={() => handleYearClick(null)}
                                    variant={selectedYear === null ? 'filled' : 'outlined'}
                                    color={selectedYear === null ? 'primary' : 'default'}
                                    sx={{ fontWeight: 'bold' }}
                                />
                                {chart.yearKeys && chart.yearKeys.map((key, idx) => (
                                    <Chip
                                        key={key}
                                        label={formatColumnName(key)}
                                        size="small"
                                        onClick={() => handleYearClick(key)}
                                        variant={selectedYear === key ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: yearColors[idx % yearColors.length],
                                            color: selectedYear === key ? '#fff' : yearColors[idx % yearColors.length],
                                            backgroundColor: selectedYear === key ? yearColors[idx % yearColors.length] : 'transparent',
                                            '&:hover': {
                                                backgroundColor: alpha(yearColors[idx % yearColors.length], 0.15),
                                            },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                    <DurationBarChart data={preparedData} selectedYear={selectedYear} isOverview={viewMode === 'overview'} smallXAxis={chart.id === 'vds_pedido_01$016'} />
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para vds_tramitacao_01$002 — barras por utilizador com toggle de ano
 * Igual ao DurationChartCard mas sem limite de registos e com label Y "Tramitações"
 */
const TramitacaoAnoCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [selectedYear, setSelectedYear] = useState(null);

    const yearColors = [
        theme.palette.primary.main,
        theme.palette.warning.main,
        theme.palette.success.main,
    ];

    const preparedData = useMemo(() => {
        return prepareChartData(chart.data, chart.columns, 'duration_bar');
    }, [chart.data, chart.columns]);

    const yearKeys = preparedData.length > 0 ? Object.keys(preparedData[0]).filter(k => k !== 'name') : [];

    const handleYearClick = (yearKey) => {
        setSelectedYear(prev => yearKey === null ? null : (prev === yearKey ? null : yearKey));
    };

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                                <Chip
                                    label="Todos"
                                    size="small"
                                    onClick={() => handleYearClick(null)}
                                    variant={selectedYear === null ? 'filled' : 'outlined'}
                                    color={selectedYear === null ? 'primary' : 'default'}
                                    sx={{ fontWeight: 'bold' }}
                                />
                                {yearKeys.map((key, idx) => (
                                    <Chip
                                        key={key}
                                        label={formatColumnName(key)}
                                        size="small"
                                        onClick={() => handleYearClick(key)}
                                        variant={selectedYear === key ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: yearColors[idx % yearColors.length],
                                            color: selectedYear === key ? '#fff' : yearColors[idx % yearColors.length],
                                            backgroundColor: selectedYear === key ? yearColors[idx % yearColors.length] : 'transparent',
                                            '&:hover': { backgroundColor: alpha(yearColors[idx % yearColors.length], 0.15) },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                    <DurationBarChart
                        data={preparedData}
                        selectedYear={selectedYear}
                        yAxisLabel="Tramitações"
                        tooltipUnit=""
                    />
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para tramitações por utilizador/mês/ano (vds_tramitacao_01$003)
 * Botões de utilizador no header + gráfico de linhas mensal por ano
 */
const TramitacaoUserCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [selectedUser, setSelectedUser] = useState(null);

    const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const yearColors = [
        theme.palette.primary.main,
        theme.palette.warning.main,
        theme.palette.success.main,
        theme.palette.error.main,
        theme.palette.info.main,
    ];

    // Detectar colunas automaticamente a partir dos dados
    const { userCol, mesCol, anoCol, countCol } = useMemo(() => {
        if (!chart.data || chart.data.length === 0 || !chart.columns) return {};
        const cols = chart.columns;
        const firstRow = chart.data[0];
        const mesCol = cols.find(c => ['mes', 'mês', 'month'].includes(c.toLowerCase()));
        const anoCol = cols.find(c => ['ano', 'year'].includes(c.toLowerCase()));
        const skipCols = new Set([mesCol, anoCol].filter(Boolean));
        const userCol = cols.find(c => {
            if (skipCols.has(c)) return false;
            const v = firstRow[c];
            return typeof v === 'string';
        }) || cols.find(c => !skipCols.has(c));
        const countCol = cols.find(c => {
            if (skipCols.has(c) || c === userCol) return false;
            const v = firstRow[c];
            return typeof v === 'number' || !isNaN(parseFloat(v));
        });
        return { userCol, mesCol, anoCol, countCol };
    }, [chart.data, chart.columns]);

    // Utilizadores únicos ordenados
    const users = useMemo(() => {
        if (!chart.data || !userCol) return [];
        return [...new Set(chart.data.map(r => r[userCol]))].filter(Boolean).sort();
    }, [chart.data, userCol]);

    // Utilizador activo (1º por defeito)
    const activeUser = selectedUser !== null ? selectedUser : (users.length > 0 ? users[0] : null);

    // Anos únicos ordenados
    const years = useMemo(() => {
        if (!chart.data || !anoCol) return [];
        return [...new Set(chart.data.map(r => String(r[anoCol])))].filter(Boolean).sort();
    }, [chart.data, anoCol]);

    // Dados pivotados: uma linha por mês, colunas por ano, filtrado pelo utilizador activo
    const chartData = useMemo(() => {
        if (!activeUser || !mesCol || !anoCol || !countCol) return [];
        const filtered = chart.data.filter(r => r[userCol] === activeUser);
        return Array.from({ length: 12 }, (_, i) => {
            const mes = i + 1;
            const row = { mes };
            years.forEach(year => {
                const found = filtered.find(
                    r => Number(r[mesCol]) === mes && String(r[anoCol]) === year
                );
                row[year] = found ? (parseFloat(found[countCol]) || 0) : null;
            });
            return row;
        });
    }, [activeUser, chart.data, userCol, mesCol, anoCol, countCol, years]);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
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
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                            {chart.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                                <Chip
                                    label={`${chart.total} registos`}
                                    size="small"
                                    variant="outlined"
                                />
                                <FormControl size="small" sx={{ minWidth: 180 }}>
                                    <InputLabel>Utilizador</InputLabel>
                                    <Select
                                        value={activeUser || ''}
                                        label="Utilizador"
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                    >
                                        {users.map((user) => (
                                            <MenuItem key={user} value={user}>{user}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis
                                dataKey="mes"
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                                tickFormatter={(v) => MONTH_NAMES[v - 1] || v}
                            />
                            <YAxis
                                tick={{ fill: theme.palette.text.secondary }}
                                allowDecimals={false}
                                label={{
                                    value: 'Movimentos',
                                    angle: -90,
                                    position: 'insideLeft',
                                    offset: -5,
                                    style: { fill: theme.palette.text.secondary, fontSize: 12 },
                                }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: theme.palette.background.paper,
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 8,
                                }}
                                labelFormatter={(v) => MONTH_NAMES[v - 1] || v}
                                formatter={(value, name) => [value !== null ? value : 'Sem dados', name]}
                            />
                            <Legend verticalAlign="top" height={36} />
                            {years.map((year, idx) => (
                                <Line
                                    key={year}
                                    type="monotone"
                                    dataKey={year}
                                    name={year}
                                    stroke={yearColors[idx % yearColors.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={400}
                                    connectNulls={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Pie chart interativo para vds_fossa_01$001
 * - Hover: amplia a fatia temporariamente
 * - Clique numa fatia: fixa o zoom
 * - Botão "Zoom estados menores": oculta "Concluído com Sucesso" e amplia os restantes
 * APENAS usado por este gráfico específico
 */
const FossaEstadoPieChart = ({ data, colors, total, zoomFilter, zoomNote, isOverview }) => {
    const theme = useTheme();
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [pinnedIndex, setPinnedIndex] = useState(null);
    const [zoomedIn, setZoomedIn] = useState(false);

    // zoomFilter: função personalizada de filtro no modo zoom
    // Por defeito: filtrar "Concluído com Sucesso" (comportamento fossa)
    const defaultZoomFilter = (item) => !item.name.toLowerCase().includes('sucesso');
    const displayData = zoomedIn
        ? data.filter(zoomFilter || defaultZoomFilter)
        : data;

    // Índice activo: fixado tem prioridade sobre hover
    const activeIndex = pinnedIndex !== null ? pinnedIndex : hoveredIndex;
    const isPinned = pinnedIndex !== null;

    const handleZoomToggle = () => {
        setZoomedIn(prev => !prev);
        setPinnedIndex(null);
        setHoveredIndex(null);
    };

    const handleSliceClick = (_, index) => {
        setPinnedIndex(prev => prev === index ? null : index);
    };

    const handleChipClick = (index) => {
        setPinnedIndex(prev => prev === index ? null : index);
    };

    const renderActiveShape = (props) => {
        const {
            cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
            fill, payload, percent, value
        } = props;

        const RADIAN = Math.PI / 180;
        const sin = Math.sin(-RADIAN * midAngle);
        const cos = Math.cos(-RADIAN * midAngle);
        const sx = cx + (outerRadius + 8) * cos;
        const sy = cy + (outerRadius + 8) * sin;
        const mx = cx + (outerRadius + 42) * cos;
        const my = cy + (outerRadius + 42) * sin;
        const ex = mx + (cos >= 0 ? 1 : -1) * 22;
        const ey = my;
        const textAnchor = cos >= 0 ? 'start' : 'end';

        const expandSize = isPinned ? 20 : 14;
        const ringInner = outerRadius + expandSize + 4;
        const ringOuter = ringInner + (isPinned ? 6 : 4);

        // No modo zoom, mostrar percentagem real (relativa ao total completo)
        const realPercent = zoomedIn ? (value / total) : percent;

        return (
            <g>
                <Sector
                    cx={cx} cy={cy}
                    innerRadius={innerRadius}
                    outerRadius={outerRadius + expandSize}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <Sector
                    cx={cx} cy={cy}
                    innerRadius={ringInner}
                    outerRadius={ringOuter}
                    startAngle={startAngle}
                    endAngle={endAngle}
                    fill={fill}
                />
                <path
                    d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
                    stroke={fill}
                    fill="none"
                    strokeWidth={isPinned ? 2 : 1.5}
                />
                <circle cx={ex} cy={ey} r={isPinned ? 3 : 2} fill={fill} />
                <text
                    x={ex + (cos >= 0 ? 8 : -8)}
                    y={ey - 6}
                    textAnchor={textAnchor}
                    fill={theme.palette.text.primary}
                    fontSize={isOverview ? (isPinned ? 12 : 11) : (isPinned ? 14 : 13)}
                    fontWeight="bold"
                >
                    {payload.name}
                </text>
                <text
                    x={ex + (cos >= 0 ? 8 : -8)}
                    y={ey + 10}
                    textAnchor={textAnchor}
                    fill={fill}
                    fontSize={isOverview ? (isPinned ? 11 : 10) : (isPinned ? 13 : 12)}
                    fontWeight="600"
                >
                    {`${(realPercent * 100).toFixed(1)}% · ${value}`}
                </text>
                {zoomedIn && (
                    <text
                        x={ex + (cos >= 0 ? 8 : -8)}
                        y={ey + 24}
                        textAnchor={textAnchor}
                        fill={theme.palette.text.disabled}
                        fontSize={10}
                    >
                        % do total
                    </text>
                )}
                {isPinned && !zoomedIn && (
                    <text
                        x={ex + (cos >= 0 ? 8 : -8)}
                        y={ey + 26}
                        textAnchor={textAnchor}
                        fill={theme.palette.text.disabled}
                        fontSize={10}
                    >
                        clique para soltar
                    </text>
                )}
            </g>
        );
    };

    return (
        <Box>
            {/* Botão de zoom */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                <Chip
                    label={zoomedIn ? 'Reduzir' : 'Ampliar'}
                    size="small"
                    onClick={handleZoomToggle}
                    color={zoomedIn ? 'primary' : 'default'}
                    variant={zoomedIn ? 'filled' : 'outlined'}
                    sx={{
                        fontWeight: 600,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        borderStyle: 'dashed',
                        transition: 'all 0.2s ease',
                        '&:hover': { transform: 'scale(1.05)' }
                    }}
                />
            </Box>

            {/* Nota de contexto quando em modo zoom */}
            {zoomedIn && (
                <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{ display: 'block', textAlign: 'center', mb: 1, fontWeight: 600 }}
                >
                    {zoomNote || 'Gráfico sem o parâmetro: "Concluído com sucesso"'}
                </Typography>
            )}

            <motion.div
                key={zoomedIn ? 'zoomed' : 'normal'}
                initial={{ scale: 0.82, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            >
                <ResponsiveContainer width="100%" height={zoomedIn ? 520 : (isOverview ? 360 : 480)}>
                    <PieChart margin={{ top: 10, right: isOverview ? 80 : 110, bottom: 10, left: isOverview ? 80 : 110 }}>
                        <Pie
                            data={displayData}
                            cx="50%"
                            cy="50%"
                            outerRadius={zoomedIn ? 160 : (isOverview ? 100 : 130)}
                            dataKey="value"
                            activeIndex={activeIndex !== null ? activeIndex : undefined}
                            activeShape={renderActiveShape}
                            isAnimationActive={true}
                            animationBegin={0}
                            animationDuration={700}
                            animationEasing="ease-out"
                            onMouseEnter={(_, index) => {
                                if (!isPinned) setHoveredIndex(index);
                            }}
                            onMouseLeave={() => {
                                if (!isPinned) setHoveredIndex(null);
                            }}
                            onClick={handleSliceClick}
                            style={{ cursor: 'pointer' }}
                        >
                            {displayData.map((entry, index) => {
                                const originalIndex = data.findIndex(d => d.name === entry.name);
                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={colors[(originalIndex >= 0 ? originalIndex : index) % colors.length]}
                                    />
                                );
                            })}
                        </Pie>
                        {!isPinned && (
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: theme.palette.background.paper,
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 8
                                }}
                                formatter={(value, name) => [
                                    `${value} (${((value / total) * 100).toFixed(1)}% do total)`,
                                    name
                                ]}
                            />
                        )}
                        {!isOverview && <Legend verticalAlign="bottom" height={36} />}
                    </PieChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Etiquetas com todas as percentagens — clicáveis para fixar */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2, px: 2 }}>
                {displayData.map((item, index) => {
                    const isActive = activeIndex === index;
                    const isThisPinned = pinnedIndex === index;
                    const originalIndex = data.findIndex(d => d.name === item.name);
                    const itemColor = colors[(originalIndex >= 0 ? originalIndex : index) % colors.length];
                    return (
                        <Box
                            key={index}
                            onMouseEnter={() => { if (!isPinned) setHoveredIndex(index); }}
                            onMouseLeave={() => { if (!isPinned) setHoveredIndex(null); }}
                            onClick={() => handleChipClick(index)}
                            sx={{
                                display: 'flex', alignItems: 'center', gap: 0.5,
                                px: 1.5, py: 0.5, borderRadius: 2,
                                backgroundColor: alpha(itemColor, isThisPinned ? 0.3 : isActive ? 0.2 : 0.1),
                                border: `${isThisPinned ? 2 : 1}px solid ${alpha(itemColor, isThisPinned ? 0.8 : isActive ? 0.6 : 0.25)}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isThisPinned ? `0 2px 8px ${alpha(itemColor, 0.3)}` : 'none'
                            }}
                        >
                            <Box sx={{
                                width: 10, height: 10, borderRadius: '50%',
                                backgroundColor: itemColor, flexShrink: 0
                            }} />
                            <Typography variant="caption" fontWeight="600" sx={{ color: itemColor }}>
                                {item.name}:
                            </Typography>
                            <Typography variant="caption" fontWeight="bold" color="text.primary">
                                {((item.value / total) * 100).toFixed(1)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                ({item.value})
                            </Typography>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

/**
 * Gráfico de linhas por mês — vds_fossa_01$003
 * Colunas: ano, mes, carregal, tondela, tabua, santacomba
 * X: número do mês; Linhas: municípios; Filtro: ano
 * APENAS usado por este gráfico específico
 */
const FossaMesLineCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [selectedYear, setSelectedYear] = useState(null);
    

    const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Detectar colunas
    const { anoCol, mesCol, municipioCols } = useMemo(() => {
        if (!chart.data || chart.data.length === 0 || !chart.columns) return { municipioCols: [] };
        const cols = chart.columns;
        const firstRow = chart.data[0];
        const anoCol = cols.find(c => ['ano', 'year'].includes(c.toLowerCase()));
        const mesCol = cols.find(c => ['mes', 'mês', 'month'].includes(c.toLowerCase()));
        // Municípios = todas as colunas numéricas que não são ano nem mês
        const municipioCols = cols.filter(c => {
            if (c === anoCol || c === mesCol) return false;
            // Varrer TODAS as linhas para não perder colunas com null nas primeiras linhas
            return chart.data.some(r => {
                const v = r[c];
                return typeof v === 'number' || (v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)));
            });
        });
        return { anoCol, mesCol, municipioCols };
    }, [chart.data, chart.columns]);

    // Anos únicos ordenados
    const years = useMemo(() => {
        if (!chart.data || !anoCol) return [];
        return [...new Set(chart.data.map(r => String(r[anoCol])))].filter(Boolean).sort();
    }, [chart.data, anoCol]);

    // Ano activo (mais recente por defeito)
    const activeYear = selectedYear || (years.length > 0 ? years[years.length - 1] : null);

    const maxMes = 12;

    // Dados filtrados por ano, ordenados por mês
    const chartData = useMemo(() => {
        if (!anoCol || !mesCol || !activeYear) return [];
        return chart.data
            .filter(r => String(r[anoCol]) === activeYear)
            .sort((a, b) => Number(a[mesCol]) - Number(b[mesCol]))
            .map(r => {
                const row = { mes: Number(r[mesCol]) };
                municipioCols.forEach(col => {
                    row[col] = r[col] !== null && r[col] !== undefined ? (parseFloat(r[col]) || 0) : null;
                });
                return row;
            });
    }, [chart.data, anoCol, mesCol, activeYear, municipioCols]);

    const yearBtnColors = [
        theme.palette.primary.main,
        theme.palette.warning.main,
        theme.palette.success.main,
    ];

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
            >
                <Paper sx={{
                    p: 3, height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' }
                }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                            {chart.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                                {years.map((year, idx) => (
                                    <Chip
                                        key={year}
                                        label={year}
                                        size="small"
                                        onClick={() => setSelectedYear(year)}
                                        variant={activeYear === year ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: yearBtnColors[idx % yearBtnColors.length],
                                            color: activeYear === year ? '#fff' : yearBtnColors[idx % yearBtnColors.length],
                                            backgroundColor: activeYear === year ? yearBtnColors[idx % yearBtnColors.length] : 'transparent',
                                            '&:hover': { backgroundColor: alpha(yearBtnColors[idx % yearBtnColors.length], 0.15) },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis
                                dataKey="mes"
                                type="number"
                                domain={[1, maxMes]}
                                ticks={Array.from({ length: maxMes }, (_, i) => i + 1)}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 13 }}
                                tickFormatter={(v) => v}
                                label={{ value: 'Mês', position: 'insideBottomRight', offset: -10, style: { fill: theme.palette.text.secondary, fontSize: 12 } }}
                            />
                            <YAxis tick={{ fill: theme.palette.text.secondary }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                                labelFormatter={(v) => `Mês ${v} — ${MONTH_NAMES[v - 1] || ''}`}
                                formatter={(value, name) => [value !== null ? value : 'Sem dados', name]}
                            />
                            <Legend verticalAlign="top" height={36} />
                            {municipioCols.map((col, idx) => (
                                <Line
                                    key={col}
                                    type="monotone"
                                    dataKey={col}
                                    name={col.charAt(0).toUpperCase() + col.slice(1)}
                                    stroke={_normMunicipio(col) === 'total' ? '#d32f2f' : getMunicipioColor(col, [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main][idx % 4])}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={400}
                                    connectNulls={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Gráfico de linhas por semana — vds_repav_01$004
 * X: semana (adaptada à semana máxima dos dados); Linhas: colunas numéricas; Filtro: ano
 * Paleta Tableau 10 (INCUMPRIMENTO_PALETTE)
 */
const RamalSemanaLineCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [selectedYear, setSelectedYear] = useState(null);

    const { anoCol, semanaCol, valueCols } = useMemo(() => {
        if (!chart.data || chart.data.length === 0 || !chart.columns) return { valueCols: [] };
        const cols = chart.columns;
        const anoCol = cols.find(c => ['ano', 'year'].includes(c.toLowerCase()));
        const semanaCol = cols.find(c => ['semana', 'week', 'semana_ano'].includes(c.toLowerCase()));
        const valueCols = cols.filter(c => {
            if (c === anoCol || c === semanaCol) return false;
            // Varrer TODAS as linhas para não perder colunas com null nas primeiras linhas
            return chart.data.some(r => {
                const v = r[c];
                return typeof v === 'number' || (v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)));
            });
        });
        return { anoCol, semanaCol, valueCols };
    }, [chart.data, chart.columns]);

    const years = useMemo(() => {
        if (!chart.data || !anoCol) return [];
        return [...new Set(chart.data.map(r => String(r[anoCol])))].filter(Boolean).sort();
    }, [chart.data, anoCol]);

    const activeYear = selectedYear || (years.length > 0 ? years[years.length - 1] : null);

    const maxSemana = useMemo(() => {
        if (!chart.data || !anoCol || !semanaCol || !activeYear) return 52;
        const filtered = chart.data.filter(r => String(r[anoCol]) === activeYear);
        const max = Math.max(...filtered.map(r => Number(r[semanaCol])).filter(n => !isNaN(n)));
        return isFinite(max) ? max : 52;
    }, [chart.data, anoCol, semanaCol, activeYear]);

    const maxY = useMemo(() => {
        if (!chart.data || !anoCol || !activeYear || valueCols.length === 0) return 'auto';
        const filtered = chart.data.filter(r => String(r[anoCol]) === activeYear);
        const vals = filtered.flatMap(r => valueCols.map(c => parseFloat(r[c]) || 0)).filter(v => isFinite(v));
        const max = Math.max(...vals);
        return isFinite(max) ? Math.ceil(max * 1.1) : 'auto';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chart.data, anoCol, activeYear, valueCols]);

    const chartData = useMemo(() => {
        if (!anoCol || !semanaCol || !activeYear) return [];
        return chart.data
            .filter(r => String(r[anoCol]) === activeYear)
            .sort((a, b) => Number(a[semanaCol]) - Number(b[semanaCol]))
            .map(r => {
                const row = { semana: Number(r[semanaCol]) };
                valueCols.forEach(col => {
                    row[col] = r[col] !== null && r[col] !== undefined ? (parseFloat(r[col]) || 0) : null;
                });
                return row;
            });
    }, [chart.data, anoCol, semanaCol, activeYear, valueCols]);

    const yearBtnColors = [theme.palette.primary.main, theme.palette.warning.main, theme.palette.success.main];

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                                {years.map((year, idx) => (
                                    <Chip
                                        key={year}
                                        label={year}
                                        size="small"
                                        onClick={() => setSelectedYear(year)}
                                        variant={activeYear === year ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: yearBtnColors[idx % yearBtnColors.length],
                                            color: activeYear === year ? '#fff' : yearBtnColors[idx % yearBtnColors.length],
                                            backgroundColor: activeYear === year ? yearBtnColors[idx % yearBtnColors.length] : 'transparent',
                                            '&:hover': { backgroundColor: alpha(yearBtnColors[idx % yearBtnColors.length], 0.15) },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis
                                dataKey="semana"
                                type="number"
                                domain={[1, maxSemana]}
                                ticks={Array.from({ length: maxSemana }, (_, i) => i + 1)}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                                tickFormatter={(v) => `S${v}`}
                                label={{ value: 'Semana', position: 'insideBottomRight', offset: -10, style: { fill: theme.palette.text.secondary, fontSize: 12 } }}
                                interval={maxSemana > 26 ? 1 : 0}
                            />
                            <YAxis
                                tick={{ fill: theme.palette.text.secondary }}
                                domain={[0, maxY]}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                                labelFormatter={(v) => `Semana ${v}`}
                                formatter={(value, name) => [value !== null ? value : 'Sem dados', name]}
                            />
                            <Legend verticalAlign="top" height={36} />
                            {valueCols.map((col, idx) => (
                                <Line
                                    key={col}
                                    type="monotone"
                                    dataKey={col}
                                    name={col.charAt(0).toUpperCase() + col.slice(1)}
                                    stroke={INCUMPRIMENTO_PALETTE[idx % INCUMPRIMENTO_PALETTE.length]}
                                    strokeWidth={2}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    animationDuration={400}
                                    connectNulls={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Gráfico de linhas por mês — vds_ramal_01$003
 * X: mês (adaptado ao mês máximo dos dados); Linhas: colunas numéricas; Filtro: ano
 * Paleta Tableau 10 (INCUMPRIMENTO_PALETTE)
 */
const RamalMesLineCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [selectedYear, setSelectedYear] = useState(null);

    const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const { anoCol, mesCol, valueCols } = useMemo(() => {
        if (!chart.data || chart.data.length === 0 || !chart.columns) return { valueCols: [] };
        const cols = chart.columns;
        const anoCol = cols.find(c => ['ano', 'year'].includes(c.toLowerCase()));
        const mesCol = cols.find(c => ['mes', 'mês', 'month'].includes(c.toLowerCase()));
        const valueCols = cols.filter(c => {
            if (c === anoCol || c === mesCol) return false;
            // Varrer TODAS as linhas para não perder colunas com null nas primeiras linhas
            return chart.data.some(r => {
                const v = r[c];
                return typeof v === 'number' || (v !== null && v !== undefined && v !== '' && !isNaN(parseFloat(v)));
            });
        });
        return { anoCol, mesCol, valueCols };
    }, [chart.data, chart.columns]);

    const years = useMemo(() => {
        if (!chart.data || !anoCol) return [];
        return [...new Set(chart.data.map(r => String(r[anoCol])))].filter(Boolean).sort();
    }, [chart.data, anoCol]);

    const activeYear = selectedYear || (years.length > 0 ? years[years.length - 1] : null);

    const maxMes = 12;

    const maxY = useMemo(() => {
        if (!chart.data || !anoCol || !activeYear || valueCols.length === 0) return 'auto';
        const filtered = chart.data.filter(r => String(r[anoCol]) === activeYear);
        const vals = filtered.flatMap(r => valueCols.map(c => parseFloat(r[c]) || 0)).filter(v => isFinite(v));
        const max = Math.max(...vals);
        return isFinite(max) ? Math.ceil(max * 1.1) : 'auto';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chart.data, anoCol, activeYear, valueCols]);

    const chartData = useMemo(() => {
        if (!anoCol || !mesCol || !activeYear) return [];
        return chart.data
            .filter(r => String(r[anoCol]) === activeYear)
            .sort((a, b) => Number(a[mesCol]) - Number(b[mesCol]))
            .map(r => {
                const row = { mes: Number(r[mesCol]) };
                valueCols.forEach(col => {
                    row[col] = r[col] !== null && r[col] !== undefined ? (parseFloat(r[col]) || 0) : null;
                });
                return row;
            });
    }, [chart.data, anoCol, mesCol, activeYear, valueCols]);

    const yearBtnColors = [theme.palette.primary.main, theme.palette.warning.main, theme.palette.success.main];

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                                {years.map((year, idx) => (
                                    <Chip
                                        key={year}
                                        label={year}
                                        size="small"
                                        onClick={() => setSelectedYear(year)}
                                        variant={activeYear === year ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: yearBtnColors[idx % yearBtnColors.length],
                                            color: activeYear === year ? '#fff' : yearBtnColors[idx % yearBtnColors.length],
                                            backgroundColor: activeYear === year ? yearBtnColors[idx % yearBtnColors.length] : 'transparent',
                                            '&:hover': { backgroundColor: alpha(yearBtnColors[idx % yearBtnColors.length], 0.15) },
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis
                                dataKey="mes"
                                type="number"
                                domain={[1, maxMes]}
                                ticks={Array.from({ length: maxMes }, (_, i) => i + 1)}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 13 }}
                                tickFormatter={(v) => MONTH_NAMES[v - 1] || v}
                            />
                            <YAxis
                                tick={{ fill: theme.palette.text.secondary }}
                                domain={[0, maxY]}
                                allowDecimals={false}                                   
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                                labelFormatter={(v) => MONTH_NAMES[v - 1] || `Mês ${v}`}
                                formatter={(value, name) => [value !== null ? value : 'Sem dados', name]}
                            />
                            <Legend verticalAlign="top" height={36} />
                            {valueCols.map((col, idx) => (
                                <Line
                                    key={col}
                                    type="monotone"
                                    dataKey={col}
                                    name={col.charAt(0).toUpperCase() + col.slice(1)}
                                    stroke={INCUMPRIMENTO_PALETTE[idx % INCUMPRIMENTO_PALETTE.length]}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={400}
                                    connectNulls={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

// Cores fixas por município — aplicadas em TODOS os gráficos
const MUNICIPIO_COLORS = {
    tondela:      '#f57c00', // Laranja
    tabua:        '#388e3c', // Verde
    carregal:     '#1565c0', // Azul
    'santa comba':'#5c35a5', // Roxo próximo do azul
};

// Normaliza acentos para comparação (ex: "Tábua" → "tabua")
const _normMunicipio = (name) =>
    (name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getMunicipioColor = (name, fallback) => {
    const norm = _normMunicipio(name);
    for (const [key, color] of Object.entries(MUNICIPIO_COLORS)) {
        if (norm.includes(key)) return color;
    }
    return fallback;
};

// Paleta Tableau 10 — máxima distinção para repavimentações
const REPAV_COLORS = [
    '#4e79a7', // azul
    '#f28e2b', // laranja
    '#e15759', // vermelho coral
    '#59a14f', // verde
    '#76b7b2', // verde-azulado
    '#edc948', // amarelo
    '#b07aa1', // roxo
    '#ff9da7', // rosa
    '#9c755f', // castanho
    '#bab0ac', // cinza
];

// Paleta partilhada por vds_incumprimento_01$003, $005, $008
// Garante a mesma cor para o mesmo valor da coluna "parametros"
const INCUMPRIMENTO_PALETTE = [
    '#4e79a7', '#f28e2b', '#e15759', '#59a14f',
    '#76b7b2', '#edc948', '#b07aa1', '#ff9da7',
    '#9c755f', '#bab0ac',
];
const INCUMPRIMENTO_IDS = new Set([
    'vds_incumprimento_01$003',
    'vds_incumprimento_01$005',
    'vds_incumprimento_01$008',
]);

// Constrói mapa { nomeParâmetro: cor } a partir dos dados de um gráfico de incumprimento
const buildIncumprimentoColorMap = (data, columns) => {
    const paramCol = (columns || []).find(c => c.toLowerCase().includes('param'));
    if (!paramCol || !data) return null;
    const sorted = [...new Set(data.map(r => String(r[paramCol] || '')))].filter(Boolean).sort();
    const map = {};
    sorted.forEach((name, idx) => { map[name] = INCUMPRIMENTO_PALETTE[idx % INCUMPRIMENTO_PALETTE.length]; });
    return map;
};

/**
 * Gráfico de linhas por parâmetro/ano — vds_incumprimento_01$005
 * Usa INCUMPRIMENTO_PALETTE diretamente (sem getMunicipioColor)
 * para garantir cores idênticas às dos gráficos 003 e 008
 * APENAS usado por este gráfico específico
 */
const IncumprimentoLineCard = ({ chart, viewMode, index, colorMap: globalColorMap }) => {
    const theme = useTheme();

    const { paramCol, yearCols, params } = useMemo(() => {
        if (!chart.data || chart.data.length === 0 || !chart.columns) return { yearCols: [], params: [] };
        const cols = chart.columns;
        const firstRow = chart.data[0];
        const paramCol = cols.find(c => c.toLowerCase().includes('param'))
            || cols.find(c => typeof firstRow[c] === 'string');
        const yearCols = cols.filter(c => /^\d{4}$/.test(String(c))).sort();
        const params = [...new Set(chart.data.map(r => String(r[paramCol] || '').trim()))].filter(Boolean).sort();
        return { paramCol, yearCols, params };
    }, [chart.data, chart.columns]);

    // Usa o mapa global (partilhado com os outros gráficos de incumprimento) se disponível
    const colorMap = useMemo(() => {
        if (globalColorMap && Object.keys(globalColorMap).length > 0) return globalColorMap;
        const map = {};
        params.forEach((name, idx) => { map[name] = INCUMPRIMENTO_PALETTE[idx % INCUMPRIMENTO_PALETTE.length]; });
        return map;
    }, [params]);

    const chartData = useMemo(() => {
        if (!paramCol || yearCols.length === 0) return [];
        return yearCols.map(year => {
            const row = { ano: String(year) };
            chart.data.forEach(r => {
                const nome = String(r[paramCol] || '').trim();
                if (nome) row[nome] = (r[year] !== null && r[year] !== undefined) ? (parseFloat(r[year]) || 0) : null;
            });
            return row;
        });
    }, [chart.data, paramCol, yearCols]);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={viewMode === 'overview' ? 560 : 420}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis dataKey="ano" tick={{ fill: theme.palette.text.secondary, fontSize: 13 }} />
                            <YAxis tick={{ fill: theme.palette.text.secondary }} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                                formatter={(value, name) => [value !== null ? value : 'Sem dados', name]} />
                            <Legend
                                verticalAlign={viewMode === 'overview' ? 'bottom' : 'top'}
                                height={viewMode === 'overview' ? 140 : 36}
                                wrapperStyle={viewMode === 'overview' ? { fontSize: '14px', lineHeight: '24px', paddingTop: '10px' } : {}}
                            />
                            {params.map((param) => (
                                <Line key={param} type="monotone" dataKey={param} name={param}
                                    stroke={colorMap[param]}
                                    strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}
                                    animationDuration={400} connectNulls={false} />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Gráfico de linhas por concelho/ano — vds_fossa_01$002
 * X: anos; Linhas: concelhos
 * APENAS usado por este gráfico específico
 */
const FossaConcelhoLineCard = ({ chart, viewMode, index, colorPalette }) => {
    const theme = useTheme();

    const LINE_COLORS = colorPalette || [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.info.main,
        '#7b1fa2',
        '#f06292',
        '#26a69a',
        '#ffa726',
    ];

    // Estrutura já pivotada: cada linha = município, colunas de anos = valores
    // Ex: { municipio: 'Braga', '2023': 5, '2024': 10, '2025': 8 }
    const { concelhoCol, yearCols, concelhos } = useMemo(() => {
        if (!chart.data || chart.data.length === 0 || !chart.columns) return { yearCols: [], concelhos: [] };
        const cols = chart.columns;
        const firstRow = chart.data[0];

        // Coluna de município: primeira coluna string
        const concelhoCol = cols.find(c =>
            ['municipio', 'município', 'concelho', 'municipio_nome', 'municipio_servico'].includes(c.toLowerCase())
        ) || cols.find(c => typeof firstRow[c] === 'string');

        // Colunas de anos: nomes que são 4 dígitos (ex: "2023", "2024", "2025")
        const yearCols = cols.filter(c => /^\d{4}$/.test(String(c))).sort();

        // Lista de concelhos, sem prefixo
        const concelhos = chart.data
            .map(r => String(r[concelhoCol] || '').replace(/^(Município de |Concelho de )/gi, '').trim())
            .filter(Boolean)
            .sort();

        return { concelhoCol, yearCols, concelhos };
    }, [chart.data, chart.columns]);

    // Pivô: uma linha por ano, colunas por município
    // Output: [{ ano: '2023', 'Braga': 5, 'Guimarães': 3 }, ...]
    const chartData = useMemo(() => {
        if (!concelhoCol || yearCols.length === 0) return [];
        return yearCols.map(year => {
            const row = { ano: String(year) };
            chart.data.forEach(r => {
                const nome = String(r[concelhoCol] || '').replace(/^(Município de |Concelho de )/gi, '').trim();
                if (nome) row[nome] = (r[year] !== null && r[year] !== undefined) ? (parseFloat(r[year]) || 0) : null;
            });
            return row;
        });
    }, [chart.data, concelhoCol, yearCols]);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
            >
                <Paper sx={{
                    p: 3, height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' }
                }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                            {chart.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={420}>
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis
                                dataKey="ano"
                                tick={{ fill: theme.palette.text.secondary, fontSize: 13 }}
                            />
                            <YAxis
                                tick={{ fill: theme.palette.text.secondary }}
                                allowDecimals={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: theme.palette.background.paper,
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 8,
                                }}
                                formatter={(value, name) => [value !== null ? value : 'Sem dados', name]}
                            />
                            <Legend verticalAlign="top" height={36} />
                            {concelhos.map((concelho, idx) => (
                                <Line
                                    key={concelho}
                                    type="monotone"
                                    dataKey={concelho}
                                    name={concelho}
                                    stroke={getMunicipioColor(concelho, LINE_COLORS[idx % LINE_COLORS.length])}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={400}
                                    connectNulls={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card wrapper para vds_fossa_01$001
 * APENAS usado por este gráfico específico
 */
// Cores fixas por nome de estado (vds_fossa_01$001)
const FOSSA_STATE_COLORS = {
    anula:    '#9e9e9e', // Cinzento — Anulado
    cobran:   '#7b1fa2', // Roxo — Cobrança para o Cliente
};

const getFossaStateColor = (name, fallback) => {
    const lower = (name || '').toLowerCase();
    for (const [key, color] of Object.entries(FOSSA_STATE_COLORS)) {
        if (lower.includes(key)) return color;
    }
    return fallback;
};

const FossaEstadoCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();

    const preparedData = useMemo(() => {
        return prepareChartData(chart.data, chart.columns, 'pie');
    }, [chart.data, chart.columns]);

    // Cores mapeadas por nome: estados especiais têm cor fixa, os outros usam REPAV_COLORS
    const COLORS = preparedData.map((item, i) =>
        getFossaStateColor(item.name, REPAV_COLORS[i % REPAV_COLORS.length])
    );

    const total = preparedData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
            >
                <Paper sx={{
                    p: 3, height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' }
                }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                            {chart.name}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                        </Box>
                    </Box>
                    <FossaEstadoPieChart data={preparedData} colors={COLORS} total={total} isOverview={viewMode === 'overview'} />
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para vds_repav_01$001 — pie chart interativo
 * Zoom: mostrar apenas "ENTRADA" e "PARA PAGAMENTO DE PAVIMENTAÇÃO"
 * Cor fixa: ENTRADA → laranja (#f57c00)
 */
const REPAV_ZOOM_NAMES = ['entrada', 'pagamento de pavimenta'];
const repavZoomFilter = (item) => {
    const lower = (item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return REPAV_ZOOM_NAMES.some(k => lower.includes(k));
};

const RepavEstadoCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();

    const BASE_COLORS = [
        theme.palette.primary.main,
        theme.palette.secondary.main,
        theme.palette.success.main,
        theme.palette.warning.main,
        theme.palette.error.main,
        theme.palette.info.main,
        alpha(theme.palette.primary.main, 0.7),
        alpha(theme.palette.secondary.main, 0.7)
    ];

    const preparedData = useMemo(() => {
        return prepareChartData(chart.data, chart.columns, 'pie');
    }, [chart.data, chart.columns]);

    const COLORS = preparedData.map((item, i) => {
        const lower = (item.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (lower.includes('entrada')) return '#f57c00'; // laranja fixo
        return BASE_COLORS[i % BASE_COLORS.length];
    });

    const total = preparedData.reduce((sum, item) => sum + item.value, 0);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                        </Box>
                    </Box>
                    <FossaEstadoPieChart
                        data={preparedData}
                        colors={COLORS}
                        total={total}
                        zoomFilter={repavZoomFilter}
                        zoomNote='Apenas: "Entrada" e "Para Pagamento de Pavimentação"'
                        isOverview={viewMode === 'overview'}
                    />
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card com 2 gráficos de linha lado a lado — vds_fossa_01$004
 * Cada gráfico tem botões "Duração" / "Total" para alternar entre os dois conjuntos de colunas
 * Duração: Duracao 2023 (dias), Duracao 2024 (dias), Duracao 2025 (dias)
 * Total:   Total 2023, Total 2024, Total 2025
 * X: anos (2023/2024/2025); Linhas: municípios
 */
const FossaDurationCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [mode, setMode] = useState('duracao');

    const DURACAO_COLS = ['Duração 2023 (dias)', 'Duração 2024 (dias)', 'Duração 2025 (dias)'];
    const TOTAL_COLS   = ['Total 2023', 'Total 2024', 'Total 2025'];
    const YEARS        = ['2023', '2024', '2025'];

    const municipioCol = useMemo(() => {
        if (!chart.data || !chart.columns || chart.data.length === 0) return null;
        const firstRow = chart.data[0];
        return chart.columns.find(c => typeof firstRow[c] === 'string') || chart.columns[0];
    }, [chart.data, chart.columns]);

    const municipios = useMemo(() => {
        if (!municipioCol || !chart.data) return [];
        return [...new Set(chart.data.map(r => String(r[municipioCol] || '').trim()))].filter(Boolean);
    }, [chart.data, municipioCol]);

    const chartData = useMemo(() => {
        if (!municipioCol) return [];
        const cols = mode === 'duracao' ? DURACAO_COLS : TOTAL_COLS;
        return YEARS.map((year, i) => {
            const col = cols[i];
            const row = { ano: year };
            (chart.data || []).forEach(r => {
                const muni = String(r[municipioCol] || '').trim();
                if (muni) row[muni] = (r[col] !== null && r[col] !== undefined) ? (parseFloat(r[col]) || 0) : null;
            });
            return row;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chart.data, municipioCol, mode]);

    const fallbackColors = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main];

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
            >
                <Paper sx={{
                    p: 3, height: '100%',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: 'all 0.3s ease',
                    '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' }
                }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                                <Chip
                                    label="Duração (dias)"
                                    size="small"
                                    onClick={() => setMode('duracao')}
                                    variant={mode === 'duracao' ? 'filled' : 'outlined'}
                                    color={mode === 'duracao' ? 'primary' : 'default'}
                                    sx={{ fontWeight: 'bold' }}
                                />
                                <Chip
                                    label="Total"
                                    size="small"
                                    onClick={() => setMode('total')}
                                    variant={mode === 'total' ? 'filled' : 'outlined'}
                                    color={mode === 'total' ? 'primary' : 'default'}
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </Box>
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={chartData} margin={{ top: viewMode === 'overview' ? 60 : 10, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis dataKey="ano" tick={{ fill: theme.palette.text.secondary, fontSize: 13 }} />
                            <YAxis tick={{ fill: theme.palette.text.secondary }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }}
                                formatter={(value, name) => [value !== null ? value : 'Sem dados', name]}
                            />
                            <Legend verticalAlign="top" height={viewMode === 'overview' ? 60 : 36} />
                            {municipios.map((muni, idx) => (
                                <Line
                                    key={muni}
                                    type="monotone"
                                    dataKey={muni}
                                    name={muni}
                                    stroke={getMunicipioColor(muni, fallbackColors[idx % fallbackColors.length])}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    animationDuration={400}
                                    connectNulls={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para vds_pedido_01$005 — gráfico de linhas com chips de filtro por série
 */
const PEDIDO005_COLORS = ['#1565c0', '#388e3c', '#f57c00'];

const Pedido005LineCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();
    const [selectedSerie, setSelectedSerie] = useState(null); // null = Todos

    const labelCol = useMemo(() => identifyLabelColumn(chart.data, chart.columns), [chart]);

    const series = useMemo(() => {
        const valueCols = chart.columns.filter(col => col !== labelCol);
        return [
            { key: null, label: 'Todos', color: null },
            ...valueCols.map((col, idx) => ({
                key: col,
                label: formatColumnName(col),
                color: PEDIDO005_COLORS[idx % PEDIDO005_COLORS.length],
            })),
        ];
    }, [chart, labelCol]);

    const lineData = useMemo(() =>
        prepareChartData(chart.data, chart.columns, 'line', chart.data.length),
    [chart]);

    const dataKeys = getDataKeys(lineData, chart.columns);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                            {series.map((serie) => {
                                const isSelected = selectedSerie === serie.key || (serie.key === null && !selectedSerie);
                                const color = serie.color ?? theme.palette.primary.main;
                                return (
                                    <Chip
                                        key={serie.key ?? 'todos'}
                                        label={serie.label}
                                        size="small"
                                        onClick={() => setSelectedSerie(prev => prev === serie.key ? null : serie.key)}
                                        variant={isSelected ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: color,
                                            color: isSelected ? '#fff' : color,
                                            backgroundColor: isSelected ? color : 'transparent',
                                            '&:hover': { backgroundColor: alpha(color, 0.15) },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={420}>
                        <LineChart data={lineData} margin={{ top: 10, right: 30, left: 20, bottom: 70 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis dataKey="name" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} angle={-45} textAnchor="end" height={70} interval={0} />
                            <YAxis tick={{ fill: theme.palette.text.secondary }} />
                            <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} />
                            <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize: '14px', paddingTop: '6px' }} />
                            {dataKeys.map((key, idx) => {
                                const isActive = !selectedSerie || key === selectedSerie;
                                return (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        name={formatColumnName(key)}
                                        stroke={PEDIDO005_COLORS[idx % PEDIDO005_COLORS.length]}
                                        strokeWidth={isActive ? 2.5 : 0.8}
                                        strokeOpacity={isActive ? 1 : 0.2}
                                        dot={{ r: isActive ? 4 : 2 }}
                                        activeDot={{ r: isActive ? 6 : 2 }}
                                    />
                                );
                            })}
                        </LineChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para pedidos com filtro dinâmico por tipo ($006, $007, $008, $009)
 */
const TIPO_COLORS = ['#e53935', '#00838f', '#f9a825', '#7c4dff', '#00bcd4'];

const Pedido008FilterCard = ({ chart, viewMode, index, compact = false }) => {
    const theme = useTheme();
    const [selectedTipo, setSelectedTipo] = useState(null);

    const labelCol = useMemo(() =>
        identifyLabelColumn(chart.data, chart.columns),
    [chart]);

    // Gera os botões dinamicamente a partir das colunas de valor
    const tipos = useMemo(() => {
        const valueCols = chart.columns.filter(col => col !== labelCol);
        return [
            { key: null, label: 'Todos', color: null },
            ...valueCols.map((col, idx) => ({
                key: col,
                label: formatColumnName(col),
                color: TIPO_COLORS[idx % TIPO_COLORS.length],
            })),
        ];
    }, [chart, labelCol]);

    // Barras — modo "Todos"
    const barData = useMemo(() =>
        prepareChartData(chart.data, chart.columns, 'bar', chart.data.length),
    [chart]);
    const dataKeys = getDataKeys(barData, chart.columns);
    const CHART_COLORS = ['#e53935', '#00838f', '#f9a825'];

    const ColoredTick = ({ x, y, payload }) => {
        const tickColor = getMunicipioColor(payload.value, theme.palette.text.secondary);
        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={4} textAnchor="end"
                    fill={tickColor} fontSize={compact ? 10 : 15} fontWeight={600} transform="rotate(-45)">
                    {payload.value}
                </text>
            </g>
        );
    };

    // Pizza — quando um tipo está seleccionado usa a coluna exacta
    const pieData = useMemo(() => {
        if (!selectedTipo) return [];
        if (!chart.columns.includes(selectedTipo)) return [];
        return chart.data
            .map(row => ({
                name: formatLabel(String(row[labelCol] ?? '')),
                value: parseFloat(row[selectedTipo]) || 0
            }))
            .filter(item => item.value > 0);
    }, [chart, labelCol, selectedTipo]);

    const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
        if (percent < 0.02) return null;
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 30;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill={theme.palette.text.primary}
                textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
                style={{ fontSize: '13px', fontWeight: '500' }}>
                {`${name}: ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                            {tipos.map((tipo) => (
                                <Chip
                                    key={tipo.key ?? 'todos'}
                                    label={tipo.label}
                                    size="small"
                                    onClick={() => setSelectedTipo(tipo.key)}
                                    variant={selectedTipo === tipo.key ? 'filled' : 'outlined'}
                                    color={!tipo.color ? (selectedTipo === tipo.key ? 'primary' : 'default') : undefined}
                                    sx={tipo.color ? {
                                        fontWeight: 'bold',
                                        borderColor: tipo.color,
                                        color: selectedTipo === tipo.key ? '#fff' : tipo.color,
                                        backgroundColor: selectedTipo === tipo.key ? tipo.color : 'transparent',
                                        '&:hover': { backgroundColor: alpha(tipo.color, 0.15) },
                                    } : { fontWeight: 'bold' }}
                                />
                            ))}
                        </Box>
                    </Box>

                    {/* Gráfico de barras — modo "Todos" */}
                    {!selectedTipo && (
                        <ResponsiveContainer width="100%" height={compact ? 400 : 600}>
                            <BarChart data={barData} margin={{ top: 10, right: 30, left: 20, bottom: compact ? 70 : 120 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                                <XAxis dataKey="name" tick={<ColoredTick />} height={compact ? 70 : 120} interval={0} />
                                <YAxis tick={{ fill: theme.palette.text.secondary }} />
                                <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} />
                                <Legend verticalAlign={compact ? 'top' : 'bottom'} wrapperStyle={compact ? { paddingBottom: '10px' } : { paddingTop: '40px' }} />
                                {dataKeys.map((key, idx) => (
                                    <Bar key={key} dataKey={key} name={formatColumnName(key)}
                                        fill={TIPO_COLORS[idx % TIPO_COLORS.length]} radius={[8, 8, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    )}

                    {/* Gráfico de pizza — modo tipo específico */}
                    {selectedTipo && (
                        <ResponsiveContainer width="100%" height={compact ? 300 : 420}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="40%"
                                    labelLine={{ stroke: theme.palette.text.secondary, strokeWidth: 1 }}
                                    label={renderCustomLabel}
                                    outerRadius={compact ? 85 : 110}
                                    dataKey="value"
                                    paddingAngle={2}
                                >
                                    {pieData.map((entry, idx) => (
                                        <Cell key={`cell-${idx}`} fill={getMunicipioColor(entry.name, TIPO_COLORS[idx % TIPO_COLORS.length])} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para vds_incumprimento_01$003 / $006 — pizza com filtro por município (coluna)
 * Estrutura: cada linha = parâmetro/gravidade, cada coluna numérica = município (ou Total)
 */
const Incumprimento003Card = ({ chart, viewMode, index, colorMap, colors: colorsProp }) => {
    const theme = useTheme();

    const { paramCol, municipioCols } = useMemo(() => {
        const cols = chart.columns;
        const paramCol = cols.find(c => c.toLowerCase().includes('param'))
            || cols.find(c => chart.data.some(r => typeof r[c] === 'string' && isNaN(parseFloat(r[c]))));
        const municipioCols = cols.filter(c => c !== paramCol &&
            chart.data.some(r => !isNaN(parseFloat(r[c]))));
        return { paramCol, municipioCols };
    }, [chart]);

    const [selectedCol, setSelectedCol] = useState(() => municipioCols[0] ?? null);

    const pieData = useMemo(() => {
        if (!paramCol || !selectedCol) return [];
        return chart.data
            .map(row => ({
                name: formatLabel(String(row[paramCol] ?? '')),
                value: parseFloat(row[selectedCol]) || 0,
            }))
            .filter(item => item.value > 0);
    }, [chart, paramCol, selectedCol]);

    const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
        if (percent < 0.02) return null;
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 30;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill={theme.palette.text.primary}
                textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
                style={{ fontSize: '13px', fontWeight: '500' }}>
                {`${name}: ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const calculateHeight = () => {
        if (pieData.length <= 4) return 450;
        if (pieData.length <= 6) return 520;
        if (pieData.length <= 8) return 580;
        return 650;
    };

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                            {municipioCols.map(col => {
                                const color = getMunicipioColor(col, theme.palette.primary.main);
                                const isSelected = selectedCol === col;
                                return (
                                    <Chip
                                        key={col}
                                        label={formatColumnName(col)}
                                        size="small"
                                        onClick={() => setSelectedCol(col)}
                                        variant={isSelected ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: color,
                                            color: isSelected ? '#fff' : color,
                                            backgroundColor: isSelected ? color : 'transparent',
                                            '&:hover': { backgroundColor: alpha(color, 0.15) },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={calculateHeight()}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="40%"
                                labelLine={{ stroke: theme.palette.text.secondary, strokeWidth: 1 }}
                                label={renderCustomLabel}
                                outerRadius={110}
                                dataKey="value"
                                paddingAngle={2}
                            >
                                {pieData.map((entry, idx) => {
                                    const palette = colorsProp ?? INCUMPRIMENTO_PALETTE;
                                    const fill = colorMap?.[entry.name] ?? getMunicipioColor(entry.name, palette[idx % palette.length]);
                                    return (
                                        <Cell key={`cell-${idx}`} fill={fill} />
                                    );
                                })}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ marginTop: '-30px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para vds_incumprimento_01$006 — pizza por gravidade com filtro por município (linha)
 * Estrutura: cada linha = município, cada coluna numérica = nível de gravidade
 */
const Incumprimento006Card = ({ chart, viewMode, index }) => {
    const theme = useTheme();

    const { labelCol, gravityCols, municipios } = useMemo(() => {
        const cols = chart.columns;
        const labelCol = identifyLabelColumn(chart.data, cols);
        const gravityCols = cols.filter(c => c !== labelCol &&
            chart.data.some(r => !isNaN(parseFloat(r[c]))));
        const municipios = chart.data
            .map(r => String(r[labelCol] || '').trim())
            .filter(Boolean);
        return { labelCol, gravityCols, municipios };
    }, [chart]);

    const [selectedMunicipio, setSelectedMunicipio] = useState(() => municipios[0] ?? null);

    const pieData = useMemo(() => {
        if (!selectedMunicipio || !gravityCols.length) return [];
        const row = chart.data.find(r => String(r[labelCol] || '').trim() === selectedMunicipio);
        if (!row) return [];
        return gravityCols
            .map(col => ({ name: formatColumnName(col), value: parseFloat(row[col]) || 0 }))
            .filter(item => item.value > 0);
    }, [chart, labelCol, gravityCols, selectedMunicipio]);

    const renderCustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
        if (percent < 0.02) return null;
        const RADIAN = Math.PI / 180;
        const radius = outerRadius + 30;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill={theme.palette.text.primary}
                textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
                style={{ fontSize: '13px', fontWeight: '500' }}>
                {`${name}: ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const calculateHeight = () => {
        if (pieData.length <= 4) return 450;
        if (pieData.length <= 6) return 520;
        return 580;
    };

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>{chart.name}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                            {municipios.map(m => {
                                const color = getMunicipioColor(m, theme.palette.primary.main);
                                const isSelected = selectedMunicipio === m;
                                return (
                                    <Chip
                                        key={m}
                                        label={m}
                                        size="small"
                                        onClick={() => setSelectedMunicipio(m)}
                                        variant={isSelected ? 'filled' : 'outlined'}
                                        sx={{
                                            fontWeight: 'bold',
                                            borderColor: color,
                                            color: isSelected ? '#fff' : color,
                                            backgroundColor: isSelected ? color : 'transparent',
                                            '&:hover': { backgroundColor: alpha(color, 0.15) },
                                        }}
                                    />
                                );
                            })}
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={calculateHeight()}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="40%"
                                labelLine={{ stroke: theme.palette.text.secondary, strokeWidth: 1 }}
                                label={renderCustomLabel}
                                outerRadius={110}
                                dataKey="value"
                                paddingAngle={2}
                            >
                                {pieData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={REPAV_COLORS[idx % REPAV_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ marginTop: '-50px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para vds_pedido_01$001 — barras horizontais
 */
const Pedido001HBarCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();

    const { labelCol, valueCols, chartData } = useMemo(() => {
        const labelCol = identifyLabelColumn(chart.data, chart.columns);
        const valueCols = chart.columns.filter(c => c !== labelCol &&
            chart.data.some(r => !isNaN(parseFloat(r[c]))));
        const chartData = chart.data.map(row => {
            const entry = { name: formatLabel(String(row[labelCol] ?? '')) };
            valueCols.forEach(c => { entry[c] = parseFloat(row[c]) || 0; });
            return entry;
        });
        return { labelCol, valueCols, chartData };
    }, [chart]);

    const height = Math.max(200, chartData.length * 26 + 60);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Typography variant="h6" fontWeight="bold" noWrap>{chart.name}</Typography>
                        <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                    </Box>
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                            barCategoryGap="20%"
                            barSize={14}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis type="number" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} allowDecimals={false} />
                            <YAxis
                                type="category"
                                dataKey="name"
                                width={160}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
                            />
                            <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} />
                            <Legend verticalAlign="top" height={30} wrapperStyle={{ paddingBottom: '6px', fontSize: '12px' }} />
                            {valueCols.map((col, idx) => (
                                <Bar key={col} dataKey={col} name={formatColumnName(col)}
                                    fill={INCUMPRIMENTO_PALETTE[idx % INCUMPRIMENTO_PALETTE.length]}
                                    radius={[0, 4, 4, 0]}
                                    label={{ position: 'right', fill: theme.palette.text.secondary, fontSize: 10 }}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Card para vds_pedido_01$002 — barras horizontais com filtro por ano
 */
const Pedido002HBarCard = ({ chart, viewMode, index }) => {
    const theme = useTheme();

    const { labelCol, yearCols } = useMemo(() => {
        const labelCol = identifyLabelColumn(chart.data, chart.columns);
        const yearCols = chart.columns.filter(c => c !== labelCol &&
            chart.data.some(r => !isNaN(parseFloat(r[c]))));
        return { labelCol, yearCols };
    }, [chart]);

    const [selectedYear, setSelectedYear] = useState(() => yearCols[yearCols.length - 1] ?? null);

    const chartData = useMemo(() => {
        if (!selectedYear) return [];
        return chart.data
            .map(row => ({
                name: formatLabel(String(row[labelCol] ?? '')),
                value: parseFloat(row[selectedYear]) || 0,
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [chart, labelCol, selectedYear]);

    const height = Math.max(200, chartData.length * 26 + 60);

    return (
        <Grid size={{ xs: 12, lg: viewMode === 'overview' ? 6 : 12 }}>
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: 'easeOut', delay: index * 0.12 }}>
                <Paper sx={{ p: 3, height: '100%', border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, transition: 'all 0.3s ease', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' } }}>
                    <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="h6" fontWeight="bold" noWrap>{chart.name}</Typography>
                            <Chip label={`${chart.total} registos`} size="small" variant="outlined" />
                        </Box>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
                            {yearCols.map(year => (
                                <Chip
                                    key={year}
                                    label={formatColumnName(year)}
                                    size="small"
                                    onClick={() => setSelectedYear(year)}
                                    variant={selectedYear === year ? 'filled' : 'outlined'}
                                    color={selectedYear === year ? 'primary' : 'default'}
                                    sx={{ fontWeight: 'bold' }}
                                />
                            ))}
                        </Box>
                    </Box>
                    <ResponsiveContainer width="100%" height={height}>
                        <BarChart
                            data={chartData}
                            layout="vertical"
                            margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                            barCategoryGap="20%"
                            barSize={14}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={alpha(theme.palette.divider, 0.3)} />
                            <XAxis type="number" tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={160} tick={{ fill: theme.palette.text.secondary, fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 8 }} />
                            <Bar dataKey="value" name={selectedYear ? formatColumnName(selectedYear) : ''}
                                fill={INCUMPRIMENTO_PALETTE[0]}
                                radius={[0, 4, 4, 0]}
                                label={{ position: 'right', fill: theme.palette.text.secondary, fontSize: 10 }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </motion.div>
        </Grid>
    );
};

/**
 * Container de gráficos - Renderiza visualizações baseadas nos dados
 */
const ChartContainer = ({ data, viewMode, selectedCategory, compact = false }) => {
    const theme = useTheme();
    const [yearSelections, setYearSelections] = useState({});

    const handleYearSelect = (chartId, yearKey) => {
        setYearSelections(prev => ({
            ...prev,
            [chartId]: yearKey === null ? null : (prev[chartId] === yearKey ? null : yearKey),
        }));
    };

    // Cores para gráficos (geral)
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
                let chartType = determineChartType(viewData);
                // Overrides por viewId
                if (viewId === 'vds_pedido_01$007' || viewId === 'vds_pedido_01$006') chartType = 'bar';
                const cols = viewData.columns || [];

                // Para duration_bar, calcular antecipadamente as colunas de ano
                const yearKeys = chartType === 'duration_bar'
                    ? cols.filter(col => col !== identifyLabelColumn(viewData.data, cols))
                    : undefined;

                charts.push({
                    id: viewId,
                    category,
                    name: viewData.name || viewId,
                    chartType,
                    data: viewData.data,
                    columns: cols,
                    total: viewData.total,
                    yearKeys,
                });
            });
        });

        return charts;
    }, [data]);

    // Mapa de cores global para parâmetros de incumprimento
    // Construído a partir da UNIÃO dos parâmetros dos 3 gráficos → mesma cor para o mesmo parâmetro em todos
    const incumprimentoColorMap = useMemo(() => {
        const allParams = new Set();
        processedCharts.forEach(chart => {
            if (!INCUMPRIMENTO_IDS.has(chart.id)) return;
            const paramCol = (chart.columns || []).find(c => c.toLowerCase().includes('param'));
            if (!paramCol) return;
            chart.data.forEach(r => {
                const v = String(r[paramCol] || '').trim();
                if (v) allParams.add(v);
            });
        });
        const sorted = [...allParams].sort();
        const map = {};
        sorted.forEach((name, idx) => { map[name] = INCUMPRIMENTO_PALETTE[idx % INCUMPRIMENTO_PALETTE.length]; });
        return map;
    }, [processedCharts]);

    // Renderizar gráfico individual
    const renderChart = (chart) => {
        const { id: chartId, chartType, data: chartData, columns } = chart;

        // Limite de registos específico por view
        let dataToProcess = chartData;
        if (chartId === 'vds_pedido_01$016') dataToProcess = chartData.slice(0, 26);
        else if (chartId === 'vds_pedido_01$017') dataToProcess = chartData.slice(0, 30);

        // $010–$015, tramitacao $001 e $007: adaptável ao número real de registos (sem corte)
        const isAdaptive = /^vds_pedido_01\$01[0-5]$/.test(chartId) || chartId === 'vds_tramitacao_01$001' || chartId === 'vds_pedido_01$007' || chartId === 'vds_pedido_01$006';
        const maxItems = isAdaptive ? dataToProcess.length : 20;

        // Preparar dados para o gráfico
        const preparedData = prepareChartData(dataToProcess, columns, chartType, maxItems);

        if (!preparedData || preparedData.length === 0) {
            return (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                        Sem dados para visualizar
                    </Typography>
                </Box>
            );
        }

        // Paleta activa
        const activeColors = chart.category === 'repavimentacoes' || chartId === 'vds_ramal_01$002' || chartId === 'vds_incumprimento_01$007'
            ? REPAV_COLORS
            : chartId === 'vds_pedido_01$005'
                ? ['#1565c0', '#388e3c', '#f57c00']
                : (chartId === 'vds_pedido_01$007' || chartId === 'vds_pedido_01$006')
                    ? ['#e53935', '#00838f', '#f9a825']
                    : /^vds_pedido_01\$00[1-4]$/.test(chartId) || chartId === 'vds_incumprimento_01$003'
                        ? INCUMPRIMENTO_PALETTE
                        : COLORS;

        // Mapa de cores por parâmetro para gráficos de incumprimento (global, partilhado)
        const nameColorMap = INCUMPRIMENTO_IDS.has(chartId) ? incumprimentoColorMap : null;

        // Altura extra do eixo X e margem esquerda para gráficos com labels longas
        const hasLongLabels = /^vds_pedido_01\$01[01]$/.test(chartId);
        const xAxisHeight = hasLongLabels ? 130 : (chartId === 'vds_pedido_01$007' || chartId === 'vds_pedido_01$006') ? 120 : 80;
        const leftMargin = hasLongLabels ? 110 : 20;
        const legendTopOffset = hasLongLabels
            ? (viewMode === 'overview' && chartId === 'vds_pedido_01$010' ? 60 : viewMode === 'overview' && chartId === 'vds_pedido_01$011' ? 60 : 30)
            : chartId === 'vds_ramal_01$001' ? (viewMode === 'overview' ? 110 : 70)
            : (chartId === 'vds_pedido_01$007' || chartId === 'vds_pedido_01$006') ? 70
            : 0;

        // Para $007 colorir os labels do eixo X com a cor do município
        const coloredXAxisTicks = chartId === 'vds_pedido_01$007' || chartId === 'vds_pedido_01$006';
        const barHeightOverride = chartId === 'vds_incumprimento_01$001' ? 420 : null;

        switch (chartType) {
            case 'bar':
                return renderBarChart(preparedData, columns, activeColors, nameColorMap, xAxisHeight, leftMargin, legendTopOffset, coloredXAxisTicks, barHeightOverride);
            case 'duration_bar':
                return <DurationBarChart data={preparedData} />;
            case 'line':
                return renderLineChart(preparedData, columns, activeColors, nameColorMap, viewMode);
            case 'pie':
                return renderPieChart(preparedData, activeColors, nameColorMap);
            case 'area':
                return renderAreaChart(preparedData, columns, activeColors);
            default:
                return renderBarChart(preparedData, columns, activeColors, nameColorMap);
        }
    };

    // Renderizar gráfico de barras
    const renderBarChart = (data, columns, colors = COLORS, nameColorMap = null, xAxisHeight = 80, leftMargin = 20, legendTopOffset = 0, coloredXAxisTicks = false, heightOverride = null) => {
        const containerHeight = heightOverride ?? ((coloredXAxisTicks ? 620 : 420) + xAxisHeight);
        const dataKeys = getDataKeys(data, columns);

        // Tick customizado com cor por município (usado quando coloredXAxisTicks=true)
        const ColoredTick = ({ x, y, payload }) => {
            const tickColor = getMunicipioColor(payload.value, theme.palette.text.secondary);
            return (
                <g transform={`translate(${x},${y})`}>
                    <text
                        x={0} y={0} dy={4}
                        textAnchor="end"
                        fill={tickColor}
                        fontSize={15}
                        fontWeight={600}
                        transform="rotate(-45)"
                    >
                        {payload.value}
                    </text>
                </g>
            );
        };

        return (
            <ResponsiveContainer width="100%" height={containerHeight}>
                <BarChart data={data} margin={{ top: 10, right: 30, left: leftMargin, bottom: xAxisHeight }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis
                        dataKey="name"
                        tick={coloredXAxisTicks ? <ColoredTick /> : { fill: theme.palette.text.secondary, fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={xAxisHeight}
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
                    <Legend wrapperStyle={{ paddingTop: `${legendTopOffset}px` }} />
                    {dataKeys.map((key, index) => (
                        <Bar
                            key={key}
                            dataKey={key}
                            name={formatColumnName(key)}
                            fill={colors[index % colors.length]}
                            radius={[8, 8, 0, 0]}
                        >
                            {nameColorMap && data.map((entry, barIdx) => (
                                <Cell
                                    key={`cell-${barIdx}`}
                                    fill={nameColorMap[entry.name] ?? colors[index % colors.length]}
                                />
                            ))}
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>
        );
    };


    // Renderizar gráfico de linhas
    const renderLineChart = (data, columns, colors = COLORS, nameColorMap = null, vm = null) => {
        const dataKeys = getDataKeys(data, columns);
        const isOv = vm === 'overview';

        return (
            <ResponsiveContainer width="100%" height={isOv ? (compact ? 380 : 420) : 450}>
                <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: compact ? 50 : 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                    <XAxis
                        dataKey="name"
                        tick={{ fill: theme.palette.text.secondary, fontSize: compact ? 9 : 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={compact ? 65 : 70}
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
                        verticalAlign='bottom'
                        height={40}
                        wrapperStyle={{ fontSize: '14px', paddingTop: '6px' }}
                    />
                    {dataKeys.map((key, index) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={formatColumnName(key)}
                            stroke={nameColorMap?.[key] ?? nameColorMap?.[formatColumnName(key)] ?? getMunicipioColor(key, colors[index % colors.length])}
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
    const renderPieChart = (data, colors = COLORS, nameColorMap = null) => {
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
                            <Cell key={`cell-${index}`} fill={nameColorMap?.[entry.name] ?? getMunicipioColor(entry.name, colors[index % colors.length])} />
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
    const renderAreaChart = (data, columns, colors = COLORS) => {
        const dataKeys = getDataKeys(data, columns);

        return (
            <ResponsiveContainer width="100%" height={450}>
                <AreaChart data={data}>
                    <defs>
                        {dataKeys.map((key, index) => {
                            const c = getMunicipioColor(key, colors[index % colors.length]);
                            return (
                                <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={c} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={c} stopOpacity={0} />
                                </linearGradient>
                            );
                        })}
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
                            stroke={getMunicipioColor(key, colors[index % colors.length])}
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
            {processedCharts.map((chart, index) => {
                if (chart.chartType === 'duration_bar') {
                    return <DurationChartCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_pedido_01$005') {
                    return <Pedido005LineCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (['vds_pedido_01$006', 'vds_pedido_01$007', 'vds_pedido_01$008', 'vds_pedido_01$009'].includes(chart.id)) {
                    return <Pedido008FilterCard key={chart.id} chart={chart} viewMode={viewMode} index={index} compact={compact} />;
                }
                if (chart.id === 'vds_tramitacao_01$002') {
                    return <TramitacaoAnoCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_tramitacao_01$003') {
                    return <TramitacaoUserCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_fossa_01$001') {
                    return <FossaEstadoCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_repav_01$001') {
                    return <RepavEstadoCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_fossa_01$002') {
                    return <FossaConcelhoLineCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_fossa_01$003') {
                    return <FossaMesLineCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_ramal_01$003' || chart.id === 'vds_ramal_01$006' || chart.id === 'vds_repav_01$003') {
                    return <RamalMesLineCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_repav_01$004') {
                    return <RamalSemanaLineCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_incumprimento_01$004') {
                    return <FossaConcelhoLineCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_pedido_01$001' || chart.id === 'vds_pedido_01$010') {
                    return <Pedido001HBarCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (['vds_pedido_01$002', 'vds_pedido_01$003', 'vds_pedido_01$004'].includes(chart.id)) {
                    return <Pedido002HBarCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_ramal_01$004') {
                    return <Incumprimento003Card key={chart.id} chart={chart} viewMode={viewMode} index={index} colorMap={null} />;
                }
                if (chart.id === 'vds_incumprimento_01$003' || chart.id === 'vds_incumprimento_01$008') {
                    return <Incumprimento003Card key={chart.id} chart={chart} viewMode={viewMode} index={index} colorMap={incumprimentoColorMap} />;
                }
                if (chart.id === 'vds_incumprimento_01$006' || chart.id === 'vds_incumprimento_01$009') {
                    return <Incumprimento006Card key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                if (chart.id === 'vds_incumprimento_01$005') {
                    return <IncumprimentoLineCard key={chart.id} chart={chart} viewMode={viewMode} index={index} colorMap={incumprimentoColorMap} />;
                }
                if (chart.id === 'vds_fossa_01$004') {
                    return <FossaDurationCard key={chart.id} chart={chart} viewMode={viewMode} index={index} />;
                }
                return (
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
                            <Box sx={{ mb: 2 }}>
                                {/* Título — linha completa */}
                                <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
                                    {chart.name}
                                </Typography>
                                {/* Segunda linha: chips à direita */}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <Chip
                                            label={`${chart.total} registos`}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </Box>
                                </Box>
                            </Box>

                            {/* Gráfico */}
                            {renderChart(chart)}
                        </Paper>
                    </motion.div>
                </Grid>
                );
            })}
        </Grid>
    );
};

// Funções auxiliares

const determineChartType = (viewData) => {
    const { data, columns, name } = viewData;

    if (!data || data.length === 0) return 'bar';

    const nameStr = (name || '').toLowerCase();

    // Duração por passo ou por técnico (inclui "passos fechados") → duration_bar
    if (nameStr.includes('duração') && nameStr.includes('passo')) {
        return 'duration_bar';
    }
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

    const valueColumns = [];

    for (const col of columns) {
        if (col === labelColumn) continue;

        // Varrer TODAS as linhas para não perder colunas com null nas primeiras linhas
        const isNumeric = data.some(row => {
            const value = row[col];
            return typeof value === 'number' || (value !== null && value !== undefined && !isNaN(parseFloat(value)));
        });
        if (isNumeric) valueColumns.push(col);
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
const prepareChartData = (data, columns, chartType, maxItems = 20) => {
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

    // Para duration_bar: incluir TODAS as colunas que não são label, independente de nulos na 1ª linha
    if (chartType === 'duration_bar') {
        const allValueColumns = columns.filter(col => col !== labelColumn);
        return data.map(item => {
            const result = { name: formatLabel(item[labelColumn]) };
            allValueColumns.forEach(col => {
                const raw = item[col];
                result[col] = (raw !== null && raw !== undefined && !isNaN(parseFloat(raw)))
                    ? parseFloat(raw)
                    : null;
            });
            return result;
        });
    }

    // Para outros gráficos (bar, line, area)
    return data.slice(0, maxItems).map(item => {
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