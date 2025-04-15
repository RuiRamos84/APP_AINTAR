import React from 'react';
import { useTheme } from '@mui/material';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../utils/formatters';
import { getColorPalette } from '../constants';
import { prepareRadarChartData } from '../utils/dataProcessors';

/**
 * Visualização de gráfico de radar
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para o gráfico
 * @param {string} props.viewName - Nome da view
 * @param {number} props.height - Altura do gráfico
 * @returns {React.ReactElement}
 */
const RadarChartView = ({ data, viewName, height = 300 }) => {
    const theme = useTheme();
    const COLORS = getColorPalette(theme);

    // Processar dados para o formato adequado para o gráfico de radar
    const radarData = prepareRadarChartData(data);

    // Determinar os campos/métricas a serem exibidos
    const getMetrics = () => {
        if (viewName === 'vbr_document_007') {
            // Para view de técnicos, mostrar quantidade e tempo médio
            return [
                { key: 'val1', name: 'Quantidade', color: COLORS[0] },
                { key: 'val4', name: 'Tempo Médio (h)', color: COLORS[1] }
            ];
        } else {
            // Para outras views, mostrar apenas a quantidade
            return [
                { key: 'val', name: 'Quantidade', color: COLORS[0] }
            ];
        }
    };

    const metrics = getMetrics();

    return (
        <ResponsiveContainer width="100%" height={height}>
            <RadarChart
                outerRadius={height / 3}
                data={radarData}
            >
                <PolarGrid />
                <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 10 }}
                    tickFormatter={value => value.length > 15 ? `${value.substring(0, 12)}...` : value}
                />
                <PolarRadiusAxis />

                {metrics.map((metric) => (
                    <Radar
                        key={metric.key}
                        name={metric.name}
                        dataKey={metric.key}
                        stroke={metric.color}
                        fill={metric.color}
                        fillOpacity={0.6}
                    />
                ))}

                <Tooltip formatter={(value) => formatNumber(value)} />
                <Legend />
            </RadarChart>
        </ResponsiveContainer>
    );
};

export default RadarChartView;