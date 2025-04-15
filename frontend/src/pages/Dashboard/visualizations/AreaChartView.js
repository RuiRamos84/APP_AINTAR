import React from 'react';
import { useTheme } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../utils/formatters';
import { getColorPalette } from '../constants';

/**
 * Visualização de gráfico de área
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para o gráfico
 * @param {string} props.viewName - Nome da view
 * @param {number} props.height - Altura do gráfico
 * @returns {React.ReactElement}
 */
const AreaChartView = ({ data, viewName, height = 300 }) => {
    const theme = useTheme();
    const COLORS = getColorPalette(theme);

    // Determinar os campos a serem exibidos com base na view
    const getDataFields = () => {
        if (viewName === 'vbr_document_008') {
            return ['val4'];
        } else {
            // Para outras views, mostrar todos os campos de valor disponíveis
            if (data.length > 0) {
                return Object.keys(data[0]).filter(key => key.startsWith('val'));
            }
            return ['val'];
        }
    };

    const dataFields = getDataFields();

    // Determinar os rótulos para cada campo
    const getFieldLabel = (field) => {
        switch (field) {
            case 'val1':
                return 'Quantidade';
            case 'val2':
                return 'Mínimo (horas)';
            case 'val3':
                return 'Máximo (horas)';
            case 'val4':
                return 'Média (horas)';
            default:
                return 'Valor';
        }
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 20, bottom: 70 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="par"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 10 }}
                />
                <YAxis />
                <Tooltip
                    formatter={(value, name) => {
                        if (name === "Quantidade") return formatNumber(value);
                        return value;
                    }}
                />
                <Legend />

                {dataFields.map((field, index) => (
                    <Area
                        key={field}
                        type="monotone"
                        dataKey={field}
                        name={getFieldLabel(field)}
                        stroke={COLORS[index % COLORS.length]}
                        fill={`${COLORS[index % COLORS.length]}80`}  // Add transparency to fill
                        activeDot={{ r: 8 }}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default AreaChartView;