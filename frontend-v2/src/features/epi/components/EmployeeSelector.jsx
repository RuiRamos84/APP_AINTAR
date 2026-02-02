/**
 * EmployeeSelector - Seletor de colaboradores
 *
 * Apresentação centralizada para seleção de colaborador
 * Usa Autocomplete para combinar pesquisa e seleção num único campo
 */

import { useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Fade,
  Button,
  Autocomplete,
  InputAdornment,
} from '@mui/material';
import { Add, Refresh, Search, Person } from '@mui/icons-material';
import CreateEmployeeDialog from './CreateEmployeeDialog';

const EmployeeSelector = ({ employees = [], onSelect, onRefresh }) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Ordenar funcionários por ID
  const sortedEmployees = [...employees].sort((a, b) => a.pk - b.pk);

  const handleCreateSuccess = async () => {
    setCreateDialogOpen(false);
    if (onRefresh) {
      await onRefresh();
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Box sx={{ minHeight: '40vh', display: 'flex', alignItems: 'center' }}>
        <Fade in timeout={600}>
          <Box sx={{ textAlign: 'center' }}>
            {/* Autocomplete - Pesquisa e Seleção integradas */}
            <Autocomplete
              options={sortedEmployees}
              getOptionLabel={(option) => `${option.pk} - ${option.name}`}
              onChange={(event, value) => {
                if (value) {
                  onSelect(value);
                }
              }}
              filterOptions={(options, { inputValue }) => {
                const search = inputValue.toLowerCase();
                return options.filter(
                  (emp) =>
                    emp.pk?.toString().toLowerCase().includes(search) ||
                    emp.name?.toLowerCase().includes(search)
                );
              }}
              noOptionsText="Nenhum funcionário encontrado"
              sx={{ width: 450 }}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                  <Box
                    component="li"
                    key={key}
                    {...otherProps}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Person fontSize="small" color="action" />
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {option.pk}
                      </Typography>
                    </Box>
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Pesquisar funcionário"
                  placeholder="Digite o nome ou número..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              ListboxProps={{
                style: { maxHeight: 300 },
              }}
            />

            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 2, mb: 3, opacity: 0.8 }}
            >
              Pesquise e seleccione o funcionário para continuar
            </Typography>

            {/* Botões de ação */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Criar Novo Funcionário
              </Button>

              {onRefresh && (
                <Button
                  variant="text"
                  startIcon={<Refresh />}
                  onClick={onRefresh}
                  color="inherit"
                >
                  Atualizar Lista
                </Button>
              )}
            </Box>
          </Box>
        </Fade>
      </Box>

      {/* Dialog de criação de funcionário */}
      <CreateEmployeeDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </Box>
  );
};

export default EmployeeSelector;
