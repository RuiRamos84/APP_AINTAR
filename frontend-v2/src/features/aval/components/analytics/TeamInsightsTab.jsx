import { useMemo } from 'react';
import {
  Box, Grid, Paper, Typography, Chip, Skeleton,
  Avatar, Stack,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
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
          {previous && <Legend />}
          {previous && (
            <Bar dataKey="Anterior" fill="#bbdefb" radius={[4, 4, 0, 0]} name="Anterior" />
          )}
          <Bar dataKey="Atual"    fill="#1976d2" radius={[4, 4, 0, 0]} name="Atual" />
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
    <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
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
const TIER_COLORS = { A: '#4caf50', B: '#ff9800', C: '#ef5350' };
const TIER_DEFS = [
  { id: 'A', label: 'Destaque — ≥ 7,0',       color: TIER_COLORS.A },
  { id: 'B', label: 'Satisfatório — 5,0 a 7,0', color: TIER_COLORS.B },
  { id: 'C', label: 'A Melhorar — < 5,0',     color: TIER_COLORS.C },
];

// Fisher-Yates shuffle — ordem aleatória a cada carregamento
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function assignTiers(users) {
  return users.map((u) => {
    const score = +u.media_global;
    return { ...u, tier: score >= 7.0 ? 'A' : score >= 5.0 ? 'B' : 'C' };
  });
}

function TiersSection({ currentUsers }) {
  const byTier = useMemo(() => {
    const tiered = assignTiers(currentUsers);
    return {
      A: shuffled(tiered.filter((u) => u.tier === 'A')),
      B: tiered.filter((u) => u.tier === 'B'),
      C: tiered.filter((u) => u.tier === 'C'),
    };
  }, [currentUsers]);

  const pieData = TIER_DEFS.map(({ id, label, color }) => ({
    name: label.split(' — ')[0],
    value: byTier[id].length,
    color,
  }));

  return (
    <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
      <Typography variant="subtitle2" mb={2}>Distribuição por Tier</Typography>
      <Grid container spacing={2} alignItems="flex-start">

        {/* Donut chart — 3 tiers */}
        <Grid size={{ xs: 12, sm: 5 }}>
          <Box position="relative" height={210}>
            {/* Total no centro do donut — renderizado antes para ficar atrás do gráfico */}
            <Box sx={{
              position: 'absolute',
              top: '43%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              zIndex: 0,
            }}>
              <Typography variant="h5" fontWeight={700} lineHeight={1}>
                {currentUsers.length}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                total
              </Typography>
            </Box>
            <ResponsiveContainer width="100%" height="100%" style={{ position: 'relative', zIndex: 1 }}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="43%"
                  innerRadius={46}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v, name) => [`${v} pessoa${v !== 1 ? 's' : ''}`, name]} />
                <Legend
                  iconType="circle"
                  iconSize={9}
                  formatter={(value, entry) => `${value} (${entry.payload.value})`}
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Grid>

        {/* Lista de nomes — apenas Tier A */}
        <Grid size={{ xs: 12, sm: 7 }}>
          <Box sx={{
            p: 1.5, borderRadius: 1, bgcolor: '#f1f8e9',
            border: '1px solid', borderColor: `${TIER_COLORS.A}60`,
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                Destaque — ≥ 7,0
              </Typography>
              <Chip
                size="small"
                label={`${byTier.A.length} pessoa${byTier.A.length !== 1 ? 's' : ''}`}
                sx={{ bgcolor: TIER_COLORS.A, color: '#fff', fontSize: 11, height: 20 }}
              />
            </Box>
            {byTier.A.length === 0 ? (
              <Typography variant="caption" color="text.disabled">—</Typography>
            ) : (
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {byTier.A.map((u) => (
                  <Chip
                    key={u.colaborador}
                    avatar={<Avatar sx={{ fontSize: 10 }}>{initials(u.colaborador)}</Avatar>}
                    label={u.colaborador}
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: TIER_COLORS.A, fontSize: 11 }}
                  />
                ))}
              </Box>
            )}
          </Box>
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

  const sortedPeriodPks = useMemo(() => {
    const seen = new Map();
    allUsers.forEach((u) => {
      if (!seen.has(u.period_pk))
        seen.set(u.period_pk, { pk: u.period_pk, year: u.year ?? 0, data: u.periodo_data });
    });
    return [...seen.values()].sort((a, b) => {
      const yearDiff = a.year - b.year;
      if (yearDiff !== 0) return yearDiff;
      const tA = a.data ? new Date(a.data).getTime() : Infinity;
      const tB = b.data ? new Date(b.data).getTime() : Infinity;
      if (tA !== tB) return tA - tB;
      return a.pk - b.pk;
    }).map((p) => p.pk);
  }, [allUsers]);

  const latestPeriodPk   = sortedPeriodPks.at(-1) ?? null;
  const previousPeriodPk = sortedPeriodPks.at(-2) ?? null;

  const currentUsers  = useMemo(() => allUsers.filter((u) => u.period_pk === latestPeriodPk),  [allUsers, latestPeriodPk]);
  const previousUsers = useMemo(() => allUsers.filter((u) => u.period_pk === previousPeriodPk), [allUsers, previousPeriodPk]);

  if (loading) return <Skeleton variant="rectangular" height={500} sx={{ borderRadius: 2 }} />;
  if (!currentUsers.length) return <Typography color="text.secondary">Sem dados disponíveis.</Typography>;

  return (
    <Grid container spacing={3}>
      <Grid size={12}><MediasSection globalData={globalData} /></Grid>
      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}><DispersaoSection currentUsers={currentUsers} /></Grid>
      <Grid size={{ xs: 12, md: 6 }} sx={{ display: 'flex' }}><TiersSection currentUsers={currentUsers} /></Grid>
      <Grid size={12}><EvolucaoColetiva currentUsers={currentUsers} previousUsers={previousUsers} /></Grid>
    </Grid>
  );
}
