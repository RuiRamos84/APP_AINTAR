import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Button, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Switch, FormControlLabel, Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocalIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useLocais } from '../hooks/usePontoLocais';
import { RH_COLOR as COLOR } from '../utils/rhUtils';

// ─── Modal Criar/Editar ────────────────────────────────────────────────────────

const LocalModal = ({ open, onClose, initial, onSave, isSaving }) => {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: { nome: '', descr: '', latitude: '', longitude: '', raio_metros: 200, ativo: true },
  });

  useState(() => {
    if (open) reset(initial
      ? { nome: initial.nome, descr: initial.descr || '', latitude: initial.latitude, longitude: initial.longitude, raio_metros: initial.raio_metros, ativo: initial.ativo }
      : { nome: '', descr: '', latitude: '', longitude: '', raio_metros: 200, ativo: true }
    );
  }, [open, initial]);

  const onSubmit = (data) => onSave({
    ...data,
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    raio_metros: Number(data.raio_metros),
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Editar Local' : 'Novo Local Predefinido'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Controller name="nome" control={control} rules={{ required: true }}
              render={({ field, fieldState }) => (
                <TextField {...field} label="Nome *" size="small" fullWidth error={!!fieldState.error} />
              )}
            />
            <Controller name="descr" control={control}
              render={({ field }) => (
                <TextField {...field} label="Descrição" size="small" fullWidth />
              )}
            />
            <Stack direction="row" spacing={2}>
              <Controller name="latitude" control={control} rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Latitude *" size="small" fullWidth
                    type="number" inputProps={{ step: 'any' }} error={!!fieldState.error}
                    helperText="Ex: 38.7169" />
                )}
              />
              <Controller name="longitude" control={control} rules={{ required: true }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Longitude *" size="small" fullWidth
                    type="number" inputProps={{ step: 'any' }} error={!!fieldState.error}
                    helperText="Ex: -9.1399" />
                )}
              />
            </Stack>
            <Controller name="raio_metros" control={control} rules={{ required: true }}
              render={({ field }) => (
                <TextField {...field} label="Raio de Tolerância (metros)" size="small" fullWidth
                  type="number" inputProps={{ min: 50, max: 5000 }}
                  helperText="Distância máxima permitida. Padrão: 200m" />
              )}
            />
            {initial && (
              <Controller name="ativo" control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={!!field.value} onChange={e => field.onChange(e.target.checked)} />}
                    label="Activo"
                  />
                )}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={isSaving}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}>
            {isSaving ? 'A guardar…' : 'Guardar'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const LocaisPage = () => {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState(null);

  const { locais, isLoading, criar, isCriando, editar, isEditando, eliminar } = useLocais();
  const results = useSearch(locais, search);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit   = (row) => { setSelected(row); setModalOpen(true); };

  const handleSave = async (data) => {
    if (selected) await editar({ pk: selected.pk, data });
    else await criar(data);
    setModalOpen(false);
  };

  const handleEliminar = async (pk) => {
    if (!window.confirm('Eliminar este local? Esta acção não pode ser revertida.')) return;
    await eliminar(pk);
  };

  const columns = useMemo(() => [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 150 },
    { field: 'descr', headerName: 'Descrição', flex: 2, minWidth: 180 },
    {
      field: 'latitude', headerName: 'Latitude', width: 110,
      renderCell: ({ value }) => value?.toFixed(6),
    },
    {
      field: 'longitude', headerName: 'Longitude', width: 110,
      renderCell: ({ value }) => value?.toFixed(6),
    },
    {
      field: 'raio_metros', headerName: 'Raio (m)', width: 90, type: 'number',
    },
    {
      field: 'total_colaboradores', headerName: 'Colaboradores', width: 120, type: 'number',
    },
    {
      field: 'ativo', headerName: 'Estado', width: 90,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip label={value ? 'Activo' : 'Inactivo'} size="small"
            color={value ? 'success' : 'default'} variant="filled" />
        </Box>
      ),
    },
    {
      field: '_acoes', headerName: 'Acções', width: 150, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }}>
          <Button size="small" onClick={() => openEdit(row)}>Editar</Button>
          {row.total_colaboradores === 0 && (
            <Button size="small" color="error" startIcon={<DeleteIcon />}
              onClick={() => handleEliminar(row.pk)}>
              Apagar
            </Button>
          )}
        </Stack>
      ),
    },
  ], []);

  return (
    <ModulePage
      title="Locais Predefinidos"
      subtitle="Geofencing — locais de referência para validação de ponto"
      icon={LocalIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Locais Predefinidos' }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}>
          Novo Local
        </Button>
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Define os locais onde os colaboradores devem efetuar o registo de ponto.
        Se um registo GPS for efetuado fora do raio de tolerância, será gerado um alerta para o superior hierárquico.
      </Typography>

      <Box sx={{ mb: 2 }}>
        <SearchBar searchTerm={search} onSearch={setSearch} placeholder="Pesquisar…" />
      </Box>

      <DataGrid
        rows={results}
        columns={columns}
        loading={isLoading}
        autoHeight
        density="compact"
        pageSizeOptions={[25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />

      <LocalModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        initial={selected} onSave={handleSave}
        isSaving={isCriando || isEditando}
      />
    </ModulePage>
  );
};

export default LocaisPage;
