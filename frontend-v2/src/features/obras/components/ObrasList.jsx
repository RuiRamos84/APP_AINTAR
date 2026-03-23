/**
 * ObrasList — Tabela de obras com ordenação e ações.
 */
import { useState } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TableSortLabel, Paper, IconButton, Tooltip, Chip,
  Typography, Skeleton,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as DoneIcon,
  RadioButtonUnchecked as PendingIcon,
} from '@mui/icons-material';

const formatDate = (d) =>
  d ? new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('pt-PT') : '—';

const formatCurrency = (v) =>
  v != null ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v) : '—';

const COLS = [
  { id: 'nome',           label: 'Nome',             sortable: true  },
  { id: 'tipoObraLabel',  label: 'Tipo',             sortable: true  },
  { id: 'instalacaoNome', label: 'Instalação',       sortable: true  },
  { id: 'associadoNome',  label: 'Associado',        sortable: true  },
  { id: 'dataPrevista',   label: 'Data Prevista',    sortable: true  },
  { id: 'dataInicio',     label: 'Início',           sortable: true  },
  { id: 'dataFim',        label: 'Fim',              sortable: true  },
  { id: 'urgenciaLabel',  label: 'Urgência',         sortable: true  },
  { id: 'estado',         label: 'Estado',           sortable: true  },
  { id: 'valorEstimado',  label: 'Estimado (€)',     sortable: false },
  { id: 'valorAintar',    label: 'AINTAR (€)',       sortable: false },
  { id: 'valorSubsidio',  label: 'Subsídio (€)',     sortable: false },
  { id: 'valorMunicipio', label: 'Município (€)',    sortable: false },
  { id: 'acoes',          label: 'Ações',            sortable: false },
];

function descendingComparator(a, b, orderBy) {
  const av = a[orderBy] ?? '';
  const bv = b[orderBy] ?? '';
  if (bv < av) return -1;
  if (bv > av) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}


export default function ObrasList({ obras, loading, onEdit, onDelete }) {
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('nome');

  const handleSort = (col) => {
    const isAsc = orderBy === col && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(col);
  };

  const sorted = [...obras].sort(getComparator(order, orderBy));

  if (loading) {
    return (
      <Box sx={{ p: 1 }}>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  if (!obras.length) {
    return (
      <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
        <Typography variant="body2">Nenhuma obra encontrada.</Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {COLS.map((col) => (
              <TableCell key={col.id} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                {col.sortable ? (
                  <TableSortLabel
                    active={orderBy === col.id}
                    direction={orderBy === col.id ? order : 'asc'}
                    onClick={() => handleSort(col.id)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((obra) => (
            <TableRow key={obra.id} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>{obra.nome}</Typography>
                {obra.aviso && (
                  <Typography variant="caption" color="warning.main" display="block">
                    ⚠ {obra.aviso}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip label={obra.tipoObraLabel ?? '—'} size="small" variant="outlined" />
              </TableCell>
              <TableCell sx={{ fontSize: '0.8rem' }}>{obra.instalacaoNome ?? '—'}</TableCell>
              <TableCell sx={{ fontSize: '0.8rem' }}>{obra.associadoNome ?? '—'}</TableCell>
              <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {formatDate(obra.dataPrevista)}
              </TableCell>
              <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {formatDate(obra.dataInicio)}
              </TableCell>
              <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {formatDate(obra.dataFim)}
              </TableCell>
              <TableCell>
                {obra.urgenciaLabel
                  ? <Chip label={obra.urgenciaLabel} size="small" color="warning" />
                  : '—'}
              </TableCell>
              <TableCell>
                {obra.estado === 1 ? (
                  <Chip icon={<DoneIcon />} label="Concluído" size="small" color="success" />
                ) : (
                  <Chip icon={<PendingIcon />} label="Por concluir" size="small" color="default" />
                )}
              </TableCell>
              <TableCell sx={{ fontSize: '0.8rem' }}>{formatCurrency(obra.valorEstimado)}</TableCell>
              <TableCell sx={{ fontSize: '0.8rem' }}>{formatCurrency(obra.valorAintar)}</TableCell>
              <TableCell sx={{ fontSize: '0.8rem' }}>{formatCurrency(obra.valorSubsidio)}</TableCell>
              <TableCell sx={{ fontSize: '0.8rem' }}>{formatCurrency(obra.valorMunicipio)}</TableCell>
              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {onEdit && (
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => onEdit(obra)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {onDelete && (
                  <Tooltip title="Eliminar">
                    <IconButton size="small" color="error" onClick={() => onDelete(obra)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
