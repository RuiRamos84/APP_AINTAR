import React from 'react';
import { useTheme } from '@mui/material';
import { Treemap, ResponsiveContainer } from 'recharts';
import { prepareTreemapData } from '../utils/dataProcessors';
import { getColorPalette } from '../constants';

/**
 * Componente customizado para o conteúdo do TreeMap
 */
const CustomizedContent = ({ x, y, width, height, index, name, value, colors }) => {
  // Verificar se todas as propriedades necessárias existem
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return null;
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: colors[index % colors.length] || '#8884d8',
          stroke: '#fff',
          strokeWidth: 2,
          strokeOpacity: 1,
        }}
      />
      {width > 50 && height > 25 ? (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: 12,
            fontWeight: 'bold',
            fill: '#fff',
            pointerEvents: 'none'
          }}
        >
          {name && name.length > 15 ? `${name.substring(0, 12)}...` : name}: {value || 0}
        </text>
      ) : null}
    </g>
  );
};

/**
 * Visualização de TreeMap
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para o gráfico
 * @param {number} props.height - Altura do gráfico
 * @returns {React.ReactElement}
 */
const TreeMapView = ({ data, height = 300 }) => {
  const theme = useTheme();
  const COLORS = getColorPalette(theme);

  // Preparar dados para o TreeMap
  const treeMapData = prepareTreemapData(data);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap
        data={treeMapData}
        dataKey="value"
        ratio={4 / 3}
        stroke="#fff"
        content={<CustomizedContent colors={COLORS} />}
      />
    </ResponsiveContainer>
  );
};

export default TreeMapView;