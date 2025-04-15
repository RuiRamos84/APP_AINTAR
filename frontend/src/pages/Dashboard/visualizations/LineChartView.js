import React from 'react';
import { useTheme } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNumber } from '../utils/formatters';
import { getColorPalette } from '../constants';

/**
 * Visualização de gráfico de linhas
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para o gráfico
 * @param {string} props.viewName - Nome da view
 * @param {number} props.height - Altura do gráfico
 * @returns {React.ReactElement}
 */
const LineChartView = ({ data, viewName, height = 300 }) => {
    const theme = useTheme();
    const COLORS = getColorPalette(theme);

    const isTimeSeriesView = viewName === 'vbr_document_005' || viewName === 'vbr_document_009';

    // Determinar os campos a serem exibidos com base na view
    const getDataFields = () => {
        if (viewName === 'vbr_document_005' || viewName === 'vbr_document_009') {
            return ['val1', 'val4'];
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
            <LineChart
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
                    <Line
                        key={field}
                        type="monotone"
                        dataKey={field}
                        name={getFieldLabel(field)}
                        stroke={COLORS[index % COLORS.length]}
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
};

export default LineChartView;