import { useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, Skeleton,
  Avatar, Divider, Stack,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceLine, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── Constantes ────────────────────────────────────────────────
const C = { colab: '#1976d2', rel: '#ed6c02', prof: '#2e7d32' };
const TIER_COLORS = { A: '#FFD700', B: '#9E9E9E', C: '#CD7F32' };

// ── Helpers ───────────────────────────────────────────────────
const initials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');

function trendArrows(delta) {
  if (delta === null) return { label: '—', color: 'text.secondary' };
  if (delta >  1.0) return { label: '↑↑', color: 'success.dark' };
  if (delta >  0)   return { label: '↑',  color: 'success.main' };
  if (delta === 0)  return { label: '→',  color: 'text.secondary' };
  if (delta > -1.0) return { label: '↓',  color: 'warning.main' };
  return              { label: '↓↓', color: 'error.main' };
}

function assignTiers(users) {
  const sorted = [...users].sort((a, b) => b.media_global - a.media_global);
  const n = sorted.length;
  return sorted.map((u, i) => {
    const pct = (i + 1) / n;
    const tier = pct <= 0.20 ? 'A' : pct <= 0.80 ? 'B' : 'C';
    return { ...u, tier };
  });
}

// ── Secção 1: Médias ─────────────────────────────────────────
function MediasSection({ globalData }) {
  const current  = globalData.at(-1);
  const previous = globalData.at(-2);
  if (!current) return null;

  const barData = [
    { metric: 'Colaboração',    Atual: +current.media_personal_colab, Anterior: previous ? +previous.media_personal_colab : null },
    { metric: 'Relacionamento', Atual: +current.media_personal_rel,   Anterior: previous ? +previous.media_personal_rel   : null },
    { metric: 'Desempenho',     Atual: +current.media_profissional,   Anterior: previous ? +previous.media_profissional   : null },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" mb={2}>Médias — {current.periodo}</Typography>
      <Grid container spacing={1} mb={2}>
        {barData.map(({ metric, Atual, Anterior }) => {
          const delta = Anterior !== null ? Math.round((Atual - Anterior) * 10) / 10 : null;
          const { label, color } = trendArrows(delta);
          return (
            <Grid size={{ xs: 4 }} key={metric}>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">{metric}</Typography>
                <Typography variant="h5" fontWeight={700}>{Atual.toFixed(1)}</Typography>
                <Typography variant="body2" color={color} fontWeight={600}>
                  {label}{delta !== null ? ` ${delta > 0 ? '+' : ''}${delta}` : ''}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => v != null ? Number(v).toFixed(1) : '—'} />
          <Legend />
          <Bar dataKey="Atual"    fill="#1976d2" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Anterior" fill="#bbdefb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}

// ── Secção 2: Dispersão (histograma) ──────────────────────────
function DispersaoSection({ currentUsers }) {
  const scores = currentUsers.map((u) => +u.media_global);
  const n = scores.length;
  if (!n) return null;

  const mean   = scores.reduce((s, v) => s + v, 0) / n;
  const stdDev = Math.sqrt(scores.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const minVal = Math.min(...scores);
  const maxVal = Math.max(...scores);

  // 10 bins: [0–1), [1–2), …, [9–10]
  const bins = Array.from({ length: 10 }, (_, i) => ({
    label: i === 9 ? '9–10' : `${i}–${i + 1}`,
    count: scores.filter((s) => (i === 9 ? s >= 9 : s >= i && s < i + 1)).length,
    binStart: i,
  }));

  const binColor = (i) => i < 4 ? '#ef9a9a' : i < 7 ? '#ffcc80' : '#a5d6a7';

  const [alignLabel, alignColor] =
    stdDev < 1.5 ? ['Equipa alinhada',    'success'] :
    stdDev < 2.5 ? ['Dispersão moderada', 'warning'] :
                   ['Equipa polarizada',  'error'  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Typography variant="subtitle2">Distribuição de Resultados</Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">
          <Chip size="small" label={`Média ${mean.toFixed(1)}`} color="primary" variant="outlined" />
          <Chip size="small" label={`σ ${stdDev.toFixed(1)}`} variant="outlined" />
          <Chip size="small" label={alignLabel} color={alignColor} />
        </Stack>
      </Box>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={bins} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v) => [v, 'Colaboradores']}
            labelFormatter={(l) => `Notas ${l}`}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {bins.map((b) => <Cell key={b.label} fill={binColor(b.binStart)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <Typography variant="caption" color="text.secondary" mt={1} display="block">
        Min: {minVal.toFixed(1)} · Máx: {maxVal.toFixed(1)} · {n} colaboradores
        &nbsp;·&nbsp; Vermelho = notas baixas (0–4) · Verde = notas altas (7–10)
      </Typography>
    </Paper>
  );
}

// ── Secção 3: Tiers ───────────────────────────────────────────
const TIER_DEFS = [
  { id: 'A', label: 'Tier A — Top 20%',    bg: '#fffde7' },
  { id: 'B', label: 'Tier B — Meio 60%',   bg: '#f5f5f5' },
  { id: 'C', label: 'Tier C — Bottom 20%', bg: '#fff3e0' },
];

function TiersSection({ currentUsers }) {
  const tiered = assignTiers(currentUsers);
  const byTier = {
    A: tiered.filter((u) => u.tier === 'A'),
    B: tiered.filter((u) => u.tier === 'B'),
    C: tiered.filter((u) => u.tier === 'C'),
  };

  const pieData = TIER_DEFS.map(({ id, label }) => ({
    name: label.split(' — ')[0],
    value: byTier[id].length,
    color: TIER_COLORS[id],
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" mb={2}>Distribuição por Tier</Typography>
      <Grid container spacing={2} alignItems="flex-start">
        <Grid size={{ xs: 12, sm: 5 }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={65}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={false}
              >
                {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, name) => [`${v} pessoa${v !== 1 ? 's' : ''}`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </Grid>

        <Grid size={{ xs: 12, sm: 7 }}>
          <Stack spacing={1}>
            {TIER_DEFS.map(({ id, label, bg }) => {
              const list = byTier[id];
              return (
                <Box
                  key={id}
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: bg,
                    border: '1px solid',
                    borderColor: `${TIER_COLORS[id]}60`,
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                      {label}
                    </Typography>
                    <Chip
                      size="small"
                      label={`${list.length} pessoa${list.length !== 1 ? 's' : ''}`}
                      sx={{
                        bgcolor: TIER_COLORS[id],
                        color: id === 'B' ? 'text.primary' : '#fff',
                        fontSize: 11,
                        height: 20,
                      }}
                    />
                  </Box>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {list.map((u) => (
                      <Chip
                        key={u.colaborador}
                        label={u.colaborador.split(' ')[0]}
                        size="small"
                        variant="outlined"
                        sx={{ borderColor: TIER_COLORS[id], fontSize: 11 }}
                      />
                    ))}
                    {list.length === 0 && (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}

// ── Secção 4: Evolução Coletiva ───────────────────────────────
function EvolucaoColetiva({ currentUsers, previousUsers }) {
  if (!previousUsers.length) return null;

  const rows = currentUsers
    .map((u) => {
      const prev  = previousUsers.find((p) => p.colaborador === u.colaborador);
      const delta = prev ? Math.round((u.media_global - prev.media_global) * 10) / 10 : null;
      return { name: u.colaborador, delta };
    })
    .sort((a, b) => (b.delta ?? -99) - (a.delta ?? -99));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" mb={2}>Evolução Coletiva (vs período anterior)</Typography>
      <Grid container spacing={0.5}>
        {rows.map(({ name, delta }) => {
          const { label, color } = trendArrows(delta);
          return (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={name}>
              <Box display="flex" alignItems="center" gap={1} px={1} py={0.5}
                sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
                <Avatar sx={{ width: 28, height: 28, fontSize: 11, bgcolor: 'primary.main' }}>
                  {initials(name)}
                </Avatar>
                <Typography variant="body2" noWrap sx={{ flex: 1 }}>{name.split(' ')[0]}</Typography>
                <Typography variant="body2" fontWeight={700} color={color}>{label}</Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function TeamInsightsTab({ enriched, loading }) {
  const { global: globalData, users: allUsers } = enriched;

  const latestPeriodPk  = useMemo(() => allUsers.length ? Math.max(...allUsers.map((u) => u.period_pk)) : null, [allUsers]);
  const previousPeriodPk = useMemo(() => {
    const pks = [...new Set(allUsers.map((u) => u.period_pk))].sort((a, b) => a - b);
    return pks.at(-2) ?? null;
  }, [allUsers]);

  const currentUsers  = useMemo(() => allUsers.filter((u) => u.period_pk === latestPeriodPk),  [allUsers, latestPeriodPk]);
  const previousUsers = useMemo(() => allUsers.filter((u) => u.period_pk === previousPeriodPk), [allUsers, previousPeriodPk]);

  if (loading) return <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />;
  if (!currentUsers.length) return <Typography color="text.secondary">Sem dados disponíveis.</Typography>;

  return (
    <Grid container spacing={3}>
      <Grid size={12}><MediasSection globalData={globalData} /></Grid>
      <Grid size={{ xs: 12, md: 6 }}><DispersaoSection currentUsers={currentUsers} /></Grid>
      <Grid size={{ xs: 12, md: 6 }}><TiersSection currentUsers={currentUsers} /></Grid>
      <Grid size={12}><EvolucaoColetiva currentUsers={currentUsers} previousUsers={previousUsers} /></Grid>
    </Grid>
  );
}
