import { useState, useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  Add as AddIcon, HowToReg as WorkflowIcon,
  BeachAccess as FeriasIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useFerias } from '../hooks/useFerias';
import { useRhLookups } from '../hooks/useRhLookups';
import EstadoBadge from '../components/EstadoBadge';
import FeriasFormModal from '../components/FeriasFormModal';
import WorkflowDialog from '../components/WorkflowDialog';

import { RH_COLOR as COLOR, fmtDate } from '../utils/rhUtils';

const FeriasPage = () => {
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [wfOpen, setWfOpen]         = useState(false);
  const [selected, setSelected]     = useState(null);
  const [wfTarget, setWfTarget]     = useState(null);

  const { ferias, isLoading, criar, isCriando, editar, isEditando, workflow, isWorkflow } = useFerias();
  const { lookups } = useRhLookups();
  const results = useSearch(ferias, search);

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
    { field: 'tipo_descr', headerName: 'Tipo', width: 170 },
    {
      field: 'data_inicio', headerName: 'Início', width: 110,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: 'data_fim', headerName: 'Fim', width: 110,
      renderCell: ({ value }) => fmtDate(value),
    },
    { field: 'dias_uteis', headerName: 'Dias Úteis', width: 100, type: 'number' },
    {
      field: 'estado_descr', headerName: 'Estado', width: 160,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <EstadoBadge descr={row.estado_descr} cor={row.estado_cor} />
        </Box>
      ),
    },
    { field: 'notas', headerName: 'Notas', flex: 1, minWidth: 120 },
    {
      field: '_acoes', headerName: 'Acções', width: 180, sortable: false,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ height: '100%' }}>
          {row.ts_estado_fk === 1 && (
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
      title="Férias"
      subtitle="Gestão de pedidos de férias e tolerâncias"
      icon={FeriasIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Férias' }]}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ bgcolor: COLOR, '&:hover': { bgcolor: '#be123c' }, whiteSpace: 'nowrap' }}>
            Novo Pedido
          </Button>
        </Stack>
      }
    >
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

      <FeriasFormModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSave={handleSave} isSaving={isCriando || isEditando}
        initial={selected} lookups={lookups}
      />

      <WorkflowDialog
        open={wfOpen} onClose={() => setWfOpen(false)}
        refPk={wfTarget?.pk} tipoRef="férias"
        onConfirm={workflow} isLoading={isWorkflow}
      />
    </ModulePage>
  );
};

export default FeriasPage;
