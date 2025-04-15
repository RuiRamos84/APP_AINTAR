import React from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, IconButton, Fade } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Cabeçalho do Dashboard com seletor de ano e botão de atualização
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.selectedYear - Ano selecionado
 * @param {Array} props.availableYears - Anos disponíveis
 * @param {Function} props.onYearChange - Função chamada ao mudar o ano
 * @param {Function} props.onRefresh - Função chamada ao clicar no botão de atualização
 * @returns {React.ReactElement}
 */
const DashboardHeader = ({ selectedYear, availableYears, onYearChange, onRefresh }) => {
  return (
    <Box
      display="flex"
      flexDirection={{ xs: "column", md: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", md: "center" }}
      mb={3}
    >
      <Fade in={true} timeout={800}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Análise de Desempenho e Estatísticas
          </Typography>
        </Box>
      </Fade>

      <Box
        display="flex"
        alignItems="center"
        mt={{ xs: 2, md: 0 }}
        width={{ xs: "100%", md: "auto" }}
      >
        <FormControl sx={{ minWidth: 120 }} size="small">
          <InputLabel id="year-select-label">Ano</InputLabel>
          <Select
            labelId="year-select-label"
            id="year-select"
            value={selectedYear}
            label="Ano"
            onChange={(e) => onYearChange(e.target.value)}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={onRefresh} sx={{ ml: 1 }}>
          <RefreshIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default DashboardHeader;
