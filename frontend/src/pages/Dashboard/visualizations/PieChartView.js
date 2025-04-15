import React from 'react';
import { useTheme } from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Label } from 'recharts';
import { simplifyPieChartData } from '../utils/dataProcessors';
import { formatNumber } from '../utils/formatters';
import { getColorPalette } from '../constants';

/**
 * Visualização de gráfico de pizza melhorada
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para o gráfico
 * @param {string} props.viewName - Nome da view
 * @param {number} props.height - Altura do gráfico
 * @returns {React.ReactElement}
 */
const PieChartView = ({ data, viewName, height = 300 }) => {
  const theme = useTheme();
  const COLORS = getColorPalette(theme);

  // Processar dados para o gráfico e garantir que não seja undefined
  const processedData = data && data.length > 0
    ? simplifyPieChartData(data || [], 7) // Limitamos a 7 itens para melhor legibilidade
    : [];

  // Calcular total para percentuais
  const total = processedData.reduce((sum, item) => sum + (item.val || 0), 0);

  // Verifica se existem dados válidos
  if (!processedData || processedData.length === 0) {
    return (
      <div style={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.palette.text.secondary,
        fontStyle: 'italic'
      }}>
        Sem dados para exibir
      </div>
    );
  }

  // Função para determinar se o texto deve ser em branco ou preto baseado na cor de fundo
  const getTextColor = (color) => {
    // Converter hex para RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Calcular luminosidade - cores mais claras terão textos escuros e vice-versa
    return (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#000000' : '#FFFFFF';
  };

  // Função de label mais segura e legível
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    if (percent < 0.05) return null; // Não mostrar label para fatias muito pequenas

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const fill = getTextColor(COLORS[index % COLORS.length]);

    return (
      <text
        x={x}
        y={y}
        fill={fill}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Função para formatar legendas
  const formatLegend = (value) => {
    if (!value) return '';

    // Para dados de municípios, vamos remover o prefixo "Município de"
    if (value.startsWith('Município de ')) {
      return value.replace('Município de ', '');
    }

    // Truncar legendas longas
    if (value.length > 20) {
      return `${value.substring(0, 18)}...`;
    }

    return value;
  };

  // Renderizar tooltip customizado
  const renderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'white',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{data.par}</p>
          <p style={{ margin: 0 }}>
            <strong>Valor:</strong> {formatNumber(data.val)}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Percentual:</strong> {((data.val / total) * 100).toFixed(1)}%
          </p>
          {/* {data.year && (
            <p style={{ margin: 0 }}>
              <strong>Ano:</strong> {data.year}
            </p>
          )} */}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={processedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={height / 3}
          fill="#8884d8"
          dataKey="val"
          nameKey="par"
          label={renderCustomLabel}
        >
          {processedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
          <Label
            value={`Total: ${formatNumber(total)}`}
            position="center"
            fill={theme.palette.text.primary}
            style={{ fontSize: '18px', fontWeight: 'bold' }}
          />
        </Pie>
        <Tooltip content={renderTooltip} />
        <Legend
          layout="vertical"
          verticalAlign="middle"
          align="right"
          formatter={formatLegend}
          wrapperStyle={{ fontSize: '12px', overflowY: 'auto', maxHeight: height }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartView;