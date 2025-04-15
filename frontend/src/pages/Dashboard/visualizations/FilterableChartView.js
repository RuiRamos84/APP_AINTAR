import React, { useState, useEffect } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, Typography, Grid } from '@mui/material';
import PieChartView from './PieChartView';
import BarChartView from './BarChartView';
import { filterDataByCategory } from '../utils/dataProcessors';

/**
 * Componente de visualização com filtros interativos
 * 
 * @param {Object} props - Propriedades do componente
 * @param {Array} props.data - Dados para o gráfico
 * @param {string} props.viewName - Nome da view
 * @returns {React.ReactElement}
 */
const FilterableChartView = ({ data, viewName }) => {
    const [filteredData, setFilteredData] = useState(data);
    const [filterOptions, setFilterOptions] = useState([]);
    const [selectedFilter, setSelectedFilter] = useState('');
    const [chartType, setChartType] = useState('bar');

    // Determinar a coluna de filtro com base na view
    const filterColumn = viewName === 'vbr_document_003' ? 'par2' : 'par';

    // Extrair opções de filtro dos dados
    useEffect(() => {
        if (data && data.length > 0) {
            // Obter valores únicos para o filtro
            const uniqueValues = [...new Set(data.map(item => item[filterColumn]))];
            setFilterOptions(uniqueValues);

            // Selecionar o primeiro valor como padrão
            if (uniqueValues.length > 0 && !selectedFilter) {
                setSelectedFilter(uniqueValues[0]);
            }

            // Filtrar dados iniciais
            filterData(selectedFilter || uniqueValues[0]);
        }
    }, [data, selectedFilter, filterColumn]);

    // Função para filtrar os dados
    const filterData = (value) => {
        if (value) {
            setFilteredData(filterDataByCategory(data, filterColumn, value));
        } else {
            setFilteredData(data);
        }
    };

    // Handler para mudança de filtro
    const handleFilterChange = (event) => {
        const value = event.target.value;
        setSelectedFilter(value);
        filterData(value);
    };

    // Handler para mudança de tipo de gráfico
    const handleChartTypeChange = (event) => {
        setChartType(event.target.value);
    };

    // Verificar se há dados disponíveis
    if (!data || data.length === 0) {
        return (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="subtitle1" color="text.secondary">
                    Sem dados disponíveis
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                        <InputLabel id={`${viewName}-filter-label`}>Filtrar por {filterColumn === 'par2' ? 'Tipo' : 'Categoria'}</InputLabel>
                        <Select
                            labelId={`${viewName}-filter-label`}
                            value={selectedFilter}
                            label={`Filtrar por ${filterColumn === 'par2' ? 'Tipo' : 'Categoria'}`}
                            onChange={handleFilterChange}
                        >
                            {filterOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                        <InputLabel id={`${viewName}-chart-type-label`}>Tipo de Gráfico</InputLabel>
                        <Select
                            labelId={`${viewName}-chart-type-label`}
                            value={chartType}
                            label="Tipo de Gráfico"
                            onChange={handleChartTypeChange}
                        >
                            <MenuItem value="bar">Gráfico de Barras</MenuItem>
                            <MenuItem value="pie">Gráfico de Pizza</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            <Box sx={{ flex: 1 }}>
                {chartType === 'pie' ? (
                    <PieChartView
                        data={filteredData}
                        viewName={viewName}
                        height={300}
                    />
                ) : (
                    <BarChartView
                        data={filteredData}
                        viewName={viewName}
                        height={300}
                        horizontal={false}
                    />
                )}
            </Box>
        </Box>
    );
};

export default FilterableChartView;