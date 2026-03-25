import { useState, useMemo, useEffect } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Paper,
  Table, TableHead, TableBody, TableRow, TableCell,
  Typography, Chip, Skeleton, Avatar, Grid,
} from '@mui/material';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon  from '@mui/icons-material/TrendingFlat';
import ArrowForwardIcon  from '@mui/icons-material/ArrowForward';

const DIMS = [
  { key: 'colab', label: 'Colaboração',    fieldA: 'cA', fieldB: 'cB', deltaKey: 'dc' },
  { key: 'rel',   label: 'Relacionamento', fieldA: 'rA', fieldB: 'rB', deltaKey: 'dr' },
  { key: 'prof',  label: 'Desempenho',     fieldA: 'pA', fieldB: 'pB', deltaKey: 'dp' },
];

const DIM_COLORS = { colab: '#1976d2', rel: '#ed6c02', prof: '#2e7d32' };

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

// ── Vista pessoal: cards por dimensão ─────────────────────────
function MyComparisonView({ myRow, labelA, labelB }) {
  if (!myRow) {
    return (
      <Typography color="text.secondary">
        Sem dados seus para os períodos selecionados.
      </Typography>
    );
  }

  const dims = [
    { ...DIMS[0], vA: myRow.cA, vB: myRow.cB, delta: myRow.dc },
    { ...DIMS[1], vA: myRow.rA, vB: myRow.rB, delta: myRow.dr },
    { ...DIMS[2], vA: myRow.pA, vB: myRow.pB, delta: myRow.dp },
  ];

  return (
    <Grid container spacing={2}>
      {dims.map(({ key, label, vA, vB, delta }) => (
        <Grid size={{ xs: 12, sm: 4 }} key={key}>
          <Paper
            variant="outlined"
            sx={{ p: 2.5, borderTop: 3, borderTopColor: DIM_COLORS[key] }}
          >
            <Typography variant="subtitle2" mb={2} color="text.secondary">
              {label}
            </Typography>
            <Box display="flex" justifyContent="space-around" alignItems="center">
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary" display="block">
                  {labelA}
                </Typography>
                <Typography variant="h4" fontWeight={700} color={DIM_COLORS[key]}>
                  {vA.toFixed(1)}
                </Typography>
              </Box>
              <Box>
                <DeltaChip value={delta} />
              </Box>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary" display="block">
                  {labelB || '—'}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color={
                    delta > 0
                      ? 'success.main'
                      : delta < 0
                        ? 'error.main'
                        : DIM_COLORS[key]
                  }
                >
                  {vB != null ? vB.toFixed(1) : '—'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

// ── Vista admin: tabela completa com todos os utilizadores ─────
function AllUsersTable({ rows, labelA, labelB }) {
  if (rows.length === 0) {
    return (
      <Typography color="text.secondary">
        Sem dados para os períodos selecionados.
      </Typography>
    );
  }

  return (
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
            {DIMS.map(({ key }) => ([
              <TableCell key={`${key}A`} align="center">
                <Typography variant="caption" color="text.secondary">{labelA}</Typography>
              </TableCell>,
              <TableCell key={`${key}B`} align="center">
                <Typography variant="caption" color="text.secondary">{labelB}</Typography>
              </TableCell>,
              <TableCell key={`${key}d`} align="center">
                <Typography variant="caption" color="text.secondary">Δ</Typography>
              </TableCell>,
            ]))}
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
              <TableCell align="center">{row.cA.toFixed(1)}</TableCell>
              <TableCell align="center">{row.cB?.toFixed(1) ?? '—'}</TableCell>
              <TableCell align="center"><DeltaChip value={row.dc} /></TableCell>
              <TableCell align="center">{row.rA.toFixed(1)}</TableCell>
              <TableCell align="center">{row.rB?.toFixed(1) ?? '—'}</TableCell>
              <TableCell align="center"><DeltaChip value={row.dr} /></TableCell>
              <TableCell align="center">{row.pA.toFixed(1)}</TableCell>
              <TableCell align="center">{row.pB?.toFixed(1) ?? '—'}</TableCell>
              <TableCell align="center"><DeltaChip value={row.dp} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

// ── Componente principal ───────────────────────────────────────
// me (string|null): quando fornecido filtra apenas o utilizador atual
export default function PeriodComparisonTab({ rawData, periods, loading, me = null }) {
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
    const d = (vB, vA) => vB !== null ? Math.round((vB - vA) * 10) / 10 : null;

    return dataA.map((a) => {
      const b  = dataB.find((d) => d.colaborador === a.colaborador);
      const cA = Number(a.media_personal_colab);
      const rA = Number(a.media_personal_rel);
      const pA = Number(a.media_profissional);
      const cB = b ? Number(b.media_personal_colab) : null;
      const rB = b ? Number(b.media_personal_rel)   : null;
      const pB = b ? Number(b.media_profissional)   : null;
      return {
        colaborador: a.colaborador,
        cA, rA, pA, cB, rB, pB,
        dc: d(cB, cA), dr: d(rB, rA), dp: d(pB, pA),
      };
    }).sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }, [rawData, periodA, periodB]);

  const labelA = periods.find((p) => p.pk === periodA)?.label ?? '—';
  const labelB = periods.find((p) => p.pk === periodB)?.label ?? '—';

  if (loading) return <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />;

  if (periods.length < 2) {
    return (
      <Typography color="text.secondary">
        São necessários pelo menos 2 períodos para fazer comparação.
      </Typography>
    );
  }

  const myRow = me ? rows.find((r) => r.colaborador === me) ?? null : null;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1.5} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>De (período anterior)</InputLabel>
          <Select
            value={periodA ?? ''}
            onChange={(e) => setPeriodA(e.target.value)}
            label="De (período anterior)"
          >
            {periods.map((p) => <MenuItem key={p.pk} value={p.pk}>{p.label}</MenuItem>)}
          </Select>
        </FormControl>
        <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary', flexShrink: 0 }} />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Para (período mais recente)</InputLabel>
          <Select
            value={periodB ?? ''}
            onChange={(e) => setPeriodB(e.target.value)}
            label="Para (período mais recente)"
          >
            {periods.map((p) => <MenuItem key={p.pk} value={p.pk}>{p.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>

      {me
        ? <MyComparisonView myRow={myRow} labelA={labelA} labelB={labelB} />
        : <AllUsersTable rows={rows} labelA={labelA} labelB={labelB} />
      }
    </Box>
  );
}
