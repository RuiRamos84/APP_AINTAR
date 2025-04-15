import React, { useState } from 'react';
import { useTheme } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { simplifyBarChartData } from '../utils/dataProcessors';
import { formatNumber } from '../utils/formatters';
import { getColorPalette } from '../constants';
import { MenuItem, FormControl, Select, InputLabel, Box, Typography } from '@mui/material';

/**
 * Visualização de gráfico de barras melhorada
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para o gráfico
 * @param {string} props.viewName - Nome da view
 * @param {number} props.height - Altura do gráfico
 * @param {boolean} props.horizontal - Se o gráfico deve ser horizontal
 * @returns {React.ReactElement}
 */
const BarChartView = ({ data, viewName, height = 300, horizontal = false }) => {
  const theme = useTheme();
  const COLORS = getColorPalette(theme);
  const [yearFilter, setYearFilter] = useState('all');

  // Se não tiver dados, mostrar mensagem
  if (!data || data.length === 0) {
    return (
      <Box sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="body2" color="text.secondary" fontStyle="italic">
          Sem dados para exibir
        </Typography>
      </Box>
    );
  }

  // Extrair anos disponíveis para filtrar
  const availableYears = [...new Set(data.map(item => item.year))].sort();

  // Filtrar dados por ano se necessário
  const filteredData = yearFilter === 'all'
    ? data
    : data.filter(item => item.year === yearFilter);

  // Processar dados
  let processedData;

  // Verificar se temos dados de município (par1) ou dados simples (par)
  const hasMunicipio = data.some(item => item.par1 && item.par1.startsWith('Município'));

  if (hasMunicipio) {
    // Para dados de município
    processedData = filteredData.map(item => ({
      ...item,
      par: item.par1 ? item.par1.replace('Município de ', '') : item.par
    }));
  } else {
    // Para outros tipos de dados
    processedData = simplifyBarChartData(filteredData, 12);
  }

  // Verificar se temos múltiplos valores (val1, val2, etc)
  const hasMultipleValues = filteredData.length > 0 &&
    (filteredData[0].val1 !== undefined ||
      filteredData[0].val2 !== undefined);

  // Decidir layout baseado nas props e no tipo de view
  const layout = horizontal || viewName === 'vbr_document_006' ? 'vertical' : 'horizontal';

  // Formatar texto do eixo X para não ficar muito grande
  const formatAxisLabel = (value) => {
    if (!value) return '';

    // Remover prefixo de município
    if (value.startsWith('Município de ')) {
      return value.replace('Município de ', '');
    }

    // Truncar legendas longas
    if (value.length > 15) {
      return `${value.substring(0, 12)}...`;
    }

    return value;
  };

  // Função para formatar tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              <strong>{entry.name}:</strong> {formatNumber(entry.value)}
            </p>
          ))}
          {/* {payload[0].payload.year && (
            <p style={{ margin: 0 }}>
              <strong>Ano:</strong> {payload[0].payload.year}
            </p>
          )} */}
        </div>
      );
    }
    return null;
  };

  // Função para renderizar labels nas barras
  const renderCustomizedLabel = (props) => {
    const { x, y, width, height, value, index } = props;
    const radius = 10;

    if (width < 20) return null; // Não mostrar labels em barras muito estreitas

    return (
      <g>
        <text
          x={x + width / 2}
          y={y + height / 2}
          fill="#fff"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={11}
          fontWeight="bold"
        >
          {formatNumber(value)}
        </text>
      </g>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Filtro de ano se houver múltiplos anos */}
      {availableYears.length > 1 && (
        <FormControl size="small" sx={{ mb: 2, width: 120 }}>
          <InputLabel id="year-filter-label">Ano</InputLabel>
          <Select
            labelId="year-filter-label"
            value={yearFilter}
            label="Ano"
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <MenuItem value="all">Todos</MenuItem>
            {availableYears.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Box sx={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData}
            layout={layout}
            margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            {layout === 'vertical' ? (
              <>
                <XAxis type="number" />
                <YAxis
                  dataKey={hasMunicipio ? 'par' : (viewName === 'vbr_document_003' ? 'par1' : 'par')}
                  type="category"
                  width={150}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatAxisLabel}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={hasMunicipio ? 'par' : (viewName === 'vbr_document_003' ? 'par1' : 'par')}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10 }}
                  tickFormatter={formatAxisLabel}
                  interval={0}
                />
                <YAxis />
              </>
            )}

            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {hasMultipleValues ? (
              <>
                {/* Render multiple value bars if applicable */}
                <Bar
                  dataKey="val1"
                  name="Quantidade"
                  fill={theme.palette.primary.main}
                >
                  <LabelList dataKey="val1" position="center" content={renderCustomizedLabel} />
                </Bar>
                {processedData[0].val4 !== undefined && (
                  <Bar
                    dataKey="val4"
                    name="Tempo Médio (horas)"
                    fill={theme.palette.success.main}
                  />
                )}
              </>
            ) : (
              <Bar
                dataKey="val"
                name="Número de Pedidos"
                fill={theme.palette.primary.main}
              >
                {processedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList dataKey="val" position="center" content={renderCustomizedLabel} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default BarChartView;