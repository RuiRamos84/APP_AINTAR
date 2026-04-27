import { useState, useMemo } from 'react';
import { Box, Button, Stack, Chip } from '@mui/material';
import { Add as AddIcon, Schedule as HorariosIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useHorarios } from '../hooks/useHorarios';
import { useRhLookups } from '../hooks/useRhLookups';
import HorarioFormModal from '../components/HorarioFormModal';

const COLOR = '#E11D48';
const fmtDate = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '—';
const fmtTime = (v) => v ? v.slice(0, 5) : '—';

const HorariosPage = () => {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [apenasActivos, setApenasActivos] = useState(true);

  const { horarios, isLoading, criar, isCriando, editar, isEditando } = useHorarios({ activos: apenasActivos });
  const { lookups } = useRhLookups();
  const results = useSearch(horarios, search);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit   = (row) => { setSelected(row); setModalOpen(true); };

  const handleSave = async (data) => {
    if (selected) await editar(data);
    else await criar(data);
    setModalOpen(false);
  };

  const columns = useMemo(() => [
    { field: 'colaborador_nome', headerName: 'Colaborador', flex: 1, minWidth: 160 },
    { field: 'jornada_descr', headerName: 'Jornada', width: 120 },
    { field: 'descr', headerName: 'Descrição', flex: 1, minWidth: 140 },
    {
      field: 'hora_entrada', headerName: 'Entrada', width: 90,
      renderCell: ({ value }) => fmtTime(value),
    },
    {
      field: 'hora_saida', headerName: 'Saída', width: 90,
      renderCell: ({ value }) => fmtTime(value),
    },
    {
      field: 'hora_inicio_almoco', headerName: 'Almoço Início', width: 110,
      renderCell: ({ value }) => fmtTime(value),
    },
    {
      field: 'hora_fim_almoco', headerName: 'Almoço Fim', width: 110,
      renderCell: ({ value }) => fmtTime(value),
    },
    {
      field: 'data_inicio', headerName: 'Início Vigência', width: 120,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: 'activo', headerName: 'Estado', width: 100,
      renderCell: ({ value }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <Chip
            label={value ? 'Activo' : 'Inactivo'}
            size="small"
            color={value ? 'success' : 'default'}
            variant="filled"
          />
        </Box>
      ),
    },
    {
      field: '_acoes', headerName: 'Acções', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
          <Button size="small" onClick={() => openEdit(row)}>Editar</Button>
        </Stack>
      ),
    },
  ], []);

  return (
    <ModulePage
      title="Horários"
      subtitle="Gestão de horários de trabalho por colaborador"
      icon={HorariosIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Horários' }]}
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            variant={apenasActivos ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setApenasActivos(v => !v)}
            sx={apenasActivos ? { bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } } : {}}
          >
            {apenasActivos ? 'Apenas activos' : 'Todos'}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}>
            Novo Horário
          </Button>
        </Stack>
      }
    >
      <Box sx={{ mb: 2 }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Pesquisar…" />
      </Box>

      <DataGrid
        rows={results}
        columns={columns}
        loading={isLoading}
        autoHeight
        density="compact"
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
        localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
        sx={{ border: 0 }}
      />

      <HorarioFormModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSave={handleSave} isSaving={isCriando || isEditando}
        initial={selected} lookups={lookups}
      />
    </ModulePage>
  );
};

export default HorariosPage;
