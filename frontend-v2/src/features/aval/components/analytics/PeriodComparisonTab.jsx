import { useState, useMemo, useEffect } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Paper,
  Table, TableHead, TableBody, TableRow, TableCell,
  Typography, Chip, Skeleton, Avatar,
} from '@mui/material';
import TrendingUpIcon   from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const DIMS = [
  { key: 'colab', label: 'Colaboração',    fieldA: 'cA', fieldB: 'cB', deltaKey: 'dc' },
  { key: 'rel',   label: 'Relacionamento', fieldA: 'rA', fieldB: 'rB', deltaKey: 'dr' },
  { key: 'prof',  label: 'Desempenho',     fieldA: 'pA', fieldB: 'pB', deltaKey: 'dp' },
];

const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');

function DeltaChip({ value }) {
  if (value === null || value === undefined)
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  if (value === 0)
    return <Chip size="small" label="0" icon={<TrendingFlatIcon />} variant="outlined" />;
  return (
    <Chip
      size="small"
      variant="outlined"
      color={value > 0 ? 'success' : 'error'}
      icon={value > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
      label={`${value > 0 ? '+' : ''}${value}`}
    />
  );
}

export default function PeriodComparisonTab({ rawData, periods, loading }) {
  const [periodA, setPeriodA] = useState(null);
  const [periodB, setPeriodB] = useState(null);

  useEffect(() => {
    if (periods.length >= 2) {
      setPeriodA(periods.at(-2).pk);
      setPeriodB(periods.at(-1).pk);
    } else if (periods.length === 1) {
      setPeriodA(periods[0].pk);
    }
  }, [periods]);

  const rows = useMemo(() => {
    if (!periodA) return [];
    const dataA = rawData.filter((d) => d.period_pk === periodA);
    const dataB = periodB ? rawData.filter((d) => d.period_pk === periodB) : [];

    return dataA.map((a) => {
      const b  = dataB.find((d) => d.colaborador === a.colaborador);
      const cA = Number(a.media_personal_colab);
      const rA = Number(a.media_personal_rel);
      const pA = Number(a.media_profissional);
      const cB = b ? Number(b.media_personal_colab) : null;
      const rB = b ? Number(b.media_personal_rel)   : null;
      const pB = b ? Number(b.media_profissional)   : null;
      const d  = (vB, vA) => vB !== null ? Math.round((vB - vA) * 10) / 10 : null;
      return {
        colaborador: a.colaborador,
        cA, rA, pA, cB, rB, pB,
        dc: d(cB, cA), dr: d(rB, rA), dp: d(pB, pA),
      };
    }).sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }, [rawData, periodA, periodB]);

  const labelA = periods.find((p) => p.pk === periodA)?.label ?? '—';
  const labelB = periods.find((p) => p.pk === periodB)?.label ?? '—';

  if (loading) return <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />;

  return (
    <Box>
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Período base</InputLabel>
          <Select value={periodA ?? ''} onChange={(e) => setPeriodA(e.target.value)} label="Período base">
            {periods.map((p) => <MenuItem key={p.pk} value={p.pk}>{p.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Período comparação</InputLabel>
          <Select value={periodB ?? ''} onChange={(e) => setPeriodB(e.target.value)} label="Período comparação">
            {periods.map((p) => <MenuItem key={p.pk} value={p.pk}>{p.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {rows.length === 0 ? (
        <Typography color="text.secondary">Sem dados para os períodos selecionados.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell rowSpan={2}><b>Colaborador</b></TableCell>
                {DIMS.map(({ label }) => (
                  <TableCell key={label} align="center" colSpan={3}>
                    <b>{label}</b>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                {DIMS.map(({ key }) => (
                  [
                    <TableCell key={`${key}A`} align="center"><Typography variant="caption" color="text.secondary">{labelA}</Typography></TableCell>,
                    <TableCell key={`${key}B`} align="center"><Typography variant="caption" color="text.secondary">{labelB}</Typography></TableCell>,
                    <TableCell key={`${key}d`} align="center"><Typography variant="caption" color="text.secondary">Δ</Typography></TableCell>,
                  ]
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.colaborador} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'primary.main' }}>
                        {initials(row.colaborador)}
                      </Avatar>
                      <Typography variant="body2">{row.colaborador}</Typography>
                    </Box>
                  </TableCell>
                  {/* Colaboração */}
                  <TableCell align="center">{row.cA.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.cB?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell align="center"><DeltaChip value={row.dc} /></TableCell>
                  {/* Relacionamento */}
                  <TableCell align="center">{row.rA.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.rB?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell align="center"><DeltaChip value={row.dr} /></TableCell>
                  {/* Desempenho */}
                  <TableCell align="center">{row.pA.toFixed(1)}</TableCell>
                  <TableCell align="center">{row.pB?.toFixed(1) ?? '—'}</TableCell>
                  <TableCell align="center"><DeltaChip value={row.dp} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
