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
const TIER_LABELS = { A: 'Tier A — Top 20%', B: 'Tier B — Meio 60%', C: 'Tier C — Bottom 20%' };

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

// ── Secção 2: Dispersão ───────────────────────────────────────
function DispersaoSection({ currentUsers }) {
  const sorted = [...currentUsers].sort((a, b) => b.media_global - a.media_global);
  const teamAvg = sorted.length
    ? Math.round(sorted.reduce((s, u) => s + u.media_global, 0) / sorted.length * 10) / 10
    : 0;

  const barData = sorted.map((u, i) => ({
    pos: i + 1,
    score: +u.media_global,
    fill: +u.media_global >= teamAvg ? C.colab : '#ef9a9a',
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle2">Dispersão de Resultados</Typography>
        <Chip size="small" label={`Média equipa: ${teamAvg}`} color="primary" variant="outlined" />
      </Box>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="pos" tick={{ fontSize: 11 }} label={{ value: 'Posição', position: 'insideBottom', offset: -2, fontSize: 11 }} />
          <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => [Number(v).toFixed(1), 'Média global']} labelFormatter={(l) => `Posição ${l}`} />
          <ReferenceLine y={teamAvg} stroke="#1976d2" strokeDasharray="4 4" label={{ value: `Avg ${teamAvg}`, fill: '#1976d2', fontSize: 11 }} />
          <Bar dataKey="score" radius={[3, 3, 0, 0]}>
            {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Typography variant="caption" color="text.secondary" mt={1} display="block">
        Azul = acima da média · Vermelho = abaixo da média · Sem nomes (anonimato)
      </Typography>
    </Paper>
  );
}

// ── Secção 3: Tiers ───────────────────────────────────────────
function TiersSection({ currentUsers }) {
  const tiered  = assignTiers(currentUsers);
  const tierA   = tiered.filter((u) => u.tier === 'A');
  const tierB   = tiered.filter((u) => u.tier === 'B');
  const tierC   = tiered.filter((u) => u.tier === 'C');
  const pieData = [
    { name: 'Tier A', value: tierA.length, color: TIER_COLORS.A },
    { name: 'Tier B', value: tierB.length, color: TIER_COLORS.B },
    { name: 'Tier C', value: tierC.length, color: TIER_COLORS.C },
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" mb={2}>Distribuição por Tier</Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid size={{ xs: 12, sm: 5 }}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Grid>
        <Grid size={{ xs: 12, sm: 7 }}>
          {[{ tier: 'A', list: tierA }, { tier: 'B', list: tierB }, { tier: 'C', list: tierC }].map(({ tier, list }) => (
            <Box key={tier} mb={1.5}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {TIER_LABELS[tier]} ({list.length} pessoa{list.length !== 1 ? 's' : ''})
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
                {list.map((u) => (
                  <Chip
                    key={u.colaborador}
                    size="small"
                    avatar={<Avatar sx={{ bgcolor: TIER_COLORS[tier], fontSize: 10 }}>{initials(u.colaborador)}</Avatar>}
                    label={u.colaborador.split(' ')[0]}
                    variant="outlined"
                    sx={{ borderColor: TIER_COLORS[tier] }}
                  />
                ))}
              </Stack>
            </Box>
          ))}
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
