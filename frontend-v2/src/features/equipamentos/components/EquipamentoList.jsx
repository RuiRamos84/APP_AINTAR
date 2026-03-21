import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Paper, IconButton, Tooltip, Chip, Box, Typography, Skeleton,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Build as BuildIcon } from '@mui/icons-material';
import EquipamentosFilterBar from './EquipamentosFilterBar';

const ESTADO_COLOR = {
  Instalação: 'success',
  Armazém:    'default',
  Reparação:  'warning',
};

const COLUMNS = [
  { id: 'tipo',   label: 'Tipo',                sortable: true  },
  { id: 'marca',  label: 'Marca',               sortable: true  },
  { id: 'modelo', label: 'Modelo',              sortable: true  },
  { id: 'serial', label: 'N.º Série',           sortable: false },
  { id: 'estado', label: 'Estado / Localização', sortable: true  },
];

function descendingComparator(a, b, key) {
  const va = a[key] ?? '';
  const vb = b[key] ?? '';
  return vb < va ? -1 : vb > va ? 1 : 0;
}

export default function EquipamentoList({
  equipamentos = [],
  loading = false,
  onSelect,
  onEdit,
  onDelete,
}) {
  const [order, setOrder]         = useState('asc');
  const [orderBy, setOrderBy]     = useState('marca');
  const [filterEstado, setEstado] = useState('');
  const [filterTipo, setTipo]     = useState('');

  const handleSort = (col) => {
    setOrder(orderBy === col && order === 'asc' ? 'desc' : 'asc');
    setOrderBy(col);
  };

  const filtered = useMemo(() => {
    let rows = equipamentos;
    if (filterEstado) rows = rows.filter((e) => e.estado === filterEstado);
    if (filterTipo)   rows = rows.filter((e) => e.tipo   === filterTipo);
    const dir = order === 'desc' ? 1 : -1;
    return [...rows].sort((a, b) => dir * descendingComparator(a, b, orderBy));
  }, [equipamentos, filterEstado, filterTipo, order, orderBy]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {[...Array(5)].map((_, i) => <Skeleton key={i} height={52} sx={{ mb: 1 }} />)}
      </Box>
    );
  }

  return (
    <Box>
      <EquipamentosFilterBar
        equipamentos={equipamentos}
        filterEstado={filterEstado}
        filterTipo={filterTipo}
        onEstadoChange={setEstado}
        onTipoChange={setTipo}
        totalFiltered={filtered.length}
      />

      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <BuildIcon sx={{ fontSize: 48, opacity: 0.3 }} />
          <Typography variant="body2">Nenhum equipamento encontrado</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell key={col.id} sx={{ fontWeight: 600 }}>
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
                <TableCell align="right" sx={{ fontWeight: 600 }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((eq) => (
                <TableRow
                  key={eq.id}
                  hover
                  onClick={() => onSelect?.(eq)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Chip label={eq.tipo || '—'} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{eq.marca}</TableCell>
                  <TableCell>{eq.modelo}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    {eq.serial || '—'}
                  </TableCell>
                  <TableCell>
                    {eq.estado ? (
                      <Box>
                        <Chip
                          label={eq.estado}
                          size="small"
                          color={ESTADO_COLOR[eq.estado] || 'default'}
                        />
                        {eq.instalacao && (
                          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                            {eq.instalacao}
                            {eq.localizacao && ` · ${eq.localizacao}`}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Chip label="Sem alocação" size="small" variant="outlined" color="error" />
                    )}
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => onEdit(eq)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onDelete && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => onDelete(eq)}>
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
      )}
    </Box>
  );
}
