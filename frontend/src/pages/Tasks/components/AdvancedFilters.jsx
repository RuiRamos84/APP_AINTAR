import React, { useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Divider
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import { getSelectStyles, getTextFieldStyles, getDividerStyles } from '../styles/themeHelpers';

/**
 * Componente de filtros avançados para tarefas
 * Permite filtrar por: data, prioridade, cliente, status
 */
const AdvancedFilters = ({ metaData, onFilterChange, isDarkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    priority: '',
    client: '',
    status: ''
  });

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      dateFrom: '',
      dateTo: '',
      priority: '',
      client: '',
      status: ''
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter((value) => value !== '').length;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FilterListIcon />}
        onClick={() => setIsOpen(true)}
        sx={{
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : undefined,
          color: isDarkMode ? 'white' : undefined,
          '&:hover': {
            borderColor: isDarkMode ? 'white' : undefined,
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : undefined
          }
        }}
      >
        Filtros
        {activeFilterCount > 0 && (
          <Chip
            label={activeFilterCount}
            size="small"
            color="primary"
            sx={{ ml: 1, height: 20, minWidth: 20 }}
          />
        )}
      </Button>

      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: {
            width: 350,
            p: 3,
            bgcolor: isDarkMode ? 'background.paper' : undefined
          }
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: isDarkMode ? 'white' : undefined }}>
            Filtros Avançados
          </Typography>
          <IconButton onClick={() => setIsOpen(false)} size="small">
            <CloseIcon sx={{ color: isDarkMode ? 'white' : undefined }} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3, ...getDividerStyles(isDarkMode) }} />

        {/* Filtros */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Data Inicial */}
          <TextField
            label="Data Inicial"
            type="date"
            fullWidth
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={getTextFieldStyles(isDarkMode)}
          />

          {/* Data Final */}
          <TextField
            label="Data Final"
            type="date"
            fullWidth
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={getTextFieldStyles(isDarkMode)}
          />

          {/* Prioridade */}
          <FormControl fullWidth sx={getSelectStyles(isDarkMode)}>
            <InputLabel>Prioridade</InputLabel>
            <Select
              value={filters.priority}
              label="Prioridade"
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <MenuItem value="">
                <em>Todas</em>
              </MenuItem>
              {metaData?.task_priority?.map((priority) => (
                <MenuItem key={priority.pk} value={priority.pk}>
                  {priority.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Cliente */}
          <FormControl fullWidth sx={getSelectStyles(isDarkMode)}>
            <InputLabel>Cliente</InputLabel>
            <Select
              value={filters.client}
              label="Cliente"
              onChange={(e) => handleFilterChange('client', e.target.value)}
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              {metaData?.who?.map((client) => (
                <MenuItem key={client.pk} value={client.pk}>
                  {client.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status */}
          <FormControl fullWidth sx={getSelectStyles(isDarkMode)}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <MenuItem value="">
                <em>Todos</em>
              </MenuItem>
              {metaData?.task_status?.map((status) => (
                <MenuItem key={status.pk} value={status.pk}>
                  {status.value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Botão de Limpar Filtros */}
        <Box sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            color="error"
            fullWidth
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            disabled={activeFilterCount === 0}
            sx={{
              borderColor: isDarkMode ? 'rgba(255, 99, 99, 0.5)' : undefined,
              color: isDarkMode ? 'rgba(255, 99, 99, 1)' : undefined,
              '&:hover': {
                borderColor: isDarkMode ? 'rgba(255, 99, 99, 0.8)' : undefined,
                backgroundColor: isDarkMode ? 'rgba(255, 99, 99, 0.08)' : undefined
              }
            }}
          >
            Limpar Filtros
          </Button>
        </Box>
      </Drawer>
    </>
  );
};

export default AdvancedFilters;
