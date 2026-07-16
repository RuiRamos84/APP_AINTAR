import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box, Button, Stack, Chip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  TextField, Switch, FormControlLabel, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocalIcon,
  Delete as DeleteIcon,
  GpsFixed as GpsIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { toast } from 'sonner';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useLocais } from '../hooks/usePontoLocais';
import { RH_COLOR as COLOR } from '../utils/rhUtils';

// ─── Modal Criar/Editar ────────────────────────────────────────────────────────

const LocalModal = ({ open, onClose, initial, onSave, isSaving }) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: { nome: '', descr: '', latitude: '', longitude: '', raio_metros: 200, ativo: true },
  });

  React.useEffect(() => {
    if (open) {
      reset(initial
        ? { nome: initial.nome, descr: initial.descr || '', latitude: initial.latitude, longitude: initial.longitude, raio_metros: initial.raio_metros, ativo: initial.ativo }
        : { nome: '', descr: '', latitude: '', longitude: '', raio_metros: 200, ativo: true }
      );
    }
  }, [open, initial, reset]);

  const handleGps = async () => {
    if (!navigator.geolocation) {
      toast.error('GPS não disponível neste dispositivo');
      return;
    }
    setGpsLoading(true);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          timeout: 15000,
          enableHighAccuracy: true,
        })
      );
      setValue('latitude', pos.coords.latitude.toFixed(6));
      setValue('longitude', pos.coords.longitude.toFixed(6));
      toast.success('Localização obtida com sucesso');
    } catch {
      toast.error('Não foi possível obter a localização GPS');
    } finally {
      setGpsLoading(false);
    }
  };

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

            {/* Preenchimento automático via GPS */}
            <Button
              variant="outlined"
              size="small"
              startIcon={gpsLoading ? <CircularProgress size={16} /> : <GpsIcon />}
              disabled={gpsLoading}
              onClick={handleGps}
              sx={{ alignSelf: 'flex-start' }}
            >
              {gpsLoading ? 'A obter localização…' : 'Usar localização actual'}
            </Button>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller name="latitude" control={control} rules={{ required: true, min: -90, max: 90 }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Latitude *" size="small" fullWidth
                    type="number" inputProps={{ step: 'any', min: -90, max: 90 }} error={!!fieldState.error}
                    helperText={fieldState.error ? 'Latitude inválida (-90 a 90)' : 'Ex: 38.7169'} />
                )}
              />
              <Controller name="longitude" control={control} rules={{ required: true, min: -180, max: 180 }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Longitude *" size="small" fullWidth
                    type="number" inputProps={{ step: 'any', min: -180, max: 180 }} error={!!fieldState.error}
                    helperText={fieldState.error ? 'Longitude inválida (-180 a 180)' : 'Ex: -9.1399'} />
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

// ─── Dialog de confirmação de eliminação ──────────────────────────────────────

const ConfirmDeleteDialog = ({ target, onClose, onConfirm, isDeleting }) => (
  <Dialog open={!!target} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Eliminar local</DialogTitle>
    <DialogContent>
      <DialogContentText>
        Eliminar <strong>{target?.nome}</strong>? Esta acção não pode ser revertida.
      </DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancelar</Button>
      <Button color="error" variant="contained" disabled={isDeleting} onClick={onConfirm}>
        {isDeleting ? 'A eliminar…' : 'Eliminar'}
      </Button>
    </DialogActions>
  </Dialog>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const LocaisPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [toDelete, setToDelete]   = useState(null);

  const { locais, isLoading, isError, refetch, criar, isCriando, editar, isEditando, eliminar, isEliminando } = useLocais();
  const results = useSearch(locais, search);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit   = (row) => { setSelected(row); setModalOpen(true); };

  const handleSave = async (data) => {
    if (selected) await editar({ pk: selected.pk, data });
    else await criar(data);
    setModalOpen(false);
  };

  const handleEliminar = async () => {
    if (!toDelete) return;
    await eliminar(toDelete.pk);
    setToDelete(null);
  };

  const columnVisibilityModel = useMemo(() => isMobile ? {
    descr: false,
    latitude: false,
    longitude: false,
    raio_metros: false,
  } : {}, [isMobile]);

  const columns = useMemo(() => [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 140 },
    { field: 'descr', headerName: 'Descrição', flex: 2, minWidth: 180 },
    {
      field: 'latitude', headerName: 'Latitude', width: 110,
      renderCell: ({ value }) => value ? Number(value).toFixed(6) : '',
    },
    {
      field: 'longitude', headerName: 'Longitude', width: 110,
      renderCell: ({ value }) => value ? Number(value).toFixed(6) : '',
    },
    {
      field: 'raio_metros', headerName: 'Raio (m)', width: 90, type: 'number',
    },
    {
      field: 'total_colaboradores', headerName: 'Colabs', width: 80, type: 'number',
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
      field: '_acoes', headerName: 'Acções', width: 140, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }}>
          <Button size="small" onClick={() => openEdit(row)}>Editar</Button>
          {row.total_colaboradores === 0 && (
            <Button size="small" color="error" startIcon={<DeleteIcon />}
              onClick={() => setToDelete(row)}>
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
        <Stack direction="row" spacing={1} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' }, whiteSpace: 'nowrap' }}>
            Novo Local
          </Button>
        </Stack>
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Define os locais onde os colaboradores devem efetuar o registo de ponto.
        Se um registo GPS for efetuado fora do raio de tolerância, será gerado um alerta para o superior hierárquico.
      </Typography>

      {isError ? (
        <Alert severity="error" sx={{ m: 2 }}
          action={<Button color="inherit" size="small" onClick={refetch}>Tentar novamente</Button>}>
          Erro ao carregar locais.
        </Alert>
      ) : (
        <DataGrid
          rows={results}
          columns={columns}
          loading={isLoading}
          autoHeight
          density="compact"
          pageSizeOptions={[25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
          getRowId={(row) => row.pk}
          columnVisibilityModel={columnVisibilityModel}
          sx={{ border: 0 }}
        />
      )}

      <LocalModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        initial={selected} onSave={handleSave}
        isSaving={isCriando || isEditando}
      />

      <ConfirmDeleteDialog
        target={toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleEliminar}
        isDeleting={isEliminando}
      />
    </ModulePage>
  );
};

export default LocaisPage;
