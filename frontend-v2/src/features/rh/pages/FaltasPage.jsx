import { useState, useMemo } from 'react';
import { Box, Button, Stack } from '@mui/material';
import { Add as AddIcon, HowToReg as WorkflowIcon, EventBusy as FaltasIcon } from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useFaltas } from '../hooks/useFaltas';
import { useRhLookups } from '../hooks/useRhLookups';
import EstadoBadge from '../components/EstadoBadge';
import FaltaFormModal from '../components/FaltaFormModal';
import WorkflowDialog from '../components/WorkflowDialog';

const COLOR = '#E11D48';
const fmtDate = (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

const FaltasPage = () => {
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [wfOpen, setWfOpen]       = useState(false);
  const [selected, setSelected]   = useState(null);
  const [wfTarget, setWfTarget]   = useState(null);

  const { faltas, isLoading, criar, isCriando, editar, isEditando, workflow, isWorkflow } = useFaltas();
  const { lookups } = useRhLookups();
  const results = useSearch(faltas, search);

  const openCreate = () => { setSelected(null); setModalOpen(true); };
  const openEdit   = (row) => { setSelected(row); setModalOpen(true); };
  const openWf     = (row) => { setWfTarget(row); setWfOpen(true); };

  const handleSave = async (data) => {
    if (selected) await editar(data);
    else await criar(data);
    setModalOpen(false);
  };

  const columns = useMemo(() => [
    { field: 'colaborador_nome', headerName: 'Colaborador', flex: 1, minWidth: 160 },
    { field: 'tipo_descr', headerName: 'Tipo de Falta', width: 170 },
    {
      field: 'data', headerName: 'Data', width: 120,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: 'estado_descr', headerName: 'Estado', width: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <EstadoBadge descr={row.estado_descr} cor={row.estado_cor} />
        </Box>
      ),
    },
    {
      field: 'requer_justificativo', headerName: 'Justificativo', width: 110,
      renderCell: ({ value }) => value ? '✓ Req.' : '—',
    },
    { field: 'comunicado_por_nome', headerName: 'Comunicado por', width: 160 },
    { field: 'notas', headerName: 'Notas', flex: 1, minWidth: 120 },
    {
      field: '_acoes', headerName: 'Acções', width: 180, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          {row.ts_estado_fk <= 2 && (
            <Button size="small" onClick={() => openEdit(row)}>Editar</Button>
          )}
          <Button size="small" color="secondary" startIcon={<WorkflowIcon />}
            onClick={() => openWf(row)}>
            Workflow
          </Button>
        </Stack>
      ),
    },
  ], []);

  return (
    <ModulePage
      title="Faltas"
      subtitle="Gestão de faltas e justificações"
      icon={FaltasIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Faltas' }]}
      actions={
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' } }}>
          Registar Falta
        </Button>
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

      <FaltaFormModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSave={handleSave} isSaving={isCriando || isEditando}
        initial={selected} lookups={lookups}
      />

      <WorkflowDialog
        open={wfOpen} onClose={() => setWfOpen(false)}
        refPk={wfTarget?.pk} tipoRef="faltas"
        onConfirm={workflow} isLoading={isWorkflow}
      />
    </ModulePage>
  );
};

export default FaltasPage;
