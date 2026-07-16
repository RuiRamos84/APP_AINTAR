import { useState, useMemo } from 'react';
import {
  Button, Stack, Chip, Typography, Tooltip, Alert,
} from '@mui/material';
import {
  ManageAccounts as GestaoIcon,
  AutoAwesome as InitIcon,
  Edit as EditIcon,
  CheckCircle as OkIcon,
  Warning as WarnIcon,
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import { ptPT } from '@mui/x-data-grid/locales';
import { ModulePage } from '@/shared/components/layout/ModulePage';
import { SearchBar } from '@/shared/components/data';
import { useSearch } from '@/shared/hooks';
import { useGestaoColaboradores, useGestaoActions } from '../hooks/useGestaoColaboradores';
import ColaboradorPerfilModal from '../components/ColaboradorPerfilModal';

import { RH_COLOR as COLOR, fmtDate } from '../utils/rhUtils';

const fmtAnos = (v) => v != null ? `${v} ano${v !== 1 ? 's' : ''}` : '—';

const GestaoColaboradoresPage = () => {
  const currentYear = new Date().getFullYear();
  const [search, setSearch]         = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [selected, setSelected]     = useState(null);

  const { colaboradores, isLoading, isError, refetch } = useGestaoColaboradores();
  const { inicializarAnoTodos, isInicializandoTodos } = useGestaoActions();
  const results = useSearch(colaboradores, search);

  const openPerfil = (row) => { setSelected(row); setModalOpen(true); };

  const handleInitTodos = async () => {
    await inicializarAnoTodos({ ano: currentYear });
  };

  const columns = useMemo(() => [
    {
      field: 'name', headerName: 'Colaborador', flex: 1.5, minWidth: 180,
      renderCell: ({ row }) => (
        <Stack justifyContent="center" sx={{ height: '100%' }}>
          <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
          {row.categoria && (
            <Typography variant="caption" color="text.secondary">{row.categoria}</Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'data_admissao', headerName: 'Admissão', width: 110,
      renderCell: ({ value }) => fmtDate(value),
    },
    {
      field: 'anos_antiguidade', headerName: 'Antiguidade', width: 110,
      renderCell: ({ value }) => fmtAnos(value),
    },
    {
      field: 'equipa_nome', headerName: 'Equipa', width: 180,
      renderCell: ({ value, row }) => value
        ? <span>{value} <Typography component="span" variant="caption" color="text.secondary">({row.equipa_codigo})</Typography></span>
        : <Typography color="text.disabled">—</Typography>,
    },
    {
      field: 'superior_nome', headerName: 'Superior', width: 160,
      renderCell: ({ value }) => value || <Typography color="text.disabled">—</Typography>,
    },
    {
      field: 'dias_ferias_total', headerName: 'Férias', width: 90,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ height: '100%' }}>
          <Chip
            label={`${row.dias_ferias_total ?? 22}d`}
            size="small"
            color={row.config_ano === currentYear ? 'primary' : 'default'}
            variant="outlined"
          />
        </Stack>
      ),
    },
    {
      field: 'dias_ferias_disponiveis', headerName: 'Disponíveis', width: 100,
      renderCell: ({ value }) => (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Chip
            label={`${value ?? 0}d`}
            size="small"
            color={value > 0 ? 'success' : 'warning'}
            variant="filled"
          />
        </Stack>
      ),
    },
    {
      field: 'elegivel_piquete', headerName: 'Piquete', width: 90,
      renderCell: ({ value }) => (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Tooltip title={value ? 'Elegível para piquete' : 'Não elegível'}>
            {value
              ? <OkIcon fontSize="small" color="success" />
              : <WarnIcon fontSize="small" color="disabled" />
            }
          </Tooltip>
        </Stack>
      ),
    },
    {
      field: 'horario_descr', headerName: 'Horário', flex: 1, minWidth: 140,
      renderCell: ({ row }) => row.horario_descr
        ? (
          <Stack justifyContent="center" sx={{ height: '100%' }}>
            <Typography variant="body2">{row.horario_descr}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.jornada_descr} · {row.hora_entrada?.slice(0, 5)}→{row.hora_saida?.slice(0, 5)}
            </Typography>
          </Stack>
        )
        : <Typography variant="caption" color="text.disabled">Sem horário</Typography>,
    },
    {
      field: '_acoes', headerName: 'Acções', width: 100, sortable: false,
      renderCell: ({ row }) => (
        <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
          <Button size="small" startIcon={<EditIcon />} onClick={() => openPerfil(row)}>
            Editar
          </Button>
        </Stack>
      ),
    },
  ], [currentYear]);

  return (
    <ModulePage
      title="Gestão de Colaboradores"
      subtitle="Perfis RH, saldos de férias e configuração de horários"
      icon={GestaoIcon}
      color={COLOR}
      breadcrumbs={[{ label: 'Recursos Humanos' }, { label: 'Gestão de Colaboradores' }]}
      actions={
        <Stack direction="row" spacing={1} alignItems="center">
          <SearchBar searchTerm={search} onSearch={setSearch} />
          <Tooltip title={`Inicializa o saldo de férias de ${currentYear} para todos os colaboradores sem configuração`}>
            <span>
              <Button
                variant="outlined"
                startIcon={<InitIcon />}
                disabled={isInicializandoTodos}
                onClick={handleInitTodos}
                sx={{ borderColor: COLOR, color: COLOR, whiteSpace: 'nowrap' }}
              >
                {isInicializandoTodos ? 'A inicializar…' : `Init Saldos ${currentYear}`}
              </Button>
            </span>
          </Tooltip>
        </Stack>
      }
    >
      {isError ? (
        <Alert severity="error" sx={{ m: 2 }}
          action={<Button color="inherit" size="small" onClick={refetch}>Tentar novamente</Button>}>
          Erro ao carregar colaboradores.
        </Alert>
      ) : (
        <DataGrid
          rows={results}
          columns={columns}
          loading={isLoading}
          autoHeight
          density="comfortable"
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          localeText={ptPT.components.MuiDataGrid.defaultProps.localeText}
          sx={{
            border: 0,
            '& .MuiDataGrid-row:hover': { cursor: 'pointer' },
          }}
          onRowClick={({ row }) => openPerfil(row)}
        />
      )}

      <ColaboradorPerfilModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        colaborador={selected}
      />
    </ModulePage>
  );
};

export default GestaoColaboradoresPage;
